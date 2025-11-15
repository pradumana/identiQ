from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_, or_
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
import hashlib

from app.db.database import get_db
from app.db.models import User, KYCApplication, Document, Verification, AuditRecord, ConsentRecord
from app.schemas.kyc import (
    KYCApplicationResponse, KYCApplicationUpdate, RiskMetrics, AuditRecordResponse
)
from app.core.security import require_role
from app.services.audit_service import audit_service
from app.services.ml_service import ml_service

router = APIRouter()


def generate_tx_hash() -> str:
    """Generate a mock blockchain transaction hash"""
    return f"0x{hashlib.sha256(str(datetime.now()).encode()).hexdigest()[:40]}"


@router.get("/applications", response_model=List[KYCApplicationResponse])
async def get_all_kyc_applications(
    status_filter: str = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_role(["admin", "reviewer"])),
    db: Session = Depends(get_db)
):
    """Get all KYC applications (admin/reviewer only)"""
    query = db.query(KYCApplication)
    
    if status_filter:
        query = query.filter(KYCApplication.status == status_filter)
    
    applications = query.order_by(desc(KYCApplication.created_at)).offset(skip).limit(limit).all()
    
    # Add user emails
    results = []
    for app in applications:
        response = KYCApplicationResponse.from_orm(app)
        if app.user:
            response.user_email = app.user.email
        results.append(response)
    
    return results


@router.get("/applications/review-queue", response_model=List[KYCApplicationResponse])
async def get_review_queue(
    current_user: User = Depends(require_role(["admin", "reviewer"])),
    db: Session = Depends(get_db)
):
    """
    Get KYC applications pending review
    Shows all applications that need manual review:
    - Applications with status IN_REVIEW, PROCESSING, REQUEST_INFO, UPLOADED, REGISTERED, or DRAFT
    - Applications with risk_score >= 0.3 (medium/high risk) OR risk_score is None (not processed yet)
    - Excludes applications with risk_score < 0.3 and status VERIFIED (auto-approved)
    """
    applications = db.query(KYCApplication).filter(
        KYCApplication.status.in_(["IN_REVIEW", "PROCESSING", "REQUEST_INFO", "UPLOADED", "REGISTERED", "DRAFT"]),
        or_(
            KYCApplication.risk_score.is_(None),  # Not processed yet
            KYCApplication.risk_score >= 0.3  # Medium or high risk (>= 30%)
        )
    ).order_by(
        # Order by: created_at DESC (newest first), then by risk_score DESC (high risk first)
        desc(KYCApplication.created_at),
        desc(KYCApplication.risk_score)
    ).all()
    
    # Add user emails and SHAP explanations
    results = []
    for app in applications:
        response = KYCApplicationResponse.from_orm(app)
        if app.user:
            response.user_email = app.user.email
        results.append(response)
    
    return results


@router.get("/applications/{application_id}", response_model=KYCApplicationResponse)
async def get_kyc_application_admin(
    application_id: str,
    current_user: User = Depends(require_role(["admin", "reviewer"])),
    db: Session = Depends(get_db)
):
    """Get KYC application details (admin/reviewer only)"""
    from sqlalchemy.orm import joinedload
    
    kyc_app = db.query(KYCApplication).options(
        joinedload(KYCApplication.documents),
        joinedload(KYCApplication.user)
    ).filter(
        KYCApplication.id == application_id
    ).first()
    
    if not kyc_app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="KYC application not found"
        )
    
    response = KYCApplicationResponse.from_orm(kyc_app)
    if kyc_app.user:
        response.user_email = kyc_app.user.email
    
    # Calculate SHAP explanation if risk score exists
    if kyc_app.risk_score is not None:
        # Recalculate SHAP for display (in production, store in DB)
        try:
            # This is simplified - in production, you'd store the feature values
            # and recalculate or store SHAP values directly
            # For now, we'll return empty SHAP
            pass
        except Exception as e:
            print(f"SHAP calculation error: {e}")
    
    return response


# Request models for approve/reject endpoints
class ApproveRequest(BaseModel):
    comment: Optional[str] = None


class RejectRequest(BaseModel):
    comment: str


