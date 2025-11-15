"""Document List Generator based on user inputs"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.db.database import get_db
from app.db.models import User, KYCApplication
from app.core.security import get_current_active_user

router = APIRouter()


class UserInputs(BaseModel):
    name: str
    date_of_birth: str  # Format: YYYY-MM-DD
    gender: str  # MALE, FEMALE, OTHER
    marital_status: str  # SINGLE, MARRIED, DIVORCED, WIDOWED
    purpose: str  # EMPLOYMENT, LOAN, EDUCATION, HEALTH_INSURANCE, GENERAL, BANK_ACCOUNT, etc.


class DocumentRequirement(BaseModel):
    doc_type: str
    name: str
    mandatory: bool
    description: Optional[str] = None


class DocumentListResponse(BaseModel):
    mandatory_documents: List[DocumentRequirement]
    optional_documents: List[DocumentRequirement]
    auto_extracted_details: List[str]
    user_inputs: UserInputs


def generate_document_list(user_inputs: UserInputs) -> DocumentListResponse:
    """
    Generate personalized document list based on user inputs using AI logic
    """
    mandatory_docs = []
    optional_docs = []
    auto_extracted = []
    
    # 1. Always ask for ONE identity document
    identity_options = [
        DocumentRequirement(
            doc_type="AADHAAR",
            name="Aadhaar Card",
            mandatory=True,
            description="12-digit Aadhaar number"
        ),
        DocumentRequirement(
            doc_type="PASSPORT",
            name="Passport",
            mandatory=True,
            description="Valid passport with photo"
        ),
        DocumentRequirement(
            doc_type="DRIVING_LICENSE",
            name="Driving License",
            mandatory=True,
            description="Valid driving license"
        ),
        DocumentRequirement(
            doc_type="PAN_CARD",
            name="PAN Card",
            mandatory=True,
            description="PAN card (requires address proof separately)"
        )
    ]
    
    # Add identity document (user will choose one)
    mandatory_docs.append(
        DocumentRequirement(
            doc_type="IDENTITY_DOC",
            name="Identity Document",
            mandatory=True,
            description="Choose one: Aadhaar OR Passport OR Driving License OR PAN Card"
        )
    )
    
    # 2. Address proof - only if identity doc doesn't contain address
    # If user chooses PAN, they need address proof
    # If they choose Aadhaar/Passport/Driving License, check if it has address
    needs_address_proof = True  # Default to true, will be determined by chosen identity doc
    
    address_options = [
        DocumentRequirement(
            doc_type="AADHAAR",
            name="Aadhaar Card (if not used as identity)",
            mandatory=False,
            description="Contains both identity and address"
        ),
        DocumentRequirement(
            doc_type="PASSPORT",
            name="Passport (if not used as identity)",
            mandatory=False,
            description="Contains both identity and address"
        ),
        DocumentRequirement(
            doc_type="DRIVING_LICENSE",
            name="Driving License (if not used as identity)",
            mandatory=False,
            description="Contains both identity and address"
        ),
        DocumentRequirement(
            doc_type="BANK_STATEMENT",
            name="Bank Statement",
            mandatory=False,
            description="Recent bank statement (last 3 months)"
        ),
        DocumentRequirement(
            doc_type="UTILITY_BILL",
            name="Utility Bill",
            mandatory=False,
            description="Electricity/Water/Gas bill (last 3 months)"
        )
    ]
    
    # Add address proof requirement (conditional)
    if needs_address_proof:
        mandatory_docs.append(
            DocumentRequirement(
                doc_type="ADDRESS_PROOF",
                name="Address Proof",
                mandatory=True,
                description="Required if identity document doesn't contain address"
            )
        )
    
    # 3. If Married: Add Marriage Certificate
    if user_inputs.marital_status.upper() == "MARRIED":
        mandatory_docs.append(
            DocumentRequirement(
                doc_type="MARRIAGE_CERTIFICATE",
                name="Marriage Certificate",
                mandatory=True,
                description="Official marriage certificate"
            )
        )
    
    # 4. If Purpose = Employment or Loan: Income/Employment document
    if user_inputs.purpose.upper() in ["EMPLOYMENT", "LOAN"]:
        mandatory_docs.append(
            DocumentRequirement(
                doc_type="INCOME_PROOF",
                name="Income/Employment Proof",
                mandatory=True,
                description="Choose one: Salary Slip OR Bank Statement OR Offer Letter OR Form 16/ITR"
            )
        )
    
    # 5. If Purpose = Education: Education proof
    if user_inputs.purpose.upper() == "EDUCATION":
        mandatory_docs.append(
            DocumentRequirement(
                doc_type="EDUCATION_PROOF",
                name="Education Proof",
                mandatory=True,
                description="Highest Degree OR 12th Marksheet"
            )
        )
    
    # 6. If Purpose = Health/Insurance: Health proof
    if user_inputs.purpose.upper() in ["HEALTH_INSURANCE", "HEALTH", "INSURANCE"]:
        mandatory_docs.append(
            DocumentRequirement(
                doc_type="MEDICAL_CERTIFICATE",
                name="Medical Certificate",
                mandatory=True,
                description="Basic medical certificate"
            )
        )
    
    # 7. Always include Live Selfie Video as mandatory
    mandatory_docs.append(
        DocumentRequirement(
            doc_type="SELFIE",
            name="Live Selfie Video",
            mandatory=True,
            description="Real-time selfie for face matching and liveness check"
        )
    )
    
    # Auto-extracted details
    auto_extracted = [
        "Name (from identity document)",
        "Date of Birth (from identity document)",
        "Address (from address proof or identity document)",
        "Photo (from identity document and selfie)",
        "Document Number (from identity document)",
        "Expiry Date (if applicable)"
    ]
    
    return DocumentListResponse(
        mandatory_documents=mandatory_docs,
        optional_documents=optional_docs,
        auto_extracted_details=auto_extracted,
        user_inputs=user_inputs
    )


@router.post("/generate-document-list", response_model=DocumentListResponse)
async def generate_document_requirements(
    user_inputs: UserInputs,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Generate personalized document list based on user inputs
    """
    try:
        # Validate date format
        datetime.strptime(user_inputs.date_of_birth, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Use YYYY-MM-DD"
        )
    
    # Validate gender
    valid_genders = ["MALE", "FEMALE", "OTHER"]
    if user_inputs.gender.upper() not in valid_genders:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid gender. Must be one of: {', '.join(valid_genders)}"
        )
    
    # Validate marital status
    valid_marital_statuses = ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"]
    if user_inputs.marital_status.upper() not in valid_marital_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid marital status. Must be one of: {', '.join(valid_marital_statuses)}"
        )
    
    # Get or create KYC application
    kyc_app = db.query(KYCApplication).filter(
        KYCApplication.user_id == current_user.id
    ).order_by(KYCApplication.created_at.desc()).first()
    
    if not kyc_app:
        kyc_app = KYCApplication(
            user_id=current_user.id,
            status="REGISTERED"
        )
        db.add(kyc_app)
        db.commit()
        db.refresh(kyc_app)
    
    # Generate document list
    document_list = generate_document_list(user_inputs)
    
    # Store user inputs in application
    kyc_app.user_details = {
        "name": user_inputs.name,
        "date_of_birth": user_inputs.date_of_birth,
        "gender": user_inputs.gender,
        "marital_status": user_inputs.marital_status,
        "purpose": user_inputs.purpose
    }
    db.commit()
    
    return document_list


@router.get("/document-list/{application_id}", response_model=DocumentListResponse)
async def get_document_list(
    application_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get the generated document list for a KYC application
    """
    kyc_app = db.query(KYCApplication).filter(
        KYCApplication.id == application_id,
        KYCApplication.user_id == current_user.id
    ).first()
    
    if not kyc_app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="KYC application not found"
        )
    
    # In a real implementation, you'd retrieve stored user inputs
    # For now, return a default list
    # This would need to be enhanced to store/retrieve user inputs
    
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Document list retrieval not yet implemented. Please regenerate."
    )

