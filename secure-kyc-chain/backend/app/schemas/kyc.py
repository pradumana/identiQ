from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class ExtractedData(BaseModel):
    name: Optional[str] = None
    dob: Optional[str] = None
    address: Optional[str] = None
    documentNumber: Optional[str] = None
    expiryDate: Optional[str] = None
    nationality: Optional[str] = None


class ShapFeature(BaseModel):
    feature: str
    shap_value: float
    feature_value: str | float


class DocumentCreate(BaseModel):
    doc_type: str  # PASSPORT, DRIVERS_LICENSE, NATIONAL_ID, SELFIE


class ValidationResult(BaseModel):
    is_valid: bool
    errors: List[str] = []
    extracted_name: Optional[str] = None
    extracted_dob: Optional[str] = None
    user_name: Optional[str] = None
    user_dob: Optional[str] = None


class DocumentResponse(BaseModel):
    id: str
    kyc_id: str
    doc_type: str
    file_path: str
    file_hash: str
    extracted_data: Optional[Dict[str, Any]] = None
    verified: bool
    uploaded_at: datetime
    validation_result: Optional[ValidationResult] = None  # Validation result if available
    
    class Config:
        from_attributes = True


class VerificationCreate(BaseModel):
    event_type: str
    details: Optional[Dict[str, Any]] = None
    performed_by: str
    tx_hash: Optional[str] = None


class VerificationResponse(BaseModel):
    id: str
    kyc_id: str
    event_type: str
    details: Optional[Dict[str, Any]] = None
    performed_by: str
    timestamp: datetime
    tx_hash: Optional[str] = None
    
    class Config:
        from_attributes = True


class KYCApplicationCreate(BaseModel):
    pass  # Created automatically when user uploads first document


class KYCApplicationUpdate(BaseModel):
    status: Optional[str] = None
    risk_score: Optional[float] = None
    face_match_score: Optional[float] = None
    reviewer_comment: Optional[str] = None


class KYCApplicationResponse(BaseModel):
    id: str
    user_id: str
    user_email: Optional[str] = None
    ukn: Optional[str] = None  # Unique KYC Number
    status: str
    risk_score: Optional[float] = None
    shap_explanation: Optional[List[ShapFeature]] = None
    face_match_score: Optional[float] = None
    reviewer_comment: Optional[str] = None
    user_details: Optional[Dict[str, Any]] = None  # User-entered details (name, DOB, etc.)
    blockchain_tx_hash: Optional[str] = None
    verified_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    documents: List[DocumentResponse] = []
    verifications: List[VerificationResponse] = []
    
    class Config:
        from_attributes = True


class RiskMetrics(BaseModel):
    total_applications: int
    auto_approved: int
    manual_reviews: int
    rejected: int
    avg_risk_score: float
    avg_processing_time: float


class AuditRecordResponse(BaseModel):
    id: str
    entity_type: str
    entity_id: str
    event_hash: str
    tx_hash: str
    timestamp: datetime
    details: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True

