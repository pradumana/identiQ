"""Institution API endpoints for KYC lookup"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
import secrets

from app.db.database import get_db
from app.db.models import User, KYCApplication, ConsentRecord, Document
from app.core.security import get_current_active_user, require_role
from app.schemas.kyc import KYCApplicationResponse
from pydantic import BaseModel

router = APIRouter()


class UKNLookupRequest(BaseModel):
    ukn: str
    purpose: str  # e.g., "bank_account_opening", "loan_application"


class KYCSummaryResponse(BaseModel):
    ukn: str
    status: str
    verified_name: Optional[str] = None
    verified_age: Optional[int] = None
    verified_address: Optional[str] = None
    risk_score: Optional[float] = None
    verified_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    face_match_score: Optional[float] = None
    blockchain_tx_hash: Optional[str] = None


@router.get("/resolve-kyc/{ukn}", response_model=KYCSummaryResponse)
async def resolve_kyc(
    ukn: str,
    purpose: str,
    current_user: User = Depends(require_role(["institution", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Resolve UKN to get KYC summary
    Institutions use this to verify a user's KYC status
    """
    # Validate UKN format (KYC-XXXX-XXXX-XXXX = 18 chars)
    from app.services.ukn_service import validate_ukn_format
    if not validate_ukn_format(ukn):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid UKN format"
        )
    
    # Find KYC application by UKN
    kyc_app = db.query(KYCApplication).filter(
        KYCApplication.ukn == ukn,
        KYCApplication.status == "VERIFIED"
    ).first()
    
    if not kyc_app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="UKN not found or not verified"
        )
    
    # Check if KYC is expired
    if kyc_app.expires_at and kyc_app.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="KYC has expired"
        )
    
    # Check or create consent record
    consent = db.query(ConsentRecord).filter(
        ConsentRecord.kyc_id == kyc_app.id,
        ConsentRecord.institution_id == current_user.id,
        ConsentRecord.purpose == purpose
    ).first()
    
    if not consent:
        # Create consent record (user consent assumed for now, in production would require explicit consent)
        consent = ConsentRecord(
            kyc_id=kyc_app.id,
            institution_id=current_user.id,
            purpose=purpose,
            consent_given=True,
            accessed_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=30)  # 30-day access token
        )
        db.add(consent)
        db.commit()
    
    # Extract verified data from documents
    verified_name = None
    verified_age = None
    verified_address = None
    
    for doc in kyc_app.documents:
        if doc.doc_type != "SELFIE" and doc.extracted_data:
            data = doc.extracted_data
            if not verified_name and data.get("name"):
                verified_name = data.get("name")
            if not verified_age and data.get("dob"):
                # Calculate age from DOB
                try:
                    dob = datetime.strptime(data.get("dob"), "%Y-%m-%d")
                    age = (datetime.utcnow() - dob).days // 365
                    verified_age = age
                except:
                    pass
            if not verified_address and data.get("address"):
                verified_address = data.get("address")
    
    return KYCSummaryResponse(
        ukn=kyc_app.ukn,
        status=kyc_app.status,
        verified_name=verified_name,
        verified_age=verified_age,
        verified_address=verified_address,
        risk_score=kyc_app.risk_score,
        verified_at=kyc_app.verified_at,
        expires_at=kyc_app.expires_at,
        face_match_score=kyc_app.face_match_score,
        blockchain_tx_hash=kyc_app.blockchain_tx_hash
    )


@router.get("/validate-consent/{ukn}")
async def validate_consent(
    ukn: str,
    purpose: str,
    current_user: User = Depends(require_role(["institution", "admin"])),
    db: Session = Depends(get_db)
):
    """Validate if institution has consent to access KYC data"""
    kyc_app = db.query(KYCApplication).filter(
        KYCApplication.ukn == ukn
    ).first()
    
    if not kyc_app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="UKN not found"
        )
    
    consent = db.query(ConsentRecord).filter(
        ConsentRecord.kyc_id == kyc_app.id,
        ConsentRecord.institution_id == current_user.id,
        ConsentRecord.purpose == purpose,
        ConsentRecord.consent_given == True,
        ConsentRecord.expires_at > datetime.utcnow()
    ).first()
    
    return {
        "has_consent": consent is not None,
        "consent_id": consent.id if consent else None,
        "expires_at": consent.expires_at.isoformat() if consent else None
    }


@router.get("/get-kyc-summary/{ukn}", response_model=KYCSummaryResponse)
async def get_kyc_summary(
    ukn: str,
    current_user: User = Depends(require_role(["institution", "admin"])),
    db: Session = Depends(get_db)
):
    """Get full KYC summary (same as resolve-kyc but with different endpoint name)"""
    return await resolve_kyc(ukn, "general_verification", current_user, db)


@router.post("/request-consent/{ukn}")
async def request_consent(
    ukn: str,
    purpose: str,
    current_user: User = Depends(require_role(["institution", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Institution requests consent from user to access their KYC data
    Returns a consent token that the user can approve
    """
    kyc_app = db.query(KYCApplication).filter(
        KYCApplication.ukn == ukn,
        KYCApplication.status == "VERIFIED"
    ).first()
    
    if not kyc_app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="UKN not found or not verified"
        )
    
    # Check if consent already exists
    existing_consent = db.query(ConsentRecord).filter(
        ConsentRecord.kyc_id == kyc_app.id,
        ConsentRecord.institution_id == current_user.id,
        ConsentRecord.purpose == purpose,
        ConsentRecord.consent_given == True,
        ConsentRecord.expires_at > datetime.utcnow()
    ).first()
    
    if existing_consent:
        return {
            "message": "Consent already granted",
            "consent_id": existing_consent.id,
            "expires_at": existing_consent.expires_at.isoformat()
        }
    
    # Create pending consent request
    consent = ConsentRecord(
        kyc_id=kyc_app.id,
        institution_id=current_user.id,
        purpose=purpose,
        consent_given=False,  # Pending user approval
        expires_at=datetime.utcnow() + timedelta(days=30)
    )
    db.add(consent)
    db.commit()
    db.refresh(consent)
    
    return {
        "message": "Consent request created. Waiting for user approval.",
        "consent_id": consent.id,
        "purpose": purpose,
        "institution_id": current_user.id
    }

