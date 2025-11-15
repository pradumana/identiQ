"""Service for validating user-entered details against extracted document data"""
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime
import re
from difflib import SequenceMatcher


class ValidationService:
    """Service to validate user details against extracted document data"""
    
    def __init__(self):
        self.name_similarity_threshold = 0.75  # 75% similarity required for name match
        self.date_tolerance_days = 0  # Dates must match exactly (or within tolerance)
    
    def validate_user_details(
        self,
        user_details: Dict[str, Any],
        extracted_data: Dict[str, Any],
        doc_type: str
    ) -> Tuple[bool, List[str]]:
        """
        Validate user-entered details against extracted document data
        
        Args:
            user_details: Dict with keys: name, date_of_birth, gender, etc.
            extracted_data: Dict from OCR extraction with keys: name, dob, etc.
            doc_type: Type of document (AADHAAR, PASSPORT, etc.)
        
        Returns:
            Tuple of (is_valid, list_of_rejection_reasons)
        """
        rejection_reasons = []
        
        # Validate name
        name_valid, name_reason = self._validate_name(
            user_details.get("name", ""),
            extracted_data.get("name", "")
        )
        if not name_valid:
            rejection_reasons.append(name_reason)
        
        # Validate date of birth
        dob_valid, dob_reason = self._validate_date_of_birth(
            user_details.get("date_of_birth", ""),
            extracted_data.get("dob", "")
        )
        if not dob_valid:
            rejection_reasons.append(dob_reason)
        
        # Validate gender (if available in document)
        if extracted_data.get("gender"):
            gender_valid, gender_reason = self._validate_gender(
                user_details.get("gender", ""),
                extracted_data.get("gender", "")
            )
            if not gender_valid:
                rejection_reasons.append(gender_reason)
        
        # Validate address (if required and available)
        if user_details.get("address") and extracted_data.get("address"):
            address_valid, address_reason = self._validate_address(
                user_details.get("address", ""),
                extracted_data.get("address", "")
            )
            if not address_valid:
                rejection_reasons.append(address_reason)
        
        # Document-specific validations
        if doc_type in ["AADHAAR", "AADHAR"]:
            # Aadhaar-specific validations
            if extracted_data.get("aadhaar_number"):
                # Could validate Aadhaar number format here
                pass
        
        is_valid = len(rejection_reasons) == 0
        return is_valid, rejection_reasons
    
    def _validate_name(self, user_name: str, extracted_name: str) -> Tuple[bool, Optional[str]]:
        """Validate name match using fuzzy matching"""
        if not user_name or not extracted_name:
            return False, "Name not found in document or not provided by user"
        
        # Normalize names (remove extra spaces, convert to uppercase)
        user_name_norm = re.sub(r'\s+', ' ', user_name.strip().upper())
        extracted_name_norm = re.sub(r'\s+', ' ', extracted_name.strip().upper())
        
        # Calculate similarity
        similarity = SequenceMatcher(None, user_name_norm, extracted_name_norm).ratio()
        
        if similarity >= self.name_similarity_threshold:
            return True, None
        else:
            return False, f"Name mismatch: User entered '{user_name}' but document shows '{extracted_name}' (similarity: {similarity:.2%})"
    
    def _validate_date_of_birth(self, user_dob: str, extracted_dob: str) -> Tuple[bool, Optional[str]]:
        """Validate date of birth match"""
        if not user_dob or not extracted_dob:
            return False, "Date of birth not found in document or not provided by user"
        
        # Parse user DOB (expected format: YYYY-MM-DD)
        try:
            user_date = datetime.strptime(user_dob, "%Y-%m-%d").date()
        except ValueError:
            return False, f"Invalid date format in user input: {user_dob}"
        
        # Parse extracted DOB (could be in various formats)
        extracted_date = self._parse_date(extracted_dob)
        if not extracted_date:
            return False, f"Could not parse date from document: {extracted_dob}"
        
        # Compare dates
        if user_date == extracted_date:
            return True, None
        else:
            return False, f"Date of birth mismatch: User entered '{user_dob}' but document shows '{extracted_dob}'"
    
    def _parse_date(self, date_str: str) -> Optional[datetime.date]:
        """Parse date from various formats"""
        if not date_str:
            return None
        
        # Common date formats
        date_formats = [
            "%Y-%m-%d",
            "%d/%m/%Y",
            "%d-%m-%Y",
            "%m/%d/%Y",
            "%d %B %Y",
            "%d %b %Y",
            "%B %d, %Y",
            "%b %d, %Y",
        ]
        
        # Clean the date string
        date_str = date_str.strip()
        
        for fmt in date_formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
        
        # Try to extract date from text with regex
        # Pattern: DD/MM/YYYY or DD-MM-YYYY
        match = re.search(r'(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})', date_str)
        if match:
            day, month, year = match.groups()
            year = int(year)
            if year < 100:
                year += 2000 if year < 50 else 1900
            
            try:
                return datetime(int(year), int(month), int(day)).date()
            except ValueError:
                pass
        
        return None
    
    def _validate_gender(self, user_gender: str, extracted_gender: str) -> Tuple[bool, Optional[str]]:
        """Validate gender match"""
        if not user_gender or not extracted_gender:
            return True, None  # Gender is optional, so don't fail if missing
        
        # Normalize gender values
        user_gender_norm = user_gender.upper().strip()
        extracted_gender_norm = extracted_gender.upper().strip()
        
        # Gender mappings
        gender_map = {
            "MALE": ["M", "MALE", "MALE", "M"],
            "FEMALE": ["F", "FEMALE", "FEMALE", "F"],
            "OTHER": ["O", "OTHER", "OTHER", "O"]
        }
        
        # Check if they match
        user_genders = gender_map.get(user_gender_norm, [user_gender_norm])
        if extracted_gender_norm in user_genders or any(g in extracted_gender_norm for g in user_genders):
            return True, None
        else:
            return False, f"Gender mismatch: User entered '{user_gender}' but document shows '{extracted_gender}'"
    
    def _validate_address(self, user_address: str, extracted_address: str) -> Tuple[bool, Optional[str]]:
        """Validate address match using fuzzy matching"""
        if not user_address or not extracted_address:
            return True, None  # Address is optional for some documents
        
        # Normalize addresses (remove extra spaces, convert to uppercase)
        user_addr_norm = re.sub(r'\s+', ' ', user_address.strip().upper())
        extracted_addr_norm = re.sub(r'\s+', ' ', extracted_address.strip().upper())
        
        # Calculate similarity
        similarity = SequenceMatcher(None, user_addr_norm, extracted_addr_norm).ratio()
        
        # Address matching is more lenient (60% similarity)
        if similarity >= 0.6:
            return True, None
        else:
            return False, f"Address mismatch: User entered address does not match document address (similarity: {similarity:.2%})"


# Singleton instance
validation_service = ValidationService()

