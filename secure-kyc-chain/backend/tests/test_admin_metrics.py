"""Test admin metrics endpoint"""
import pytest
from fastapi import status
from app.db.models import KYCApplication, User


def test_get_metrics_without_auth(client):
    """Test getting metrics without auth returns 401"""
    response = client.get("/api/v1/admin/metrics")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_metrics_success(client, db, admin_headers, test_user):
    """Test admin can get metrics"""
    # Create additional users (user_id is unique)
    from app.core.security import get_password_hash
    user2 = User(
        email="metrics_user2@example.com",
        hashed_password=get_password_hash("pass123"),
        role="user"
    )
    user3 = User(
        email="metrics_user3@example.com",
        hashed_password=get_password_hash("pass123"),
        role="user"
    )
    db.add_all([user2, user3])
    db.flush()
    
    # Create test applications with different statuses
    app1 = KYCApplication(user_id=test_user.id, status="VERIFIED", risk_score=0.15)
    app2 = KYCApplication(user_id=user2.id, status="IN_REVIEW", risk_score=0.6)
    app3 = KYCApplication(user_id=user3.id, status="REJECTED", risk_score=0.8)
    db.add_all([app1, app2, app3])
    db.commit()
    
    response = client.get("/api/v1/admin/metrics", headers=admin_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "total_applications" in data
    assert "auto_approved" in data
    assert "manual_reviews" in data
    assert "rejected" in data
    assert isinstance(data["total_applications"], int)
    assert data["total_applications"] >= 3

