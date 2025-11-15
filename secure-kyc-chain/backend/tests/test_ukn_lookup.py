"""Test UKN lookup endpoints"""
import pytest
from fastapi import status
from app.db.models import KYCApplication, User, ConsentRecord
from datetime import datetime, timedelta


def test_resolve_kyc_without_auth(client):
    """Test resolving UKN without auth returns 401"""
    response = client.get("/api/v1/institution/resolve-kyc/KYC-1234-5678-9012?purpose=test")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_resolve_kyc_without_consent(client, db, institution_headers, test_user):
    """Test UKN lookup without consent - should still work (auto-consent in current implementation)"""
    # Use valid UKN format: KYC-XXXX-XXXX-XXXX (18 chars)
    ukn = "KYC-1234-5678-9012"
    kyc_app = KYCApplication(
        user_id=test_user.id,
        status="VERIFIED",
        ukn=ukn,
        verified_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(days=365)
    )
    db.add(kyc_app)
    db.commit()
    
    response = client.get(
        f"/api/v1/institution/resolve-kyc/{ukn}?purpose=bank_account",
        headers=institution_headers
    )
    # Current implementation auto-creates consent, so should succeed
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["ukn"] == ukn


def test_resolve_kyc_invalid_format(client, institution_headers):
    """Test resolving invalid UKN format returns 400"""
    response = client.get(
        "/api/v1/institution/resolve-kyc/INVALID-UKN?purpose=test",
        headers=institution_headers
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_resolve_kyc_not_found(client, institution_headers):
    """Test resolving non-existent UKN returns 404"""
    # Valid format but non-existent
    response = client.get(
        "/api/v1/institution/resolve-kyc/KYC-9999-9999-9999?purpose=test",
        headers=institution_headers
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_resolve_kyc_expired(client, db, institution_headers, test_user):
    """Test resolving expired KYC returns 410"""
    ukn = "KYC-1234-5678-9012"
    kyc_app = KYCApplication(
        user_id=test_user.id,
        status="VERIFIED",
        ukn=ukn,
        verified_at=datetime.utcnow() - timedelta(days=400),
        expires_at=datetime.utcnow() - timedelta(days=35)  # Expired
    )
    db.add(kyc_app)
    db.commit()
    
    response = client.get(
        f"/api/v1/institution/resolve-kyc/{ukn}?purpose=verification",
        headers=institution_headers
    )
    assert response.status_code == status.HTTP_410_GONE


def test_request_consent(client, db, institution_headers, test_user):
    """Test requesting consent"""
    ukn = "KYC-1234-5678-9012"
    kyc_app = KYCApplication(
        user_id=test_user.id,
        status="VERIFIED",
        ukn=ukn,
        verified_at=datetime.utcnow()
    )
    db.add(kyc_app)
    db.commit()
    
    response = client.post(
        f"/api/v1/institution/request-consent/{ukn}?purpose=loan_application",
        headers=institution_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "consent_id" in data or "message" in data


def test_ukn_lookup_without_institution_role(client, auth_headers):
    """Test UKN lookup without institution role returns 403"""
    response = client.get(
        "/api/v1/institution/resolve-kyc/KYC-1234-5678-9012?purpose=test",
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN

