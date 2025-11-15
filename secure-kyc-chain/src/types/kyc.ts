export type UserRole = 'user' | 'reviewer' | 'admin' | 'institution';

export type KYCStatus = 
  | 'DRAFT' 
  | 'REGISTERED'
  | 'UPLOADED' 
  | 'PROCESSING'
  | 'IN_REVIEW' 
  | 'VERIFIED'  // UKN issued
  | 'APPROVED'  // Legacy - use VERIFIED
  | 'REJECTED'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'REQUEST_INFO';

export type DocumentType = 
  | 'PASSPORT'
  | 'DRIVERS_LICENSE'
  | 'NATIONAL_ID'
  | 'SELFIE';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface ExtractedData {
  name?: string;
  dob?: string;
  address?: string;
  documentNumber?: string;
  expiryDate?: string;
  nationality?: string;
}

export interface Document {
  id: string;
  kyc_id: string;
  doc_type: DocumentType;
  file_path: string;
  file_hash: string;
  extracted_data: ExtractedData;
  verified: boolean;
  uploaded_at: string;
}

export interface ShapFeature {
  feature: string;
  shap_value: number;
  feature_value: string | number;
}

export interface Verification {
  id: string;
  kyc_id: string;
  event_type: string;
  details: Record<string, any>;
  performed_by: string;
  timestamp: string;
  tx_hash?: string;
}

export interface KYCApplication {
  id: string;
  user_id: string;
  user_email?: string;
  ukn?: string;  // Unique KYC Number
  status: KYCStatus;
  risk_score: number | null;
  shap_explanation?: ShapFeature[];
  created_at: string;
  updated_at: string;
  documents: Document[];
  verifications: Verification[];
  face_match_score?: number;
  reviewer_comment?: string;
  blockchain_tx_hash?: string;
  verified_at?: string;
  expires_at?: string;
}

export interface AuditRecord {
  id: string;
  entity_type: string;
  entity_id: string;
  event_hash: string;
  tx_hash: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface RiskMetrics {
  total_applications: number;
  auto_approved: number;
  manual_reviews: number;
  rejected: number;
  avg_risk_score: number;
  avg_processing_time: number;
}
