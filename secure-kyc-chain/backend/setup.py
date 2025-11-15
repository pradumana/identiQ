#!/usr/bin/env python3
"""Setup script for the backend"""
import subprocess
import sys
import os

def main():
    print("Setting up IdentiQ Backend...")
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("Error: Python 3.8 or higher is required")
        sys.exit(1)
    
    print(f"Python version: {sys.version}")
    
    # Install dependencies
    print("\nInstalling dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✓ Dependencies installed")
    except subprocess.CalledProcessError as e:
        print(f"Error installing dependencies: {e}")
        sys.exit(1)
    
    # Create upload directory
    print("\nCreating upload directory...")
    os.makedirs("uploads", exist_ok=True)
    print("✓ Upload directory created")
    
    # Seed database
    print("\nSeeding database...")
    try:
        from app.db.seed import seed_users
        seed_users()
        print("✓ Database seeded")
    except Exception as e:
        print(f"Warning: Could not seed database: {e}")
        print("You can run 'python -m app.db.seed' manually later")
    
    print("\n✓ Setup complete!")
    print("\nTo start the server, run:")
    print("  python main.py")
    print("  or")
    print("  python run.py")

if __name__ == "__main__":
    main()

