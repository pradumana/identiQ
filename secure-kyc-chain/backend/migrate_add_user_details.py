"""Migration script to add user_details column to kyc_applications table"""
import sqlite3
import os
from pathlib import Path

# Get database path
db_path = Path(__file__).parent / "kyc.db"

if not db_path.exists():
    print(f"[ERROR] Database file not found: {db_path}")
    exit(1)

print(f"[INFO] Connecting to database: {db_path}")

try:
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    # Check if column already exists
    cursor.execute("PRAGMA table_info(kyc_applications)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if "user_details" in columns:
        print("[OK] Column 'user_details' already exists in kyc_applications table")
    else:
        print("[INFO] Adding 'user_details' column to kyc_applications table...")
        cursor.execute("""
            ALTER TABLE kyc_applications 
            ADD COLUMN user_details TEXT
        """)
        conn.commit()
        print("[OK] Column 'user_details' added successfully")
    
    conn.close()
    print("[OK] Migration completed successfully")
    
except Exception as e:
    print(f"[ERROR] Migration failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

