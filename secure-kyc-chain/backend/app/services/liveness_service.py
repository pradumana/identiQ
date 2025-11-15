"""Liveness Detection Service using Eye Blink Detection"""
import cv2
import numpy as np
from typing import Dict, Any, Optional, Tuple
import dlib
import os

class LivenessService:
    """
    Service for detecting liveness in selfie videos/images
    Uses eye blink detection to ensure the person is alive
    """
    
    def __init__(self):
        # Initialize dlib's face detector and facial landmark predictor
        self.detector = None
        self.predictor = None
        self._initialize_detectors()
    
    def _initialize_detectors(self):
        """Initialize dlib face detector and landmark predictor"""
        try:
            self.detector = dlib.get_frontal_face_detector()
            
            # Try to load the shape predictor model
            # You need to download shape_predictor_68_face_landmarks.dat
            predictor_path = os.path.join(os.path.dirname(__file__), "shape_predictor_68_face_landmarks.dat")
            
            if os.path.exists(predictor_path):
                self.predictor = dlib.shape_predictor(predictor_path)
            else:
                # Fallback: use OpenCV's face detector
                print("Warning: dlib shape predictor not found. Using OpenCV fallback.")
                self.predictor = None
        except Exception as e:
            print(f"Warning: Could not initialize dlib detectors: {e}")
            self.detector = None
            self.predictor = None
    
    def detect_eye_blink(self, image_path: str) -> Dict[str, Any]:
        """
        Detect eye blink in a single image
        Returns: {
            'blink_detected': bool,
            'eye_aspect_ratio': float,
            'confidence': float,
            'face_detected': bool
        }
        """
        try:
            # Read image
            if not os.path.exists(image_path):
                image_path = image_path.lstrip('/')
                if not os.path.exists(image_path):
                    return {
                        'blink_detected': False,
                        'eye_aspect_ratio': 0.0,
                        'confidence': 0.0,
                        'face_detected': False,
                        'error': 'Image file not found'
                    }
            
            image = cv2.imread(image_path)
            if image is None:
                return {
                    'blink_detected': False,
                    'eye_aspect_ratio': 0.0,
                    'confidence': 0.0,
                    'face_detected': False,
                    'error': 'Could not read image'
                }
            
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Detect face
            if self.detector and self.predictor:
                # Use dlib for more accurate detection
                faces = self.detector(gray)
                if len(faces) == 0:
                    return {
                        'blink_detected': False,
                        'eye_aspect_ratio': 0.0,
                        'confidence': 0.0,
                        'face_detected': False,
                        'error': 'No face detected'
                    }
                
                face = faces[0]
                landmarks = self.predictor(gray, face)
                
                # Extract eye landmarks (indices for 68-point model)
                # Left eye: 36-41, Right eye: 42-47
                left_eye_points = [(landmarks.part(i).x, landmarks.part(i).y) for i in range(36, 42)]
                right_eye_points = [(landmarks.part(i).x, landmarks.part(i).y) for i in range(42, 48)]
                
                # Calculate Eye Aspect Ratio (EAR)
                left_ear = self._calculate_ear(left_eye_points)
                right_ear = self._calculate_ear(right_eye_points)
                ear = (left_ear + right_ear) / 2.0
                
                # EAR threshold: below 0.25 typically indicates closed eyes (blink)
                blink_threshold = 0.25
                is_blinking = ear < blink_threshold
                
                return {
                    'blink_detected': is_blinking,
                    'eye_aspect_ratio': float(ear),
                    'confidence': 0.9 if is_blinking else 0.7,
                    'face_detected': True,
                    'left_ear': float(left_ear),
                    'right_ear': float(right_ear)
                }
            else:
                # Fallback: Use OpenCV's Haar Cascade
                face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
                eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
                
                faces = face_cascade.detectMultiScale(gray, 1.3, 5)
                if len(faces) == 0:
                    return {
                        'blink_detected': False,
                        'eye_aspect_ratio': 0.0,
                        'confidence': 0.0,
                        'face_detected': False,
                        'error': 'No face detected (OpenCV fallback)'
                    }
                
                # For OpenCV fallback, we can't calculate precise EAR
                # So we check if eyes are detected
                for (x, y, w, h) in faces:
                    roi_gray = gray[y:y+h, x:x+w]
                    eyes = eye_cascade.detectMultiScale(roi_gray)
                    
                    # If eyes are detected, assume eyes are open
                    # If no eyes detected, might be blinking (less reliable)
                    eyes_detected = len(eyes) >= 1
                    
                    return {
                        'blink_detected': not eyes_detected,
                        'eye_aspect_ratio': 0.3 if eyes_detected else 0.15,
                        'confidence': 0.6,  # Lower confidence for fallback
                        'face_detected': True,
                        'method': 'opencv_fallback'
                    }
        except Exception as e:
            print(f"Eye blink detection error: {e}")
            import traceback
            traceback.print_exc()
            return {
                'blink_detected': False,
                'eye_aspect_ratio': 0.0,
                'confidence': 0.0,
                'face_detected': False,
                'error': str(e)
            }
    
    def _calculate_ear(self, eye_points: list) -> float:
        """Calculate Eye Aspect Ratio (EAR)"""
        # Convert to numpy array
        points = np.array(eye_points)
        
        # Calculate distances
        # Vertical distances
        v1 = np.linalg.norm(points[1] - points[5])
        v2 = np.linalg.norm(points[2] - points[4])
        
        # Horizontal distance
        h = np.linalg.norm(points[0] - points[3])
        
        # EAR formula
        if h == 0:
            return 0.0
        ear = (v1 + v2) / (2.0 * h)
        
        return ear
    
    def detect_liveness_from_video(self, video_path: str) -> Dict[str, Any]:
        """
        Detect liveness from video by checking for eye blinks
        Returns: {
            'is_live': bool,
            'blink_count': int,
            'confidence': float,
            'frames_analyzed': int
        }
        """
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                return {
                    'is_live': False,
                    'blink_count': 0,
                    'confidence': 0.0,
                    'frames_analyzed': 0,
                    'error': 'Could not open video'
                }
            
            blink_count = 0
            frames_analyzed = 0
            consecutive_closed = 0
            was_blinking = False
            
            # Process video frames
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                frames_analyzed += 1
                
                # Save frame temporarily
                temp_frame_path = f"/tmp/frame_{frames_analyzed}.jpg"
                cv2.imwrite(temp_frame_path, frame)
                
                # Detect blink in this frame
                blink_result = self.detect_eye_blink(temp_frame_path)
                
                if blink_result.get('blink_detected'):
                    if not was_blinking:
                        # New blink detected
                        blink_count += 1
                        was_blinking = True
                    consecutive_closed += 1
                else:
                    was_blinking = False
                    consecutive_closed = 0
                
                # Clean up temp file
                if os.path.exists(temp_frame_path):
                    os.remove(temp_frame_path)
                
                # Limit frames to analyze (for performance)
                if frames_analyzed >= 30:  # Analyze first 30 frames
                    break
            
            cap.release()
            
            # Determine liveness: at least 1 blink detected
            is_live = blink_count >= 1
            confidence = min(1.0, blink_count / 2.0)  # More blinks = higher confidence
            
            return {
                'is_live': is_live,
                'blink_count': blink_count,
                'confidence': float(confidence),
                'frames_analyzed': frames_analyzed
            }
        except Exception as e:
            print(f"Video liveness detection error: {e}")
            return {
                'is_live': False,
                'blink_count': 0,
                'confidence': 0.0,
                'frames_analyzed': 0,
                'error': str(e)
            }
    
    def auto_capture_on_blink(self, video_path: str) -> Optional[str]:
        """
        Automatically capture photo when eye blink is detected
        Returns path to captured image or None
        """
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                return None
            
            frames_analyzed = 0
            best_frame = None
            best_ear = 0.0  # Higher EAR = eyes more open (better for photo)
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                frames_analyzed += 1
                
                # Save frame temporarily
                temp_frame_path = f"/tmp/frame_{frames_analyzed}.jpg"
                cv2.imwrite(temp_frame_path, frame)
                
                # Detect blink in this frame
                blink_result = self.detect_eye_blink(temp_frame_path)
                
                if blink_result.get('face_detected'):
                    ear = blink_result.get('eye_aspect_ratio', 0.0)
                    # If eyes are open (high EAR) and not blinking, this is a good frame
                    if ear > 0.3 and not blink_result.get('blink_detected'):
                        if ear > best_ear:
                            best_ear = ear
                            best_frame = frame.copy()
                
                # Clean up temp file
                if os.path.exists(temp_frame_path):
                    os.remove(temp_frame_path)
                
                # Limit frames to analyze
                if frames_analyzed >= 30:
                    break
            
            cap.release()
            
            # Save best frame
            if best_frame is not None:
                output_path = video_path.replace('.mp4', '_captured.jpg').replace('.mov', '_captured.jpg')
                cv2.imwrite(output_path, best_frame)
                return output_path
            
            return None
        except Exception as e:
            print(f"Auto capture error: {e}")
            return None


# Singleton instance
liveness_service = LivenessService()

