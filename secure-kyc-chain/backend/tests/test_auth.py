"""Test authentication endpoints"""
import pytest
from fastapi import status


def test_register_success(client):
    """Test successful user registration"""
    response = client.post("/api/v1/auth/register", json={
        "email": "newuser@example.com",
        "password": "password123",
        "role": "user"
    })
    # Endpoint returns 200, not 201
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "id" in data
    assert data["email"] == "newuser@example.com"
    assert "hashed_password" not in data


def test_register_duplicate_email(client, test_user):
    """Test registration with duplicate email fails"""
    response = client.post("/api/v1/auth/register", json={
        "email": test_user.email,
        "password": "password123",
        "role": "user"
    })
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_login_success(client, test_user):
    """Test successful login"""
    response = client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": "testpass123"
    })
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["success"] == True
    assert "access_token" in data
    assert "user" in data


def test_login_invalid_credentials(client, test_user):
    """Test login with invalid password returns error"""
    response = client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": "wrongpassword"
    })
    # Endpoint returns 200 with success: false instead of 401
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["success"] == False
    assert "error" in data


def test_login_nonexistent_user(client):
    """Test login with non-existent user returns error"""
    response = client.post("/api/v1/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "password123"
    })
    # Endpoint returns 200 with success: false instead of 401
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["success"] == False
    assert "error" in data


def test_get_me_without_token(client):
    """Test /me endpoint without token returns 401"""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_me_with_token(client, auth_headers):
    """Test /me endpoint with valid token"""
    response = client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "email" in data
    assert "id" in data


def test_get_me_invalid_token(client):
    """Test /me endpoint with invalid token returns 401"""
    headers = {"Authorization": "Bearer invalid_token_here"}
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

