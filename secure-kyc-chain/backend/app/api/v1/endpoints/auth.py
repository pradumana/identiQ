from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.db.database import get_db
from app.db.models import User
from app.schemas.auth import AuthResponse, UserResponse, LoginRequest, RegisterRequest
from app.core.security import (
    verify_password, get_password_hash, create_access_token,
    get_current_active_user
)
from app.core.config import settings

router = APIRouter()


@router.post("/login", response_model=AuthResponse)
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """Login endpoint"""
    user = db.query(User).filter(User.email == login_data.email).first()
    
    if not user:
        return AuthResponse(
            success=False,
            error="Invalid credentials"
        )
    
    if not verify_password(login_data.password, user.hashed_password):
        return AuthResponse(
            success=False,
            error="Invalid credentials"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )
    
    return AuthResponse(
        success=True,
        user=UserResponse.from_orm(user),
        access_token=access_token,
        refresh_token=f"refresh_{access_token}"  # Simplified refresh token
    )


@router.post("/token", response_model=AuthResponse)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """OAuth2 compatible token endpoint"""
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )
    
    return AuthResponse(
        success=True,
        user=UserResponse.from_orm(user),
        access_token=access_token,
        token_type="bearer"
    )


@router.get("/me", response_model=UserResponse)
async def read_users_me(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user information"""
    return UserResponse.from_orm(current_user)


@router.post("/register", response_model=UserResponse)
async def register(
    register_data: RegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Register a new user
    Only allows registration as 'user' or 'institution' role
    Admin and reviewer accounts must be created by admin
    """
    # Only allow registration as 'user' or 'institution' role
    if register_data.role not in ["user", "institution"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only 'user' and 'institution' roles can be self-registered. Admin and reviewer accounts must be created by an administrator."
        )
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == register_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate password strength
    if len(register_data.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )
    
    # Create new user
    hashed_password = get_password_hash(register_data.password)
    new_user = User(
        email=register_data.email,
        hashed_password=hashed_password,
        role=register_data.role
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return UserResponse.from_orm(new_user)