@router.post("/applications/{application_id}/approve")
async def approve_kyc_application(
    application_id: str,
    request: Optional[ApproveRequest] = Body(default=None),
    current_user: User = Depends(require_role(["admin", "reviewer"])),
    db: Session = Depends(get_db)
):
    """Approve a KYC application and issue UKN"""
    from app.services.ukn_service import generate_ukn
    from app.services.blockchain_service import blockchain_service
    from datetime import timedelta
    
    comment = request.comment if request else None
    
    kyc_app = db.query(KYCApplication).filter(
        KYCApplication.id == application_id
    ).first()
    
    if not kyc_app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="KYC application not found"
        )
    
    if kyc_app.status not in ["IN_REVIEW", "PROCESSING", "REQUEST_INFO"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve application in status: {kyc_app.status}"
        )
    
    # Generate UKN if not already issued
    if not kyc_app.ukn:
        ukn = generate_ukn()
        # Ensure uniqueness
        while db.query(KYCApplication).filter(KYCApplication.ukn == ukn).first():
            ukn = generate_ukn()
        kyc_app.ukn = ukn
    
    # Update status to VERIFIED (not APPROVED)
    kyc_app.status = "VERIFIED"
    kyc_app.reviewer_comment = comment
    kyc_app.verified_at = datetime.now()
    kyc_app.expires_at = datetime.now() + timedelta(days=365)  # 1 year validity
    kyc_app.updated_at = datetime.now()
    
    # Create blockchain record
    document_hashes = {}
    for doc in kyc_app.documents:
        document_hashes[doc.doc_type] = doc.file_hash
    
    verification_data = {
        "risk_score": kyc_app.risk_score,
        "face_match_score": kyc_app.face_match_score,
        "reviewer_id": current_user.id,
        "verified_at": kyc_app.verified_at.isoformat()
    }
    
    blockchain_record = blockchain_service.create_block(
        ukn=kyc_app.ukn,
        document_hashes=document_hashes,
        face_embedding_hash=kyc_app.face_embedding_hash or "",
        verification_data=verification_data,
        issuer=current_user.id
    )
    
    kyc_app.blockchain_tx_hash = blockchain_record["tx_hash"]
    
    # Create verification record
    verification = Verification(
        kyc_id=kyc_app.id,
        event_type="verification",
        details={
            "reviewer_id": current_user.id,
            "comment": comment,
            "ukn": kyc_app.ukn,
            "blockchain_tx_hash": blockchain_record["tx_hash"]
        },
        performed_by=current_user.id,
        tx_hash=blockchain_record["tx_hash"]
    )
    db.add(verification)
    
    # Log to audit trail
    audit_service.log_event(
        db=db,
        entity_type="kyc_application",
        entity_id=kyc_app.id,
        event_type="verification",
        details={
            "reviewer_id": current_user.id,
            "risk_score": kyc_app.risk_score,
            "ukn": kyc_app.ukn,
            "blockchain_tx_hash": blockchain_record["tx_hash"]
        },
        performed_by=current_user.id,
        tx_hash=blockchain_record["tx_hash"]
    )
    
    db.commit()
    db.refresh(kyc_app)
    
    response = KYCApplicationResponse.from_orm(kyc_app)
    if kyc_app.user:
        response.user_email = kyc_app.user.email
    
    return response


@router.post("/applications/{application_id}/reject")
async def reject_kyc_application(
    application_id: str,
    request: RejectRequest,
    current_user: User = Depends(require_role(["admin", "reviewer"])),
    db: Session = Depends(get_db)
):
    """Reject a KYC application"""
    comment = request.comment
    kyc_app = db.query(KYCApplication).filter(
        KYCApplication.id == application_id
    ).first()
    
    if not kyc_app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="KYC application not found"
        )
    
    if kyc_app.status not in ["IN_REVIEW", "PROCESSING", "REQUEST_INFO"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject application in status: {kyc_app.status}"
        )
    
    kyc_app.status = "REJECTED"
    kyc_app.reviewer_comment = comment or "Application rejected by reviewer"
    kyc_app.updated_at = datetime.now()
    
    # Create verification record
    tx_hash = generate_tx_hash()
    verification = Verification(
        kyc_id=kyc_app.id,
        event_type="rejection",
        details={"reviewer_id": current_user.id, "comment": comment},
        performed_by=current_user.id,
        tx_hash=tx_hash
    )
    db.add(verification)
    
    # Log to audit trail
    audit_service.log_event(
        db=db,
        entity_type="kyc_application",
        entity_id=kyc_app.id,
        event_type="rejection",
        details={"reviewer_id": current_user.id, "reason": comment},
        performed_by=current_user.id,
        tx_hash=tx_hash
    )
    
    db.commit()
    db.refresh(kyc_app)
    
    response = KYCApplicationResponse.from_orm(kyc_app)
    if kyc_app.user:
        response.user_email = kyc_app.user.email
    
    return response


