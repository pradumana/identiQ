from sqlalchemy.orm import Session
from datetime import datetime
import hashlib
from typing import Optional, Dict, Any

from app.db.models import AuditRecord


class AuditService:
    """Service for logging audit trail events"""
    
    def log_event(
        self,
        db: Session,
        entity_type: str,
        entity_id: str,
        event_type: str,
        details: Optional[Dict[str, Any]] = None,
        performed_by: str = "system",
        tx_hash: Optional[str] = None
    ) -> AuditRecord:
        """Log an event to the audit trail"""
        
        # Generate event hash
        event_data = f"{entity_type}:{entity_id}:{event_type}:{datetime.now().isoformat()}"
        event_hash = f"sha256:{hashlib.sha256(event_data.encode()).hexdigest()}"
        
        # Generate transaction hash if not provided
        if not tx_hash:
            tx_data = f"{event_hash}:{datetime.now().isoformat()}"
            tx_hash = f"0x{hashlib.sha256(tx_data.encode()).hexdigest()[:40]}"
        
        # Create audit record
        audit_record = AuditRecord(
            entity_type=entity_type,
            entity_id=entity_id,
            event_hash=event_hash,
            tx_hash=tx_hash,
            details=details or {}
        )
        
        db.add(audit_record)
        db.commit()
        db.refresh(audit_record)
        
        return audit_record


# Global instance
audit_service = AuditService()

