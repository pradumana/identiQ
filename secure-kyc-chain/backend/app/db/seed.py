"""Database seeding script to create initial users"""
from sqlalchemy.orm import Session

from app.db.database import SessionLocal, engine, Base
from app.db.models import User
from app.core.security import get_password_hash

# Create tables
Base.metadata.create_all(bind=engine)


def seed_users():
    """Seed initial users"""
    db = SessionLocal()
    
    try:
        # Check if users already exist
        existing_users = db.query(User).count()
        if existing_users > 0:
            print("Users already exist, skipping seed")
            return
        
        # Create test users
        users = [
            {
                "email": "user@example.com",
                "password": "Password123!",
                "role": "user"
            },
            {
                "email": "reviewer@example.com",
                "password": "Password123!",
                "role": "reviewer"
            },
            {
                "email": "admin@example.com",
                "password": "Password123!",
                "role": "admin"
            }
        ]
        
        for user_data in users:
            user = User(
                email=user_data["email"],
                hashed_password=get_password_hash(user_data["password"]),
                role=user_data["role"]
            )
            db.add(user)
        
        db.commit()
        print("Successfully seeded users")
        print("Users created:")
        for user_data in users:
            print(f"  - {user_data['email']} (role: {user_data['role']})")
            print(f"    Password: {user_data['password']}")
    
    except Exception as e:
        print(f"Error seeding users: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_users()

