"""Face Embedding Deduplication Service"""
import numpy as np
from typing import List, Optional, Tuple
import hashlib
import json

class FaceDedupeService:
    """
    Service to ensure one person = one UKN
    Uses face embeddings to detect duplicate identities
    """
    
    def __init__(self):
        self.embeddings_cache = {}  # In production, use a vector database (Pinecone, Weaviate, etc.)
        self.similarity_threshold = 0.85  # Threshold for considering faces as the same person
    
    def generate_embedding_hash(self, embedding: np.ndarray) -> str:
        """Generate a hash from face embedding"""
        # Convert embedding to bytes
        embedding_bytes = embedding.tobytes()
        return hashlib.sha256(embedding_bytes).hexdigest()
    
    def check_duplicate(
        self,
        new_embedding: np.ndarray,
        existing_ukns: List[str],
        existing_embeddings: List[np.ndarray]
    ) -> Tuple[bool, Optional[str], float]:
        """
        Check if face embedding matches any existing UKN
        
        Args:
            new_embedding: New face embedding to check
            existing_ukns: List of existing UKNs
            existing_embeddings: List of corresponding embeddings
        
        Returns:
            (is_duplicate, matched_ukn, similarity_score)
        """
        if not existing_embeddings:
            return False, None, 0.0
        
        # Calculate cosine similarity with all existing embeddings
        similarities = []
        for emb in existing_embeddings:
            similarity = self._cosine_similarity(new_embedding, emb)
            similarities.append(similarity)
        
        max_similarity = max(similarities) if similarities else 0.0
        max_index = similarities.index(max_similarity) if similarities else -1
        
        if max_similarity >= self.similarity_threshold:
            matched_ukn = existing_ukns[max_index] if max_index >= 0 else None
            return True, matched_ukn, max_similarity
        
        return False, None, max_similarity
    
    def _cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Calculate cosine similarity between two vectors"""
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return dot_product / (norm1 * norm2)
    
    def store_embedding(self, ukn: str, embedding: np.ndarray):
        """Store face embedding for a UKN"""
        embedding_hash = self.generate_embedding_hash(embedding)
        self.embeddings_cache[ukn] = {
            "embedding": embedding,
            "hash": embedding_hash
        }
    
    def get_embedding(self, ukn: str) -> Optional[np.ndarray]:
        """Get stored embedding for a UKN"""
        if ukn in self.embeddings_cache:
            return self.embeddings_cache[ukn]["embedding"]
        return None


# Singleton instance
face_dedupe_service = FaceDedupeService()

