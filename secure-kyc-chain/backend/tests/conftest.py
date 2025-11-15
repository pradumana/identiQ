"""Pytest configuration and fixtures"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.database import Base, get_db
from app.db.models import User
from app.core.security import get_password_hash
from main import app

# Use in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    """Create a fresh database for each test"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    """Create a test client with database override"""
    def override_get_db():
        try:
            yield db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db):
    """Create a test user"""
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("testpass123"),
        role="user"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_admin(db):
    """Create a test admin user"""
    admin = User(
        email="admin@example.com",
        hashed_password=get_password_hash("admin123"),
        role="admin"
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


@pytest.fixture
def test_reviewer(db):
    """Create a test reviewer user"""
    reviewer = User(
        email="reviewer@example.com",
        hashed_password=get_password_hash("reviewer123"),
        role="reviewer"
    )
    db.add(reviewer)
    db.commit()
    db.refresh(reviewer)
    return reviewer


@pytest.fixture
def test_institution(db):
    """Create a test institution user"""
    institution = User(
        email="institution@example.com",
        hashed_password=get_password_hash("inst123"),
        role="institution"
    )
    db.add(institution)
    db.commit()
    db.refresh(institution)
    return institution


@pytest.fixture
def auth_headers(client, test_user):
    """Get auth token for test user"""
    response = client.post("/api/v1/auth/login", json={
        "email": test_user.email,
        "password": "testpass123"
    })
    token = response.json().get("access_token")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(client, test_admin):
    """Get auth token for admin"""
    response = client.post("/api/v1/auth/login", json={
        "email": test_admin.email,
        "password": "admin123"
    })
    token = response.json().get("access_token")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def reviewer_headers(client, test_reviewer):
    """Get auth token for reviewer"""
    response = client.post("/api/v1/auth/login", json={
        "email": test_reviewer.email,
        "password": "reviewer123"
    })
    token = response.json().get("access_token")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def institution_headers(client, test_institution):
    """Get auth token for institution"""
    response = client.post("/api/v1/auth/login", json={
        "email": test_institution.email,
        "password": "inst123"
    })
    token = response.json().get("access_token")
    return {"Authorization": f"Bearer {token}"}

