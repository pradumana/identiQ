"""Blockchain Service for storing KYC records immutably"""
import hashlib
from datetime import datetime
from typing import Dict, Optional, Any
import json

class BlockchainService:
    """
    Simulated blockchain service for KYC records
    In production, this would integrate with a real blockchain (Ethereum, Hyperledger, etc.)
    """
    
    def __init__(self):
        self.chain = []  # In production, this would be a blockchain connection
    
    def create_block(
        self,
        ukn: str,
        document_hashes: Dict[str, str],
        face_embedding_hash: str,
        verification_data: Dict[str, Any],
        issuer: str = "system"
    ) -> Dict[str, Any]:
        """
        Create a blockchain record for KYC verification
        
        Args:
            ukn: Unique KYC Number
            document_hashes: Dict of {doc_type: hash}
            face_embedding_hash: Hash of face embedding
            verification_data: Verification results and metadata
            issuer: Who issued this KYC
        
        Returns:
            Block data with transaction hash
        """
        timestamp = datetime.utcnow()
        
        # Create block data
        block_data = {
            "ukn": ukn,
            "document_hashes": document_hashes,
            "face_embedding_hash": face_embedding_hash,
            "verification_data": verification_data,
            "issuer": issuer,
            "timestamp": timestamp.isoformat(),
            "version": "1.0"
        }
        
        # Generate transaction hash (simulated)
        tx_hash = self._generate_tx_hash(block_data)
        
        block = {
            "tx_hash": tx_hash,
            "data": block_data,
            "timestamp": timestamp.isoformat()
        }
        
        # In production, this would write to actual blockchain
        # For now, we'll store the hash in the database
        self.chain.append(block)
        
        return block
    
    def _generate_tx_hash(self, data: Dict[str, Any]) -> str:
        """Generate a transaction hash from block data"""
        data_str = json.dumps(data, sort_keys=True)
        hash_obj = hashlib.sha256(data_str.encode())
        return f"0x{hash_obj.hexdigest()}"
    
    def verify_record(self, tx_hash: str) -> Optional[Dict[str, Any]]:
        """Verify a blockchain record by transaction hash"""
        # In production, this would query the blockchain
        for block in self.chain:
            if block["tx_hash"] == tx_hash:
                return block
        return None
    
    def get_ukn_record(self, ukn: str) -> Optional[Dict[str, Any]]:
        """Get blockchain record for a UKN"""
        for block in self.chain:
            if block["data"]["ukn"] == ukn:
                return block
        return None


# Singleton instance
blockchain_service = BlockchainService()