@router.get("/metrics", response_model=RiskMetrics)
async def get_risk_metrics(
    current_user: User = Depends(require_role(["admin", "reviewer"])),
    db: Session = Depends(get_db)
):
    """Get risk metrics for all KYC applications"""
    total_applications = db.query(KYCApplication).count()
    
    # Count auto-approved applications (VERIFIED status with low risk score)
    auto_approved = db.query(KYCApplication).filter(
        KYCApplication.status == "VERIFIED",
        KYCApplication.risk_score.isnot(None),
        KYCApplication.risk_score < 0.3
    ).count()
    
    # Count applications that need manual review
    # Includes: IN_REVIEW, PROCESSING, REQUEST_INFO, UPLOADED
    # Excludes: auto-approved (risk_score < 0.3 and status VERIFIED)
    manual_reviews = db.query(KYCApplication).filter(
        KYCApplication.status.in_(["IN_REVIEW", "PROCESSING", "REQUEST_INFO", "UPLOADED"])
    ).count()
    
    rejected = db.query(KYCApplication).filter(
        KYCApplication.status == "REJECTED"
    ).count()
    
    # Calculate average risk score
    avg_risk_result = db.query(func.avg(KYCApplication.risk_score)).filter(
        KYCApplication.risk_score.isnot(None)
    ).scalar()
    avg_risk_score = float(avg_risk_result) if avg_risk_result else 0.0
    
    # Calculate average processing time (simplified)
    # In production, this would calculate actual time differences
    avg_processing_time = 4.2  # Default value in hours
    
    return RiskMetrics(
        total_applications=total_applications,
        auto_approved=auto_approved,
        manual_reviews=manual_reviews,
        rejected=rejected,
        avg_risk_score=avg_risk_score,
        avg_processing_time=avg_processing_time
    )


@router.get("/audit-trail", response_model=List[AuditRecordResponse])
async def get_audit_trail(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_role(["admin", "reviewer"])),
    db: Session = Depends(get_db)
):
    """Get audit trail records"""
    records = db.query(AuditRecord).order_by(
        desc(AuditRecord.timestamp)
    ).offset(skip).limit(limit).all()
    
    return [AuditRecordResponse.from_orm(record) for record in records]


@router.get("/face-dedupe-queue")
async def get_face_dedupe_queue(
    current_user: User = Depends(require_role(["admin", "reviewer"])),
    db: Session = Depends(get_db)
):
    """Get applications flagged for face deduplication review"""
    # Find applications with potential duplicates (checking reviewer_comment for duplicate mentions)
    applications = db.query(KYCApplication).filter(
        or_(
            KYCApplication.reviewer_comment.contains("duplicate"),
            KYCApplication.reviewer_comment.contains("Duplicate"),
            KYCApplication.face_embedding_hash.isnot(None)
        ),
        KYCApplication.status.in_(["IN_REVIEW", "PROCESSING"])
    ).order_by(desc(KYCApplication.created_at)).all()
    
    results = []
    for app in applications:
        # Check if there are other applications with same face embedding hash
        duplicate_count = db.query(KYCApplication).filter(
            KYCApplication.face_embedding_hash == app.face_embedding_hash,
            KYCApplication.id != app.id,
            KYCApplication.status == "VERIFIED"
        ).count()
        
        existing_ukn = None
        if app.face_embedding_hash:
            existing_app = db.query(KYCApplication).filter(
                KYCApplication.face_embedding_hash == app.face_embedding_hash,
                KYCApplication.id != app.id,
                KYCApplication.status == "VERIFIED",
                KYCApplication.ukn.isnot(None)
            ).first()
            if existing_app:
                existing_ukn = existing_app.ukn
        
        response = KYCApplicationResponse.from_orm(app)
        if app.user:
            response.user_email = app.user.email
        
        results.append({
            **response.dict(),
            "duplicate_count": duplicate_count,
            "existing_ukn": existing_ukn,
            "face_embedding_hash": app.face_embedding_hash
        })
    
    return results


