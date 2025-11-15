from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.db.models import User, KYCApplication
from app.schemas.kyc import ShapFeature
from app.core.security import require_role
from app.services.ml_service import ml_service

router = APIRouter()


@router.get("/applications/{application_id}/shap", response_model=List[ShapFeature])
async def get_shap_explanation(
    application_id: str,
    current_user: User = Depends(require_role(["admin", "reviewer"])),
    db: Session = Depends(get_db)
):
    """Get SHAP explanation for a KYC application's risk score"""
    kyc_app = db.query(KYCApplication).filter(
        KYCApplication.id == application_id
    ).first()
    
    if not kyc_app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="KYC application not found"
        )
    
    if kyc_app.risk_score is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Risk score not calculated for this application"
        )
    
    # Recalculate SHAP explanation
    # In production, you'd store feature values and recalculate or store SHAP values
    # For now, we'll use default feature values
    try:
        # This is a simplified version - in production, store actual feature values
        risk_score, shap_features = ml_service.calculate_risk_score(
            face_match_confidence=kyc_app.face_match_score or 0.85,
            document_age_years=1.5,
            address_verification_score=0.5,
            transaction_history_risk=0.2,
            id_quality_score=0.9,
            document_type_risk=0.3,
            extraction_confidence=0.9,
            name_match_score=0.9
        )
        
        return shap_features
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating SHAP explanation: {str(e)}"
        )

