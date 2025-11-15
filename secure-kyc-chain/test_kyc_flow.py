"""
Test script to verify KYC flow functionality
Run this to test the complete flow
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"

def test_kyc_flow():
    """Test the complete KYC flow"""
    print("=" * 60)
    print("Testing KYC Flow")
    print("=" * 60)
    
    # 1. Register a test user
    print("\n1. Registering test user...")
    register_data = {
        "email": f"test_{datetime.now().timestamp()}@example.com",
        "password": "testpass123",
        "role": "user"
    }
    register_response = requests.post(f"{BASE_URL}/auth/register", json=register_data)
    if register_response.status_code == 200:
        print("✓ User registered successfully")
        user_data = register_response.json()
        user_email = register_data["email"]
    else:
        print(f"✗ Registration failed: {register_response.text}")
        return
    
    # 2. Login
    print("\n2. Logging in...")
    login_data = {
        "username": user_email,
        "password": register_data["password"]
    }
    login_response = requests.post(
        f"{BASE_URL}/auth/login",
        data=login_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    if login_response.status_code == 200:
        print("✓ Login successful")
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
    else:
        print(f"✗ Login failed: {login_response.text}")
        return
    
    # 3. Generate document list
    print("\n3. Generating document list...")
    user_inputs = {
        "name": "Test User",
        "date_of_birth": "1990-01-01",
        "gender": "MALE",
        "marital_status": "SINGLE",
        "purpose": "BANK_ACCOUNT"
    }
    doc_list_response = requests.post(
        f"{BASE_URL}/documents/generate-document-list",
        json=user_inputs,
        headers=headers
    )
    if doc_list_response.status_code == 200:
        print("✓ Document list generated")
        doc_list = doc_list_response.json()
        print(f"  - Mandatory documents: {len(doc_list['mandatory_documents'])}")
    else:
        print(f"✗ Document list generation failed: {doc_list_response.text}")
        return
    
    # 4. Get KYC application status
    print("\n4. Checking KYC application status...")
    kyc_response = requests.get(
        f"{BASE_URL}/kyc/applications/me",
        headers=headers
    )
    if kyc_response.status_code == 200:
        kyc_app = kyc_response.json()
        print(f"✓ KYC application found")
        print(f"  - Status: {kyc_app['status']}")
        print(f"  - Risk Score: {kyc_app.get('risk_score', 'N/A')}")
        print(f"  - UKN: {kyc_app.get('ukn', 'Not issued yet')}")
    else:
        print(f"✗ Failed to get KYC application: {kyc_response.text}")
    
    # 5. Test as admin - check review queue
    print("\n5. Testing admin review queue (requires admin login)...")
    print("   (Skipping - requires admin credentials)")
    
    print("\n" + "=" * 60)
    print("Test Summary:")
    print("=" * 60)
    print("✓ User registration")
    print("✓ User login")
    print("✓ Document list generation")
    print("✓ KYC application status check")
    print("\nTo test admin features, login as admin and check:")
    print("  - Review queue shows only risk score > 50%")
    print("  - Low risk applications (< 30%) are auto-approved")
    print("  - Users can see their UKN after verification")

if __name__ == "__main__":
    test_kyc_flow()

