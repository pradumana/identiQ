import numpy as np
from typing import List, Dict, Any, Optional
import pickle
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import shap

from app.schemas.kyc import ShapFeature


class MLRiskScoringService:
    """ML service for risk scoring with SHAP explanations"""
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.explainer = None
        self.feature_names = [
            'face_match_confidence',
            'document_age_years',
            'address_verification_score',
            'transaction_history_risk',
            'id_quality_score',
            'document_type_risk',
            'extraction_confidence',
            'name_match_score'
        ]
        self._initialize_model()
    
    def _initialize_model(self):
        """Initialize or load the ML model"""
        model_path = "app/services/risk_model.pkl"
        
        if os.path.exists(model_path):
            # Load existing model
            with open(model_path, 'rb') as f:
                self.model = pickle.load(f)
        else:
            # Train a new model with synthetic data
            self._train_model()
            # Save the model
            os.makedirs(os.path.dirname(model_path), exist_ok=True)
            with open(model_path, 'wb') as f:
                pickle.dump(self.model, f)
        
        # Create SHAP explainer
        # Use TreeExplainer for RandomForest
        self.explainer = shap.TreeExplainer(self.model)
    
    def _train_model(self):
        """Train the risk scoring model with synthetic data"""
        # Generate synthetic training data
        np.random.seed(42)
        n_samples = 1000
        
        # Generate features
        X = np.random.rand(n_samples, len(self.feature_names))
        
        # Simulate risk scores (higher values = higher risk)
        # Face match confidence (inverted: lower = higher risk)
        X[:, 0] = np.random.uniform(0.5, 1.0, n_samples)
        
        # Document age in years (higher = higher risk)
        X[:, 1] = np.random.exponential(2, n_samples)
        
        # Address verification (0 = failed, 0.5 = partial, 1 = verified)
        X[:, 2] = np.random.choice([0, 0.5, 1], n_samples)
        
        # Transaction history risk (0-1 scale)
        X[:, 3] = np.random.beta(2, 5, n_samples)
        
        # ID quality score (0-1, higher = better)
        X[:, 4] = np.random.uniform(0.6, 1.0, n_samples)
        
        # Document type risk (passport=0.1, license=0.3, national_id=0.5)
        X[:, 5] = np.random.choice([0.1, 0.3, 0.5], n_samples)
        
        # Extraction confidence
        X[:, 6] = np.random.uniform(0.7, 1.0, n_samples)
        
        # Name match score
        X[:, 7] = np.random.uniform(0.8, 1.0, n_samples)
        
        # Calculate risk score (target variable)
        # Weighted combination of features
        weights = np.array([-0.3, 0.2, 0.25, 0.35, -0.2, 0.15, -0.1, -0.15])
        y = np.clip(np.dot(X, weights) + np.random.normal(0, 0.1, n_samples), 0, 1)
        
        # Normalize features
        X = self.scaler.fit_transform(X)
        
        # Convert to binary classification for demonstration
        y_binary = (y > 0.5).astype(int)
        
        # Train RandomForest model
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
        self.model.fit(X, y_binary)
    
    def calculate_risk_score(
        self,
        face_match_confidence: float,
        document_age_years: float,
        address_verification_score: float,
        transaction_history_risk: float,
        id_quality_score: float,
        document_type_risk: float,
        extraction_confidence: float,
        name_match_score: float
    ) -> tuple[float, List[ShapFeature]]:
        """
        Calculate risk score and SHAP explanations
        
        Returns:
            Tuple of (risk_score, shap_features)
        """
        # Prepare feature vector
        features = np.array([[
            face_match_confidence,
            document_age_years,
            address_verification_score,
            transaction_history_risk,
            id_quality_score,
            document_type_risk,
            extraction_confidence,
            name_match_score
        ]])
        
        # Normalize features
        features_scaled = self.scaler.transform(features)
        
        # Predict risk score (probability of high risk)
        risk_score = self.model.predict_proba(features_scaled)[0][1]
        
        # Calculate SHAP values
        shap_values = self.explainer.shap_values(features_scaled)[1][0]  # Get values for class 1 (high risk)
        
        # Create SHAP feature list
        shap_features = [
            ShapFeature(
                feature=self.feature_names[i],
                shap_value=float(shap_values[i]),
                feature_value=float(features[0][i])
            )
            for i in range(len(self.feature_names))
        ]
        
        # Sort by absolute SHAP value (most impactful features first)
        shap_features.sort(key=lambda x: abs(x.shap_value), reverse=True)
        
        return float(risk_score), shap_features


# Global instance
ml_service = MLRiskScoringService()

