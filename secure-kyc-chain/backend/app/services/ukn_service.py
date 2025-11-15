"""UKN (Unique KYC Number) Generation Service"""
import hashlib
import secrets
from datetime import datetime
from typing import Optional

def generate_ukn() -> str:
    """
    Generate a unique KYC number in format: KYC-XXXX-XXXX-XXXX
    Uses cryptographically secure random generation
    """
    # Generate 12 random hex characters (48 bits of entropy)
    random_part = secrets.token_hex(6).upper()  # 12 hex chars
    
    # Format as KYC-XXXX-XXXX-XXXX
    ukn = f"KYC-{random_part[:4]}-{random_part[4:8]}-{random_part[8:12]}"
    
    return ukn


def validate_ukn_format(ukn: str) -> bool:
    """Validate UKN format"""
    parts = ukn.split('-')
    if len(parts) != 4:
        return False
    if parts[0] != 'KYC':
        return False
    if len(parts[1]) != 4 or len(parts[2]) != 4 or len(parts[3]) != 4:
        return False
    # Check if all parts are hex
    try:
        int(parts[1] + parts[2] + parts[3], 16)
        return True
    except ValueError:
        return False


def generate_ukn_hash(ukn: str, user_id: str, timestamp: datetime) -> str:
    """Generate a hash for blockchain storage"""
    data = f"{ukn}:{user_id}:{timestamp.isoformat()}"
    return hashlib.sha256(data.encode()).hexdigest()

