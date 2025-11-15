from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime
import hashlib
import os

from app.db.database import get_db
from app.db.models import User, KYCApplication, Document, Verification
from app.schemas.kyc import (
    KYCApplicationResponse, DocumentResponse, VerificationResponse,
    KYCApplicationCreate, KYCApplicationUpdate
)
from app.core.security import get_current_active_user
from app.services.document_service import document_service
from app.services.ml_service import ml_service
from app.services.audit_service import audit_service
from app.services.face_dedupe_service import face_dedupe_service
from app.services.liveness_service import liveness_service
from app.services.transaction_analysis_service import transaction_analysis_service
from app.services.validation_service import validation_service

router = APIRouter()


def generate_tx_hash() -> str:
    """Generate a mock blockchain transaction hash"""
    return f"0x{hashlib.sha256(str(datetime.now()).encode()).hexdigest()[:40]}"


@router.post("/applications", response_model=KYCApplicationResponse)
async def create_kyc_application(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new KYC application for the current user"""
    # Check if user already has an application
    existing_app = db.query(KYCApplication).filter(
        KYCApplication.user_id == current_user.id,
        KYCApplication.status.in_(["DRAFT", "UPLOADED", "PROCESSING", "IN_REVIEW"])
    ).first()
    
    if existing_app:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active KYC application"
        )
    
    # Create new application
    kyc_app = KYCApplication(
        user_id=current_user.id,
        status="REGISTERED"  # User has registered for KYC
    )
    
    db.add(kyc_app)
    db.commit()
    db.refresh(kyc_app)
    
    return KYCApplicationResponse.from_orm(kyc_app)


@router.get("/applications/me", response_model=KYCApplicationResponse)
async def get_my_kyc_application(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current user's KYC application"""
    kyc_app = db.query(KYCApplication).filter(
        KYCApplication.user_id == current_user.id
    ).order_by(desc(KYCApplication.created_at)).first()
    
    if not kyc_app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No KYC application found"
        )
    
    # Add user email
    kyc_response = KYCApplicationResponse.from_orm(kyc_app)
    kyc_response.user_email = current_user.email
    
    return kyc_response


