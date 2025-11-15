"""Test admin application endpoints"""
import pytest
from fastapi import status
from app.db.models import KYCApplication, Document
from datetime import datetime


def test_get_applications_without_auth(client):
    """Test getting applications without auth returns 401"""
    response = client.get("/api/v1/admin/applications")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_applications_without_admin_role(client, auth_headers):
    """Test getting applications without admin/reviewer role returns 403"""
    response = client.get("/api/v1/admin/applications", headers=auth_headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_get_applications_success(client, db, admin_headers, test_user):
    """Test admin can get all applications"""
    # Create a test application
    kyc_app = KYCApplication(
        user_id=test_user.id,
        status="REGISTERED"
    )
    db.add(kyc_app)
    db.commit()
    
    response = client.get("/api/v1/admin/applications", headers=admin_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


def test_get_application_by_id_success(client, db, admin_headers, test_user):
    """Test admin can get application by ID with documents"""
    # Create a test application
    kyc_app = KYCApplication(
        user_id=test_user.id,
        status="IN_REVIEW"
    )
    db.add(kyc_app)
    db.flush()
    
    # Create a test document
    document = Document(
        kyc_id=kyc_app.id,
        doc_type="PASSPORT",
        file_path="/uploads/test_passport.jpg",
        file_hash="abc123",
        verified=True
    )
    db.add(document)
    db.commit()
    
    response = client.get(f"/api/v1/admin/applications/{kyc_app.id}", headers=admin_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == kyc_app.id
    assert data["status"] == "IN_REVIEW"
    assert "documents" in data
    assert isinstance(data["documents"], list)
    assert len(data["documents"]) == 1
    assert data["documents"][0]["doc_type"] == "PASSPORT"
    assert data["documents"][0]["verified"] is True


def test_get_application_by_id_not_found(client, admin_headers):
    """Test getting non-existent application returns 404"""
    response = client.get("/api/v1/admin/applications/non-existent-id", headers=admin_headers)
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_approve_application_without_reviewer_role(client, db, auth_headers, test_user):
    """Test approving application without reviewer role returns 403"""
    kyc_app = KYCApplication(user_id=test_user.id, status="IN_REVIEW")
    db.add(kyc_app)
    db.commit()
    
    response = client.post(
        f"/api/v1/admin/applications/{kyc_app.id}/approve",
        headers=auth_headers,
        json={"comment": "Approved"}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_approve_application_success(client, db, admin_headers, test_user):
    """Test admin can approve application"""
    kyc_app = KYCApplication(user_id=test_user.id, status="IN_REVIEW")
    db.add(kyc_app)
    db.commit()
    
    response = client.post(
        f"/api/v1/admin/applications/{kyc_app.id}/approve",
        headers=admin_headers,
        json={"comment": "Approved by admin"}
    )
    assert response.status_code == status.HTTP_200_OK
    
    # Verify status changed
    db.refresh(kyc_app)
    assert kyc_app.status == "VERIFIED"


def test_reject_application_success(client, db, admin_headers, test_user):
    """Test admin can reject application"""
    kyc_app = KYCApplication(user_id=test_user.id, status="IN_REVIEW")
    db.add(kyc_app)
    db.commit()
    
    response = client.post(
        f"/api/v1/admin/applications/{kyc_app.id}/reject",
        headers=admin_headers,
        json={"comment": "Rejected: Invalid documents"}
    )
    assert response.status_code == status.HTTP_200_OK
    
    # Verify status changed
    db.refresh(kyc_app)
    assert kyc_app.status == "REJECTED"
    assert "Invalid documents" in kyc_app.reviewer_comment


def test_get_review_queue(client, db, admin_headers, test_user):
    """Test getting review queue"""
    # Create a second user for second application (user_id is unique)
    from app.db.models import User
    from app.core.security import get_password_hash
    user2 = User(
        email="user2@example.com",
        hashed_password=get_password_hash("pass123"),
        role="user"
    )
    db.add(user2)
    db.commit()
    
    # Create applications in different states
    app1 = KYCApplication(user_id=test_user.id, status="IN_REVIEW", risk_score=0.5)
    app2 = KYCApplication(user_id=user2.id, status="VERIFIED", risk_score=0.2)
    db.add_all([app1, app2])
    db.commit()
    
    response = client.get("/api/v1/admin/applications/review-queue", headers=admin_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    # Should include IN_REVIEW but not VERIFIED
    statuses = [app["status"] for app in data]
    assert "IN_REVIEW" in statuses
    assert "VERIFIED" not in statuses or all(app["risk_score"] >= 0.3 for app in data if app.get("risk_score"))


def test_upload_invalid_document(client, db, auth_headers, test_user):
    """Test uploading invalid document returns 400"""
    kyc_app = KYCApplication(user_id=test_user.id, status="REGISTERED")
    db.add(kyc_app)
    db.commit()
    
    # Upload non-image file
    files = {"file": ("test.txt", b"not an image", "text/plain")}
    data = {"doc_type": "PASSPORT"}
    
    response = client.post(
        "/api/v1/kyc/documents/upload",
        headers=auth_headers,
        files=files,
        data=data
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_large_batch_insert(client, db, admin_headers, test_user):
    """Test handling 2000 KYC applications"""
    # Create 2000 users and applications (user_id is unique)
    from app.db.models import User
    from app.core.security import get_password_hash
    
    users = []
    applications = []
    for i in range(2000):
        user = User(
            email=f"batchuser{i}@example.com",
            hashed_password=get_password_hash("pass123"),
            role="user"
        )
        users.append(user)
        applications.append(KYCApplication(
            user_id=user.id,  # Will be set after user is added
            status="REGISTERED"
        ))
    
    db.add_all(users)
    db.flush()  # Flush to get user IDs
    
    # Now set user_ids for applications
    for user, app in zip(users, applications):
        app.user_id = user.id
    
    db.add_all(applications)
    db.commit()
    
    # Try to fetch all
    response = client.get("/api/v1/admin/applications", headers=admin_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    # Should handle large batch (may be paginated)
    assert isinstance(data, list)

