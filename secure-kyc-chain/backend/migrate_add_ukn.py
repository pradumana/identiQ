"""
Database migration script to add UKN and blockchain fields
Run this once to update existing database schema
"""
from sqlalchemy import text
from app.db.database import engine, Base
from app.db.models import User, KYCApplication, ConsentRecord, Document, Verification, AuditRecord

def migrate_database():
    """Add new columns and tables for UKN support"""
    
    print("Starting database migration...")
    
    # Check if migration already done
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT ukn FROM kyc_applications LIMIT 1"))
            result.fetchone()
        print("Migration already completed - UKN column exists")
        return
    except Exception:
        pass  # Column doesn't exist, proceed with migration
    
    # Perform migration
    with engine.begin() as conn:
        try:
            # 1. Add new columns to kyc_applications table
            print("Adding new columns to kyc_applications...")
            
            # Check and add ukn column
            try:
                conn.execute(text("ALTER TABLE kyc_applications ADD COLUMN ukn VARCHAR"))
                print("  [OK] Added ukn column")
            except Exception as e:
                if "duplicate column" not in str(e).lower():
                    print(f"  [WARN] ukn column: {e}")
            
            # Check and add face_embedding_hash column
            try:
                conn.execute(text("ALTER TABLE kyc_applications ADD COLUMN face_embedding_hash VARCHAR"))
                print("  [OK] Added face_embedding_hash column")
            except Exception as e:
                if "duplicate column" not in str(e).lower():
                    print(f"  [WARN] face_embedding_hash column: {e}")
            
            # Check and add blockchain_tx_hash column
            try:
                conn.execute(text("ALTER TABLE kyc_applications ADD COLUMN blockchain_tx_hash VARCHAR"))
                print("  [OK] Added blockchain_tx_hash column")
            except Exception as e:
                if "duplicate column" not in str(e).lower():
                    print(f"  [WARN] blockchain_tx_hash column: {e}")
            
            # Check and add verified_at column
            try:
                conn.execute(text("ALTER TABLE kyc_applications ADD COLUMN verified_at DATETIME"))
                print("  [OK] Added verified_at column")
            except Exception as e:
                if "duplicate column" not in str(e).lower():
                    print(f"  [WARN] verified_at column: {e}")
            
            # Check and add expires_at column
            try:
                conn.execute(text("ALTER TABLE kyc_applications ADD COLUMN expires_at DATETIME"))
                print("  [OK] Added expires_at column")
            except Exception as e:
                if "duplicate column" not in str(e).lower():
                    print(f"  [WARN] expires_at column: {e}")
            
            # 2. Add phone column to users table
            print("Adding phone column to users...")
            try:
                conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR"))
                print("  [OK] Added phone column")
            except Exception as e:
                if "duplicate column" not in str(e).lower():
                    print(f"  [WARN] phone column: {e}")
            
            # 3. Create consent_records table
            print("Creating consent_records table...")
            try:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS consent_records (
                        id VARCHAR PRIMARY KEY,
                        kyc_id VARCHAR NOT NULL,
                        institution_id VARCHAR NOT NULL,
                        purpose VARCHAR NOT NULL,
                        consent_given BOOLEAN DEFAULT 0,
                        access_token VARCHAR,
                        accessed_at DATETIME,
                        expires_at DATETIME,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (kyc_id) REFERENCES kyc_applications(id),
                        FOREIGN KEY (institution_id) REFERENCES users(id)
                    )
                """))
                print("  [OK] Created consent_records table")
            except Exception as e:
                if "already exists" not in str(e).lower():
                    print(f"  [WARN] consent_records table: {e}")
            
            # 4. Create indexes
            print("Creating indexes...")
            try:
                conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS idx_kyc_ukn ON kyc_applications(ukn)"))
                print("  [OK] Created index on ukn")
            except Exception as e:
                print(f"  [WARN] Index creation: {e}")
            
            try:
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_kyc_user_id ON kyc_applications(user_id)"))
                print("  [OK] Created index on user_id")
            except Exception as e:
                print(f"  [WARN] Index creation: {e}")
            
            # 5. Update existing APPROVED status to VERIFIED (if any)
            print("Updating status values...")
            try:
                result = conn.execute(text("""
                    UPDATE kyc_applications 
                    SET status = 'VERIFIED' 
                    WHERE status = 'APPROVED'
                """))
                updated = result.rowcount
                print(f"  [OK] Updated {updated} records from APPROVED to VERIFIED")
            except Exception as e:
                print(f"  [WARN] Status update: {e}")
            
            print("\n[SUCCESS] Database migration completed successfully!")
            
        except Exception as e:
            print(f"\n[ERROR] Migration failed: {e}")
            raise


if __name__ == "__main__":
    migrate_database()