@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    doc_type: str = Form(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload a document for KYC verification"""
    # Validate file type (images or videos for selfie)
    is_video = file.content_type.startswith('video/')
    is_image = file.content_type.startswith('image/')
    
    if not (is_image or is_video):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image or video files are supported"
        )
    
    # For selfie, video is preferred for liveness detection
    if doc_type == "SELFIE" and not is_video:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selfie must be uploaded as a video file for liveness detection"
        )
    
    # Validate document type
    valid_types = [
        "PASSPORT", 
        "DRIVERS_LICENSE", 
        "DRIVING_LICENSE",  # Alternative name
        "NATIONAL_ID", 
        "AADHAAR",
        "AADHAR",  # Alternative spelling
        "PAN_CARD",
        "UTILITY_BILL",
        "BANK_STATEMENT",
        "MARRIAGE_CERTIFICATE",
        "INCOME_PROOF",
        "EDUCATION_PROOF",
        "MEDICAL_CERTIFICATE",
        "ADDRESS_PROOF",
        "IDENTITY_DOC",  # Generic identity document
        "SELFIE"
    ]
    if doc_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid document type. Must be one of: {', '.join(valid_types)}"
        )
    
    # Get or create KYC application
    kyc_app = db.query(KYCApplication).filter(
        KYCApplication.user_id == current_user.id
    ).order_by(desc(KYCApplication.created_at)).first()
    
    if not kyc_app:
        kyc_app = KYCApplication(user_id=current_user.id, status="REGISTERED")
        db.add(kyc_app)
        db.commit()
        db.refresh(kyc_app)
    
    # Read file content
    file_content = await file.read()
    
    # Determine file extension
    file_ext = ".mp4" if is_video else ".jpg"
    filename = f"{doc_type.lower()}_{datetime.now().timestamp()}{file_ext}"
    file_path, file_hash = document_service.save_uploaded_file(
        file_content, filename, kyc_app.id
    )
    
    # Extract data from document (OCR)
    extracted_data = {}
    liveness_result = None
    transaction_analysis = None
    
    if doc_type == "SELFIE":
        # For selfie video, perform liveness detection and auto-capture
        if is_video:
            abs_path = file_path.lstrip('/')
            if not os.path.exists(abs_path):
                abs_path = os.path.join("uploads", kyc_app.id, filename)
            
            # Detect liveness from video
            liveness_result = liveness_service.detect_liveness_from_video(abs_path)
            
            # Auto-capture photo on blink
            captured_image_path = liveness_service.auto_capture_on_blink(abs_path)
            if captured_image_path:
                # Update file_path to use captured image
                file_path = captured_image_path
                extracted_data['liveness_detected'] = liveness_result.get('is_live', False)
                extracted_data['blink_count'] = liveness_result.get('blink_count', 0)
                extracted_data['liveness_confidence'] = liveness_result.get('confidence', 0.0)
            else:
                # If auto-capture failed, still record liveness result
                extracted_data['liveness_detected'] = liveness_result.get('is_live', False)
                extracted_data['blink_count'] = liveness_result.get('blink_count', 0)
                extracted_data['liveness_confidence'] = liveness_result.get('confidence', 0.0)
                extracted_data['liveness_error'] = 'Could not auto-capture image'
        else:
            # For image selfie, check for blink in single image
            abs_path = file_path.lstrip('/')
            if not os.path.exists(abs_path):
                abs_path = os.path.join("uploads", kyc_app.id, filename)
            
            blink_result = liveness_service.detect_eye_blink(abs_path)
            extracted_data['liveness_detected'] = blink_result.get('blink_detected', False)
            extracted_data['eye_aspect_ratio'] = blink_result.get('eye_aspect_ratio', 0.0)
            extracted_data['liveness_confidence'] = blink_result.get('confidence', 0.0)
    else:
        # For non-selfie documents, perform OCR
        abs_path = file_path.lstrip('/')
        if not os.path.exists(abs_path):
            abs_path = os.path.join("uploads", kyc_app.id, filename)
        
        extracted_data = document_service.extract_text_from_image(abs_path)
        
        # For transactional documents, analyze for malicious intent
        if doc_type in ["BANK_STATEMENT", "UTILITY_BILL"]:
            extracted_text = extracted_data.get('raw_text', '') or str(extracted_data)
            transaction_analysis = transaction_analysis_service.analyze_transaction_document(
                extracted_text=extracted_text,
                document_type=doc_type
            )
            extracted_data['transaction_analysis'] = transaction_analysis
    
    # Validate document immediately if it's an identity document and user details exist
    validation_result = None
    validation_errors = []
    is_valid = True
    
    if doc_type != "SELFIE" and kyc_app.user_details:
        # This is an identity document, validate against user-entered details
        is_valid, validation_errors = validation_service.validate_user_details(
            user_details=kyc_app.user_details,
            extracted_data=extracted_data,
            doc_type=doc_type
        )
        
        validation_result = {
            "is_valid": is_valid,
            "errors": validation_errors,
            "extracted_name": extracted_data.get("name", ""),
            "extracted_dob": extracted_data.get("dob", ""),
            "user_name": kyc_app.user_details.get("name", ""),
            "user_dob": kyc_app.user_details.get("date_of_birth", "")
        }
        
        # If validation fails, mark document as not verified
        if not is_valid:
            # Don't reject immediately, but flag it for review
            # User can still upload, but reviewer will see the mismatch
            pass
    
    # Create document record
    document = Document(
        kyc_id=kyc_app.id,
        doc_type=doc_type,
        file_path=file_path,
        file_hash=file_hash,
        extracted_data=extracted_data,
        verified=is_valid  # Mark as verified only if validation passes
    )
    
    db.add(document)
    
    # Update application status
    if kyc_app.status in ["REGISTERED", "DRAFT"]:
        kyc_app.status = "UPLOADED"
    
    # If validation failed, mark application for review
    if not is_valid:
        kyc_app.status = "IN_REVIEW"
    
    # Create verification record
    tx_hash = generate_tx_hash()
    verification_details = {
        "doc_type": doc_type,
        "filename": filename,
        "is_video": is_video
    }
    
    # Add validation result if available
    if validation_result:
        verification_details['validation'] = validation_result
    
    # Add liveness result if available
    if liveness_result:
        verification_details['liveness'] = liveness_result
    
    # Add transaction analysis if available
    if transaction_analysis:
        verification_details['transaction_analysis'] = transaction_analysis
    
    verification = Verification(
        kyc_id=kyc_app.id,
        event_type="document_upload",
        details=verification_details,
        performed_by=current_user.id,
        tx_hash=tx_hash
    )
    
    db.add(verification)
    
    # If transaction analysis shows suspicious activity, flag the application
    if transaction_analysis and transaction_analysis.get('is_suspicious'):
        kyc_app.status = "FLAGGED"
        kyc_app.reviewer_comment = f"Transaction document flagged: {', '.join(transaction_analysis.get('suspicious_indicators', []))}"
    
    # If liveness check failed, flag the application
    if doc_type == "SELFIE" and liveness_result and not liveness_result.get('is_live'):
        kyc_app.status = "FLAGGED"
        if not kyc_app.reviewer_comment:
            kyc_app.reviewer_comment = "Liveness check failed: No eye blink detected in video"
        else:
            kyc_app.reviewer_comment += "\nLiveness check failed: No eye blink detected in video"
    
    # Log to audit trail
    audit_service.log_event(
        db=db,
        entity_type="kyc_application",
        entity_id=kyc_app.id,
        event_type="document_upload",
        details={"doc_type": doc_type, "file_hash": file_hash, "liveness": liveness_result, "transaction_analysis": transaction_analysis},
        performed_by=current_user.id,
        tx_hash=tx_hash
    )
    
    db.commit()
    db.refresh(document)
    
    # Create response with validation result
    from app.schemas.kyc import DocumentResponse, ValidationResult
    response_dict = {
        "id": document.id,
        "kyc_id": document.kyc_id,
        "doc_type": document.doc_type,
        "file_path": document.file_path,
        "file_hash": document.file_hash,
        "extracted_data": document.extracted_data,
        "verified": document.verified,
        "uploaded_at": document.uploaded_at,
        "validation_result": ValidationResult(**validation_result) if validation_result else None
    }
    
    return DocumentResponse(**response_dict)


@router.post("/process")
async def process_kyc_application(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Process KYC application (OCR, face matching, risk scoring)"""
    kyc_app = db.query(KYCApplication).filter(
        KYCApplication.user_id == current_user.id
    ).order_by(desc(KYCApplication.created_at)).first()
    
    if not kyc_app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No KYC application found"
        )
    
    if kyc_app.status not in ["UPLOADED", "DRAFT", "REGISTERED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Application already processed or in review"
        )
    
    # Get documents
    documents = db.query(Document).filter(Document.kyc_id == kyc_app.id).all()
    
    if not documents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No documents uploaded"
        )
    
    # Validate user details against extracted document data
    from app.services.validation_service import validation_service
    
    user_details = kyc_app.user_details or {}
    validation_errors = []
    
    # Find identity document (non-selfie) for validation
    id_doc = next((d for d in documents if d.doc_type != "SELFIE"), None)
    
    if id_doc and user_details:
        # Re-extract data if not already extracted or empty
        extracted_data = id_doc.extracted_data or {}
        if not extracted_data or len(extracted_data) == 0:
            id_path = id_doc.file_path.lstrip('/')
            if not os.path.exists(id_path):
                id_path = os.path.join("uploads", kyc_app.id, os.path.basename(id_doc.file_path))
            
            # Extract data using OCR
            extracted_data = document_service.extract_text_from_image(id_path)
            id_doc.extracted_data = extracted_data
            db.commit()
        
        # Validate user details against extracted data
        is_valid, rejection_reasons = validation_service.validate_user_details(
            user_details=user_details,
            extracted_data=extracted_data,
            doc_type=id_doc.doc_type
        )
        
        if not is_valid:
            # Reject application immediately
            kyc_app.status = "REJECTED"
            kyc_app.reviewer_comment = "Application rejected: Details do not match uploaded documents.\n\nReasons:\n" + "\n".join(f"- {reason}" for reason in rejection_reasons)
            db.commit()
            
            # Log rejection
            tx_hash = generate_tx_hash()
            verification = Verification(
                kyc_id=kyc_app.id,
                event_type="rejection",
                details={
                    "reason": "details_mismatch",
                    "rejection_reasons": rejection_reasons,
                    "user_details": user_details,
                    "extracted_data": id_doc.extracted_data
                },
                performed_by="system",
                tx_hash=tx_hash
            )
            db.add(verification)
            db.commit()
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Application rejected: Details do not match uploaded documents",
                    "reasons": rejection_reasons
                }
            )
    
    # Find selfie and ID document
    selfie = next((d for d in documents if d.doc_type == "SELFIE"), None)
    
    kyc_app.status = "PROCESSING"
    db.commit()
    
    # Perform face matching and deduplication if both selfie and ID are available
    face_match_score = None
    face_embedding_hash = None
    duplicate_ukn = None
    
    if selfie and id_doc:
        try:
            # Get absolute paths
            selfie_path = selfie.file_path.lstrip('/')
            id_path = id_doc.file_path.lstrip('/')
            
            if not os.path.exists(selfie_path):
                selfie_path = os.path.join("uploads", kyc_app.id, os.path.basename(selfie.file_path))
            if not os.path.exists(id_path):
                id_path = os.path.join("uploads", kyc_app.id, os.path.basename(id_doc.file_path))
            
            # Calculate face match between ID and selfie (using InsightFace if available)
            face_match_score = document_service.calculate_face_match(
                id_path, selfie_path, use_insightface=True
            )
            kyc_app.face_match_score = face_match_score
            
            # Extract face embedding from selfie for deduplication (prefer InsightFace, fallback to DeepFace)
            try:
                import numpy as np
                embedding = None
                
                # Try InsightFace first
                try:
                    from insightface import app as insightface_app
                    model_path = 'buffalo_l'
                    model = insightface_app.FaceAnalysis(name=model_path, providers=['CPUExecutionProvider'])
                    model.prepare(ctx_id=-1, det_size=(640, 640))
                    
                    faces = model.get(selfie_path)
                    if faces and len(faces) > 0:
                        embedding = faces[0].embedding
                except:
                    # Fallback to DeepFace
                    from deepface import DeepFace
                    embedding_obj = DeepFace.represent(
                        img_path=selfie_path,
                        model_name='VGG-Face',
                        detector_backend='opencv',
                        enforce_detection=True
                    )
                    
                    if embedding_obj and len(embedding_obj) > 0:
                        embedding = np.array(embedding_obj[0]['embedding'])
                
                if embedding is not None:
                    # Generate embedding hash
                    face_embedding = np.array(embedding) if not isinstance(embedding, np.ndarray) else embedding
                    face_embedding_hash = face_dedupe_service.generate_embedding_hash(face_embedding)
                    kyc_app.face_embedding_hash = face_embedding_hash
                    
                    # Store embedding for deduplication check
                    face_dedupe_service.store_embedding(kyc_app.id, face_embedding)
                    
                    # Check for duplicates - get all verified KYC applications with embeddings
                    verified_apps = db.query(KYCApplication).filter(
                        KYCApplication.status == "VERIFIED",
                        KYCApplication.face_embedding_hash.isnot(None),
                        KYCApplication.ukn.isnot(None),
                        KYCApplication.id != kyc_app.id  # Exclude current application
                    ).all()
                    
                    if verified_apps:
                        # Check against existing embeddings using face_dedupe_service
                        existing_ukns = [app.ukn for app in verified_apps if app.ukn]
                        existing_embeddings = []
                        
                        for app in verified_apps:
                            # Get stored embedding from face_dedupe_service
                            stored_embedding = face_dedupe_service.get_embedding(app.ukn or app.id)
                            if stored_embedding is not None:
                                existing_embeddings.append(stored_embedding)
                        
                        # Check for duplicates using face_dedupe_service
                        if existing_embeddings:
                            is_duplicate, matched_ukn, similarity = face_dedupe_service.check_duplicate(
                                new_embedding=face_embedding,
                                existing_ukns=existing_ukns,
                                existing_embeddings=existing_embeddings
                            )
                            
                            if is_duplicate:
                                duplicate_ukn = matched_ukn
                    
                    # Log face embedding extraction
                    tx_hash = generate_tx_hash()
                    verification = Verification(
                        kyc_id=kyc_app.id,
                        event_type="face_embedding_extracted",
                        details={
                            "embedding_hash": face_embedding_hash,
                            "duplicate_check": duplicate_ukn is not None,
                            "duplicate_ukn": duplicate_ukn
                        },
                        performed_by="system",
                        tx_hash=tx_hash
                    )
                    db.add(verification)
                    
            except Exception as e:
                print(f"Face embedding extraction error: {e}")
            
            # Log face match event
            tx_hash = generate_tx_hash()
            verification = Verification(
                kyc_id=kyc_app.id,
                event_type="face_match",
                details={"confidence": face_match_score, "threshold": 0.8},
                performed_by="system",
                tx_hash=tx_hash
            )
            db.add(verification)
            
            audit_service.log_event(
                db=db,
                entity_type="kyc_application",
                entity_id=kyc_app.id,
                event_type="face_match",
                details={"confidence": face_match_score},
                performed_by="system",
                tx_hash=tx_hash
            )
            
            # If duplicate found, set status to flag for review
            if duplicate_ukn:
                kyc_app.reviewer_comment = f"Potential duplicate detected. Existing UKN: {duplicate_ukn}"
        except Exception as e:
            print(f"Face matching error: {e}")
    
    # Calculate risk score using ML model
    try:
        # Extract features for ML model
        doc = id_doc if id_doc else documents[0]
        
        # Get image quality
        doc_path = doc.file_path.lstrip('/')
        if not os.path.exists(doc_path):
            doc_path = os.path.join("uploads", kyc_app.id, os.path.basename(doc.file_path))
        
        id_quality = document_service.calculate_image_quality(doc_path)
        
        # Prepare features for ML model
        face_match_conf = face_match_score if face_match_score else 0.85
        doc_age_years = 1.5  # Default (could be calculated from expiry date)
        address_verification = 0.5  # Default (could be enhanced with address API)
        transaction_history_risk = 0.2  # Default
        doc_type_risk = {"PASSPORT": 0.1, "DRIVERS_LICENSE": 0.3, "NATIONAL_ID": 0.5}.get(
            doc.doc_type, 0.3
        )
        extraction_confidence = 0.9 if doc.extracted_data else 0.7
        name_match_score = 0.9  # Default
        
        # Calculate risk score with SHAP
        risk_score, shap_features = ml_service.calculate_risk_score(
            face_match_confidence=face_match_conf,
            document_age_years=doc_age_years,
            address_verification_score=address_verification,
            transaction_history_risk=transaction_history_risk,
            id_quality_score=id_quality,
            document_type_risk=doc_type_risk,
            extraction_confidence=extraction_confidence,
            name_match_score=name_match_score
        )
        
        kyc_app.risk_score = risk_score
        
        # Store SHAP explanation (convert to dict for storage)
        # For now, we'll store it in a computed property or fetch separately
        # This would typically be stored in a separate table or JSON field
        
    except Exception as e:
        print(f"Risk scoring error: {e}")
        risk_score = 0.5  # Default risk score
    
    # Determine next status based on risk score and duplicate check
    # Auto-approve very low risk applications (< 30%)
    if duplicate_ukn:
        # Flag for manual review if duplicate detected
        kyc_app.status = "IN_REVIEW"
    elif risk_score < 0.3:
        # Very low risk - AUTO-APPROVE and issue UKN immediately
        from app.services.ukn_service import generate_ukn
        from app.services.blockchain_service import blockchain_service
        from datetime import timedelta
        
        # Generate UKN
        ukn = generate_ukn()
        # Ensure uniqueness
        while db.query(KYCApplication).filter(KYCApplication.ukn == ukn).first():
            ukn = generate_ukn()
        kyc_app.ukn = ukn
        
        # Update status to VERIFIED
        kyc_app.status = "VERIFIED"
        kyc_app.verified_at = datetime.now()
        kyc_app.expires_at = datetime.now() + timedelta(days=365)  # 1 year validity
        kyc_app.reviewer_comment = "Auto-approved: Low risk score"
        
        # Create blockchain record
        document_hashes = {}
        for doc in kyc_app.documents:
            document_hashes[doc.doc_type] = doc.file_hash
        
        verification_data = {
            "risk_score": risk_score,
            "face_match_score": face_match_score,
            "reviewer_id": "system",
            "verified_at": kyc_app.verified_at.isoformat(),
            "auto_approved": True
        }
        
        blockchain_record = blockchain_service.create_block(
            ukn=ukn,
            document_hashes=document_hashes,
            face_embedding_hash=kyc_app.face_embedding_hash or "",
            verification_data=verification_data,
            issuer="system"
        )
        
        kyc_app.blockchain_tx_hash = blockchain_record["tx_hash"]
        
        # Create verification record
        verification = Verification(
            kyc_id=kyc_app.id,
            event_type="auto_verification",
            details={
                "reviewer_id": "system",
                "comment": "Auto-approved: Low risk score",
                "ukn": ukn,
                "blockchain_tx_hash": blockchain_record["tx_hash"],
                "risk_score": risk_score
            },
            performed_by="system",
            tx_hash=blockchain_record["tx_hash"]
        )
        db.add(verification)
        
        # Log to audit trail
        audit_service.log_event(
            db=db,
            entity_type="kyc_application",
            entity_id=kyc_app.id,
            event_type="auto_verification",
            details={
                "reviewer_id": "system",
                "risk_score": risk_score,
                "ukn": ukn,
                "blockchain_tx_hash": blockchain_record["tx_hash"]
            },
            performed_by="system",
            tx_hash=blockchain_record["tx_hash"]
        )
        
        print(f"Auto-approved application {kyc_app.id} with UKN {ukn} (risk score: {risk_score})")
    elif risk_score >= 0.5:
        # High risk (>= 50%) - requires manual review
        kyc_app.status = "IN_REVIEW"
    else:
        # Medium risk (30-50%) - also requires review
        kyc_app.status = "IN_REVIEW"
    
    kyc_app.updated_at = datetime.now()
    
    # Log processing completion
    tx_hash = generate_tx_hash()
    verification = Verification(
        kyc_id=kyc_app.id,
        event_type="processing_complete",
        details={
            "risk_score": risk_score,
            "face_match_score": face_match_score,
            "status": kyc_app.status
        },
        performed_by="system",
        tx_hash=tx_hash
    )
    db.add(verification)
    
    db.commit()
    db.refresh(kyc_app)
    
    # Return response with SHAP explanation
    response = KYCApplicationResponse.from_orm(kyc_app)
    response.user_email = current_user.email
    response.shap_explanation = shap_features if 'shap_features' in locals() else None
    
    return response


