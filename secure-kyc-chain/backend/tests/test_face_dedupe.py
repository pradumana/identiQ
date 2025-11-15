"""Test face deduplication endpoints"""
import pytest
from fastapi import status
from app.db.models import KYCApplication, User


def test_get_face_dedupe_queue_without_auth(client):
    """Test getting face dedupe queue without auth returns 401"""
    response = client.get("/api/v1/admin/face-dedupe-queue")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_face_dedupe_queue_success(client, db, admin_headers, test_user):
    """Test getting face dedupe queue"""
    # Create application with face embedding hash
    kyc_app = KYCApplication(
        user_id=test_user.id,
        status="VERIFIED",
        face_embedding_hash="test_hash_123",
        ukn="KYC-1234567890123456"
    )
    db.add(kyc_app)
    db.commit()
    
    response = client.get("/api/v1/admin/face-dedupe-queue", headers=admin_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)


def test_face_dedupe_false_positive(client, db, admin_headers, test_user):
    """Test face dedupe false positive scenario"""
    # Create two applications with different face hashes (should not be duplicates)
    app1 = KYCApplication(
        user_id=test_user.id,
        status="IN_REVIEW",  # Must be IN_REVIEW or PROCESSING to appear in queue
        face_embedding_hash="hash1",
        ukn="KYC-1111-1111-1111"
    )
    
    # Create another user for second application
    from app.core.security import get_password_hash
    user2 = User(
        email="user2@example.com",
        hashed_password=get_password_hash("pass123"),
        role="user"
    )
    db.add(user2)
    db.flush()
    
    app2 = KYCApplication(
        user_id=user2.id,
        status="IN_REVIEW",  # Must be IN_REVIEW or PROCESSING to appear in queue
        face_embedding_hash="hash2",  # Different hash
        ukn="KYC-2222-2222-2222"
    )
    db.add_all([app1, app2])
    db.commit()
    
    # Both should be in queue but not flagged as duplicates
    response = client.get("/api/v1/admin/face-dedupe-queue", headers=admin_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    # Should return both applications
    assert len(data) >= 2

