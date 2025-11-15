from sqlalchemy import Column, String, Float, Boolean, DateTime, Text, ForeignKey, Integer, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timedelta
import uuid

from app.db.database import Base


def generate_id():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_id)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)  # Phone number for OTP verification
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="user")  # user, reviewer, admin, institution
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    kyc_applications = relationship("KYCApplication", back_populates="user")


class KYCApplication(Base):
    __tablename__ = "kyc_applications"
    
    id = Column(String, primary_key=True, default=generate_id)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, unique=True)  # One KYC per user
    ukn = Column(String, unique=True, index=True, nullable=True)  # Unique KYC Number (issued after verification)
    status = Column(String, nullable=False, default="DRAFT")  # DRAFT, REGISTERED, PROCESSING, IN_REVIEW, VERIFIED, REJECTED, SUSPENDED, EXPIRED
    risk_score = Column(Float, nullable=True)
    face_match_score = Column(Float, nullable=True)
    face_embedding_hash = Column(String, nullable=True)  # Hash of face embedding for deduplication
    reviewer_comment = Column(Text, nullable=True)
    user_details = Column(JSON, nullable=True)  # Store user-entered details (name, DOB, gender, etc.)
    blockchain_tx_hash = Column(String, nullable=True)  # Blockchain transaction hash
    verified_at = Column(DateTime(timezone=True), nullable=True)  # When UKN was issued
    expires_at = Column(DateTime(timezone=True), nullable=True)  # KYC expiration date (default: 1 year)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    user = relationship("User", back_populates="kyc_applications")
    documents = relationship("Document", back_populates="kyc_application", cascade="all, delete-orphan")
    verifications = relationship("Verification", back_populates="kyc_application", cascade="all, delete-orphan")
    consent_records = relationship("ConsentRecord", back_populates="kyc_application", cascade="all, delete-orphan")


class Document(Base):
    __tablename__ = "documents"
    
    id = Column(String, primary_key=True, default=generate_id)
    kyc_id = Column(String, ForeignKey("kyc_applications.id"), nullable=False)
    doc_type = Column(String, nullable=False)  # PASSPORT, DRIVERS_LICENSE, NATIONAL_ID, SELFIE
    file_path = Column(String, nullable=False)
    file_hash = Column(String, nullable=False)
    extracted_data = Column(JSON, nullable=True)  # Store extracted OCR data as JSON
    verified = Column(Boolean, default=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    kyc_application = relationship("KYCApplication", back_populates="documents")


class Verification(Base):
    __tablename__ = "verifications"
    
    id = Column(String, primary_key=True, default=generate_id)
    kyc_id = Column(String, ForeignKey("kyc_applications.id"), nullable=False)
    event_type = Column(String, nullable=False)  # document_upload, ocr_extraction, face_match, approval, rejection, etc.
    details = Column(JSON, nullable=True)
    performed_by = Column(String, nullable=False)  # user_id or "system"
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    tx_hash = Column(String, nullable=True)  # Blockchain transaction hash
    
    kyc_application = relationship("KYCApplication", back_populates="verifications")


class ConsentRecord(Base):
    """Records when institutions access user KYC data"""
    __tablename__ = "consent_records"
    
    id = Column(String, primary_key=True, default=generate_id)
    kyc_id = Column(String, ForeignKey("kyc_applications.id"), nullable=False)
    institution_id = Column(String, ForeignKey("users.id"), nullable=False)  # Institution user ID
    purpose = Column(String, nullable=False)  # e.g., "bank_account_opening", "loan_application"
    consent_given = Column(Boolean, default=False)
    access_token = Column(String, nullable=True)  # Temporary access token
    accessed_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    kyc_application = relationship("KYCApplication", back_populates="consent_records")
    institution = relationship("User")


class AuditRecord(Base):
    __tablename__ = "audit_records"
    
    id = Column(String, primary_key=True, default=generate_id)
    entity_type = Column(String, nullable=False)  # kyc_application, user, document, etc.
    entity_id = Column(String, nullable=False)
    event_hash = Column(String, nullable=False)
    tx_hash = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    details = Column(JSON, nullable=True)
