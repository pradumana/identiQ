import os
import hashlib
from typing import Dict, Any, Optional, Tuple
from PIL import Image
import cv2
import numpy as np

from app.core.config import settings


class DocumentProcessingService:
    """Service for document processing, OCR, and face matching"""
    
    def __init__(self):
        # Initialize PaddleOCR reader
        try:
            from paddleocr import PaddleOCR
            self.ocr_reader = PaddleOCR(use_angle_cls=True, lang='en', use_gpu=False)
            print("PaddleOCR initialized successfully")
        except Exception as e:
            print(f"Warning: Could not initialize PaddleOCR: {e}")
            self.ocr_reader = None
    
    def save_uploaded_file(self, file_content: bytes, filename: str, kyc_id: str) -> Tuple[str, str]:
        """Save uploaded file and return file path and hash"""
        # Create directory for this KYC application
        kyc_dir = os.path.join(settings.UPLOAD_DIR, kyc_id)
        os.makedirs(kyc_dir, exist_ok=True)
        
        # Generate file path
        file_path = os.path.join(kyc_dir, filename)
        
        # Save file
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        # Calculate file hash
        file_hash = hashlib.sha256(file_content).hexdigest()
        
        # Return relative path for storage
        relative_path = f"/uploads/{kyc_id}/{filename}"
        
        return relative_path, file_hash
    
    def extract_text_from_image(self, image_path: str) -> Dict[str, Any]:
        """Extract text from document image using PaddleOCR"""
        if not self.ocr_reader:
            # Fallback to simple extraction
            return self._simple_extraction(image_path)
        
        try:
            # Read image
            if not os.path.exists(image_path):
                # Try absolute path
                image_path = image_path.lstrip('/')
                if os.path.exists(image_path):
                    image_path = os.path.abspath(image_path)
                else:
                    return {}
            
            # Run PaddleOCR
            # PaddleOCR returns: [[[x1, y1], [x2, y2], [x3, y3], [x4, y4]], (text, confidence)]
            results = self.ocr_reader.ocr(image_path, cls=True)
            
            # Extract all text from results
            all_text = ""
            ocr_results = []
            
            if results and len(results) > 0:
                for line in results[0]:
                    if line and len(line) >= 2:
                        text = line[1][0]  # Text content
                        confidence = line[1][1]  # Confidence score
                        all_text += text + " "
                        ocr_results.append({
                            'text': text,
                            'confidence': confidence,
                            'bbox': line[0] if len(line) > 0 else None
                        })
            
            # Try to extract structured data
            extracted_data = self._parse_extracted_text(all_text, ocr_results)
            
            return extracted_data
        except Exception as e:
            print(f"OCR extraction error: {e}")
            import traceback
            traceback.print_exc()
            return {}
    
    def _parse_extracted_text(self, text: str, ocr_results: list) -> Dict[str, Any]:
        """Parse OCR results to extract structured data"""
        extracted = {}
        text_lower = text.lower()
        
        # Try to extract common fields
        import re
        
        # Name patterns
        name_patterns = [
            r'name[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
            r'full name[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)'
        ]
        for pattern in name_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                extracted['name'] = match.group(1).strip()
                break
        
        # Date of birth patterns
        dob_patterns = [
            r'date of birth[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})',
            r'dob[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})',
            r'born[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})'
        ]
        for pattern in dob_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                extracted['dob'] = match.group(1).strip()
                break
        
        # Document number patterns
        doc_patterns = [
            r'passport[:\s]+no[\.]?[:\s]+([A-Z0-9]+)',
            r'document[:\s]+no[\.]?[:\s]+([A-Z0-9]+)',
            r'number[:\s]+([A-Z0-9]{6,})'
        ]
        for pattern in doc_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                extracted['documentNumber'] = match.group(1).strip()
                break
        
        # Address patterns (simplified)
        address_patterns = [
            r'address[:\s]+(.+?)(?:date|dob|born|name|number)',
            r'residence[:\s]+(.+?)(?:date|dob|born|name|number)'
        ]
        for pattern in address_patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                extracted['address'] = match.group(1).strip()[:100]  # Limit length
                break
        
        # Nationality
        if 'united states' in text_lower or 'usa' in text_lower or 'u.s.a' in text_lower:
            extracted['nationality'] = 'United States'
        elif 'united kingdom' in text_lower or 'uk' in text_lower:
            extracted['nationality'] = 'United Kingdom'
        
        return extracted
    
    def _simple_extraction(self, image_path: str) -> Dict[str, Any]:
        """Simple extraction fallback when OCR is not available"""
        # Return empty dict - actual implementation would use basic image processing
        return {}
    
    def calculate_face_match(
        self,
        document_image_path: str,
        selfie_image_path: str,
        use_insightface: bool = True
    ) -> float:
        """
        Calculate face match score between document and selfie
        Uses InsightFace (preferred) or DeepFace as fallback
        """
        try:
            # Try InsightFace first (more accurate)
            if use_insightface:
                try:
                    from insightface import app as insightface_app
                    from insightface.model_zoo import model_zoo
                    import onnxruntime as ort
                    
                    # Initialize InsightFace model
                    model_path = 'buffalo_l'  # or 'buffalo_s', 'buffalo_m'
                    try:
                        model = insightface_app.FaceAnalysis(name=model_path, providers=['CPUExecutionProvider'])
                        model.prepare(ctx_id=-1, det_size=(640, 640))
                        
                        # Extract embeddings
                        doc_faces = model.get(document_image_path)
                        selfie_faces = model.get(selfie_image_path)
                        
                        if doc_faces and selfie_faces and len(doc_faces) > 0 and len(selfie_faces) > 0:
                            # Get first face from each
                            doc_embedding = doc_faces[0].embedding
                            selfie_embedding = selfie_faces[0].embedding
                            
                            # Calculate cosine similarity
                            import numpy as np
                            dot_product = np.dot(doc_embedding, selfie_embedding)
                            norm1 = np.linalg.norm(doc_embedding)
                            norm2 = np.linalg.norm(selfie_embedding)
                            
                            if norm1 > 0 and norm2 > 0:
                                similarity = dot_product / (norm1 * norm2)
                                # InsightFace similarity is already 0-1, higher is better
                                return float(max(0, min(1, similarity)))
                    except Exception as e:
                        print(f"InsightFace not available, falling back to DeepFace: {e}")
                        use_insightface = False
                except ImportError:
                    print("InsightFace not installed, using DeepFace")
                    use_insightface = False
            
            # Fallback to DeepFace
            from deepface import DeepFace
            
            # Verify faces using DeepFace
            # DeepFace.verify returns: {'verified': bool, 'distance': float, 'threshold': float, 'model': str, 'detector_backend': str, 'similarity_metric': str}
            result = DeepFace.verify(
                img1_path=document_image_path,
                img2_path=selfie_image_path,
                model_name='VGG-Face',  # or 'Facenet', 'OpenFace', 'DeepFace', 'ArcFace'
                detector_backend='opencv',  # or 'ssd', 'dlib', 'mtcnn', 'retinaface'
                enforce_detection=True,
                distance_metric='cosine'
            )
            
            # DeepFace returns distance (lower is better) and verified boolean
            # Convert distance to similarity score (0-1)
            # Typical threshold is around 0.4 for cosine distance
            distance = result.get('distance', 1.0)
            verified = result.get('verified', False)
            
            # Convert distance to similarity score
            # distance of 0.4 = ~0.5 similarity, 0.0 = 1.0 similarity
            similarity = max(0, 1 - (distance / 0.4))
            
            # If verified is True, ensure similarity is at least 0.7
            if verified and similarity < 0.7:
                similarity = 0.7
            
            return float(similarity)
        except Exception as e:
            print(f"Face matching error: {e}")
            import traceback
            traceback.print_exc()
            # Return a low score if face matching fails
            return 0.0
    
    def calculate_image_quality(self, image_path: str) -> float:
        """Calculate image quality score (0-1)"""
        try:
            if not os.path.exists(image_path):
                image_path = image_path.lstrip('/')
                if os.path.exists(image_path):
                    image_path = os.path.abspath(image_path)
                else:
                    return 0.5  # Default quality
            
            img = cv2.imread(image_path)
            if img is None:
                return 0.5
            
            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Calculate Laplacian variance (measure of sharpness)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            # Normalize to 0-1 range (typical good images have > 100)
            quality_score = min(1.0, laplacian_var / 200.0)
            
            return float(quality_score)
        except Exception as e:
            print(f"Image quality calculation error: {e}")
            return 0.8  # Default quality


# Global instance
document_service = DocumentProcessingService()