@router.get("/blockchain-records")
async def get_blockchain_records(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_role(["admin", "reviewer"])),
    db: Session = Depends(get_db)
):
    """Get all blockchain records (verified KYC applications with blockchain tx hashes)"""
    from app.services.blockchain_service import blockchain_service
    
    applications = db.query(KYCApplication).filter(
        KYCApplication.status == "VERIFIED",
        KYCApplication.blockchain_tx_hash.isnot(None),
        KYCApplication.ukn.isnot(None)
    ).order_by(desc(KYCApplication.verified_at)).offset(skip).limit(limit).all()
    
    results = []
    for app in applications:
        # Get blockchain block data
        block_data = None
        if app.ukn:
            block_data = blockchain_service.get_ukn_record(app.ukn)
        # If not found by UKN, try by tx_hash
        if not block_data and app.blockchain_tx_hash:
            block_data = blockchain_service.verify_record(app.blockchain_tx_hash)
        
        response = KYCApplicationResponse.from_orm(app)
        if app.user:
            response.user_email = app.user.email
        
        results.append({
            **response.dict(),
            "blockchain_block": block_data
        })
    
    return results


@router.get("/blockchain-records/{ukn}")
async def get_blockchain_record_by_ukn(
    ukn: str,
    current_user: User = Depends(require_role(["admin", "reviewer"])),
    db: Session = Depends(get_db)
):
    """Get blockchain record for a specific UKN"""
    from app.services.blockchain_service import blockchain_service
    
    kyc_app = db.query(KYCApplication).filter(
        KYCApplication.ukn == ukn,
        KYCApplication.status == "VERIFIED"
    ).first()
    
    if not kyc_app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="UKN not found or not verified"
        )
    
    block_data = blockchain_service.get_ukn_record(ukn)
    # If not found by UKN, try by tx_hash if available
    if not block_data and kyc_app.blockchain_tx_hash:
        block_data = blockchain_service.verify_record(kyc_app.blockchain_tx_hash)
    
    return {
        "ukn": ukn,
        "kyc_id": kyc_app.id,
        "user_email": kyc_app.user.email if kyc_app.user else None,
        "verified_at": kyc_app.verified_at.isoformat() if kyc_app.verified_at else None,
        "blockchain_tx_hash": kyc_app.blockchain_tx_hash,
        "blockchain_block": block_data
    }


@router.post("/users")
async def create_user(
    user_data: dict,
    current_user: User = Depends(require_role(["admin"])),  # Only admin can create users
    db: Session = Depends(get_db)
):
    """
    Create a new user (admin only)
    Admin can create reviewers, institutions, or other admins
    """
    from pydantic import BaseModel
    
    class CreateUserRequest(BaseModel):
        email: str
        password: str
        role: str
    
    try:
        request = CreateUserRequest(**user_data)
        email = request.email
        password = request.password
        role = request.role
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request data: {str(e)}"
        )
    from app.core.security import get_password_hash
    
    # Validate role
    valid_roles = ["user", "reviewer", "admin", "institution"]
    if role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
        )
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate password
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )
    
    # Create new user
    hashed_password = get_password_hash(password)
    new_user = User(
        email=email,
        hashed_password=hashed_password,
        role=role
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Log to audit trail
    audit_service.log_event(
        db=db,
        entity_type="user",
        entity_id=new_user.id,
        event_type="user_created",
        details={
            "email": email,
            "role": role,
            "created_by": current_user.id
        },
        performed_by=current_user.id,
        tx_hash=None
    )
    
    from app.schemas.auth import UserResponse
    return UserResponse.from_orm(new_user)


@router.get("/users")
async def list_users(
    role_filter: str = None,
    current_user: User = Depends(require_role(["admin"])),  # Only admin can list users
    db: Session = Depends(get_db)
):
    """List all users (admin only)"""
    query = db.query(User)
    
    if role_filter:
        query = query.filter(User.role == role_filter)
    
    users = query.order_by(User.created_at.desc()).all()
    
    from app.schemas.auth import UserResponse
    return [UserResponse.from_orm(user) for user in users]


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_role(["admin"])),  # Only admin can delete users
    db: Session = Depends(get_db)
):
    """Delete a user (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent deleting yourself
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    # Log to audit trail before deletion
    audit_service.log_event(
        db=db,
        entity_type="user",
        entity_id=user.id,
        event_type="user_deleted",
        details={
            "email": user.email,
            "role": user.role,
            "deleted_by": current_user.id
        },
        performed_by=current_user.id,
        tx_hash=None
    )
    
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"}

