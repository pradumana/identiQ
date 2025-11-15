"""Test blockchain records endpoints"""
import pytest
from fastapi import status
from app.db.models import KYCApplication, User
from datetime import datetime, timedelta


def test_get_blockchain_records_without_auth(client):
    """Test getting blockchain records without auth returns 401"""
    response = client.get("/api/v1/admin/blockchain-records")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_blockchain_records_success(client, db, admin_headers, test_user):
    """Test getting blockchain records"""
    # Create verified application with blockchain hash
    kyc_app = KYCApplication(
        user_id=test_user.id,
        status="VERIFIED",
        ukn="KYC-1234-5678-9012",
        blockchain_tx_hash="0x1234567890abcdef",
        verified_at=datetime.utcnow()
    )
    db.add(kyc_app)
    db.commit()
    
    response = client.get("/api/v1/admin/blockchain-records", headers=admin_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)


def test_get_blockchain_record_by_ukn(client, db, admin_headers, test_user):
    """Test getting blockchain record by UKN"""
    ukn = "KYC-1234-5678-9012"
    kyc_app = KYCApplication(
        user_id=test_user.id,
        status="VERIFIED",
        ukn=ukn,
        blockchain_tx_hash="0x1234567890abcdef",
        verified_at=datetime.utcnow()
    )
    db.add(kyc_app)
    db.commit()
    
    response = client.get(f"/api/v1/admin/blockchain-records/{ukn}", headers=admin_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data.get("ukn") == ukn


def test_blockchain_hash_mismatch(client, db, admin_headers, test_user):
    """Test blockchain hash mismatch scenario"""
    # This would be tested in blockchain service verification
    # For now, test that invalid UKN returns 404
    response = client.get(
        "/api/v1/admin/blockchain-records/KYC-INVALID12345",
        headers=admin_headers
    )
    # May return 400 for invalid format or 404 for not found
    assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_404_NOT_FOUND]