@router.get("/applications/{application_id}", response_model=KYCApplicationResponse)
async def get_kyc_application(
    application_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get KYC application by ID"""
    kyc_app = db.query(KYCApplication).filter(
        KYCApplication.id == application_id
    ).first()
    
    if not kyc_app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="KYC application not found"
        )
    
    # Check permissions (user can only see their own, admin/reviewer can see all)
    if current_user.role == "user" and kyc_app.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this application"
        )
    
    response = KYCApplicationResponse.from_orm(kyc_app)
    if kyc_app.user:
        response.user_email = kyc_app.user.email
    
    return response


@router.get("/documents", response_model=List[DocumentResponse])
async def get_my_documents(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all documents for current user's KYC application"""
    kyc_app = db.query(KYCApplication).filter(
        KYCApplication.user_id == current_user.id
    ).order_by(desc(KYCApplication.created_at)).first()
    
    if not kyc_app:
        return []
    
    documents = db.query(Document).filter(Document.kyc_id == kyc_app.id).all()
    
    return [DocumentResponse.from_orm(doc) for doc in documents]


@router.get("/consents", response_model=List[dict])
async def get_my_consents(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all consent records for current user's KYC"""
    kyc_app = db.query(KYCApplication).filter(
        KYCApplication.user_id == current_user.id
    ).order_by(desc(KYCApplication.created_at)).first()
    
    if not kyc_app:
        return []
    
    from app.db.models import ConsentRecord
    consents = db.query(ConsentRecord).filter(
        ConsentRecord.kyc_id == kyc_app.id
    ).all()
    
    # Get institution names
    result = []
    for consent in consents:
        institution = db.query(User).filter(User.id == consent.institution_id).first()
        result.append({
            "id": consent.id,
            "institution_id": consent.institution_id,
            "institution_name": institution.email if institution else "Unknown",
            "purpose": consent.purpose,
            "consent_given": consent.consent_given,
            "accessed_at": consent.accessed_at.isoformat() if consent.accessed_at else None,
            "expires_at": consent.expires_at.isoformat() if consent.expires_at else None,
            "created_at": consent.created_at.isoformat() if consent.created_at else None
        })
    
    return result


@router.post("/consents/{consent_id}/grant")
async def grant_consent(
    consent_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """User grants consent to an institution"""
    from app.db.models import ConsentRecord
    
    kyc_app = db.query(KYCApplication).filter(
        KYCApplication.user_id == current_user.id
    ).order_by(desc(KYCApplication.created_at)).first()
    
    if not kyc_app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No KYC application found"
        )
    
    consent = db.query(ConsentRecord).filter(
        ConsentRecord.id == consent_id,
        ConsentRecord.kyc_id == kyc_app.id
    ).first()
    
    if not consent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consent record not found"
        )
    
    consent.consent_given = True
    consent.accessed_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Consent granted successfully", "consent_id": consent.id}


@router.post("/consents/{consent_id}/revoke")
async def revoke_consent(
    consent_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """User revokes consent from an institution"""
    from app.db.models import ConsentRecord
    
    kyc_app = db.query(KYCApplication).filter(
        KYCApplication.user_id == current_user.id
    ).order_by(desc(KYCApplication.created_at)).first()
    
    if not kyc_app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No KYC application found"
        )
    
    consent = db.query(ConsentRecord).filter(
        ConsentRecord.id == consent_id,
        ConsentRecord.kyc_id == kyc_app.id
    ).first()
    
    if not consent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consent record not found"
        )
    
    consent.consent_given = False
    consent.expires_at = datetime.utcnow()  # Immediately expire
    db.commit()
    
    return {"message": "Consent revoked successfully", "consent_id": consent.id}
