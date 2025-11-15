// Get API base URL - Vite replaces import.meta.env at build time
// For Jest tests, we'll use a fallback via globalThis
let API_BASE_URL = 'http://localhost:8000/api/v1';

if (typeof globalThis !== 'undefined' && (globalThis as any).__API_BASE_URL__) {
  API_BASE_URL = (globalThis as any).__API_BASE_URL__;
} else if (typeof window !== 'undefined' && (window as any).__API_BASE_URL__) {
  API_BASE_URL = (window as any).__API_BASE_URL__;
} else {
  // @ts-expect-error - import.meta is a Vite feature, replaced at build time
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const envUrl = import.meta.env?.VITE_API_BASE_URL;
  if (envUrl) {
    API_BASE_URL = envUrl;
  }
}

export interface ApiError {
  detail?: string;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('kyc_auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Remove Content-Type for FormData (multipart/form-data)
    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      });
    } catch (fetchError: any) {
      // Network error - backend not available
      const error = new Error('Failed to fetch: Backend server is not running or unreachable');
      (error as any).status = 0;
      (error as any).isNetworkError = true;
      throw error;
    }

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        detail: `HTTP ${response.status}: ${response.statusText}`,
      }));
      
      // Include status code in error message for better error handling
      const errorMessage = errorData.detail || errorData.error || errorData.message || 'Request failed';
      const error = new Error(`${response.status} ${errorMessage}`);
      (error as any).status = response.status;
      throw error;
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    
    return response.text() as unknown as T;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// Auth API
export const authApi = {
  register: async (email: string, password: string, role: string = 'user') => {
    return apiClient.post('/auth/register', { email, password, role });
  },
  login: async (email: string, password: string) => {
    return apiClient.post('/auth/login', { email, password });
  },
  getMe: async () => {
    return apiClient.get('/auth/me');
  },
};

// KYC API
export const kycApi = {
  getMyApplication: async () => {
    return apiClient.get('/kyc/applications/me');
  },
  uploadDocument: async (file: File, docType: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);
    return apiClient.post('/kyc/documents/upload', formData);
  },
  processApplication: async () => {
    return apiClient.post('/kyc/process');
  },
  getDocuments: async () => {
    return apiClient.get('/kyc/documents');
  },
  getConsents: async () => {
    return apiClient.get('/kyc/consents');
  },
  grantConsent: async (consentId: string) => {
    return apiClient.post(`/kyc/consents/${consentId}/grant`);
  },
  revokeConsent: async (consentId: string) => {
    return apiClient.post(`/kyc/consents/${consentId}/revoke`);
  },
};

// Admin API
export const adminApi = {
  getApplications: async () => {
    return apiClient.get('/admin/applications');
  },
  getApplicationById: async (id: string) => {
    return apiClient.get(`/admin/applications/${id}`);
  },
  getReviewQueue: async () => {
    return apiClient.get('/admin/applications/review-queue');
  },
  getMetrics: async () => {
    return apiClient.get('/admin/metrics');
  },
  getAuditTrail: async () => {
    return apiClient.get('/admin/audit-trail');
  },
  approveApplication: async (applicationId: string, comment?: string) => {
    return apiClient.post(`/admin/applications/${applicationId}/approve`, { comment });
  },
  rejectApplication: async (applicationId: string, comment: string) => {
    return apiClient.post(`/admin/applications/${applicationId}/reject`, { comment });
  },
  getFaceDedupeQueue: async () => {
    return apiClient.get('/admin/face-dedupe-queue');
  },
  getBlockchainRecords: async (skip = 0, limit = 100) => {
    return apiClient.get(`/admin/blockchain-records?skip=${skip}&limit=${limit}`);
  },
  getBlockchainRecordByUkn: async (ukn: string) => {
    return apiClient.get(`/admin/blockchain-records/${ukn}`);
  },
  createUser: async (email: string, password: string, role: string) => {
    return apiClient.post('/admin/users', { email, password, role });
  },
  listUsers: async (roleFilter?: string) => {
    const url = roleFilter ? `/admin/users?role_filter=${roleFilter}` : '/admin/users';
    return apiClient.get(url);
  },
  deleteUser: async (userId: string) => {
    return apiClient.delete(`/admin/users/${userId}`);
  },
};

// Institution API
export const institutionApi = {
  resolveKyc: async (ukn: string, purpose: string = 'general_verification') => {
    return apiClient.get(`/institution/resolve-kyc/${ukn}?purpose=${purpose}`);
  },
  requestConsent: async (ukn: string, purpose: string) => {
    return apiClient.post(`/institution/request-consent/${ukn}?purpose=${purpose}`);
  },
  validateConsent: async (ukn: string, purpose: string) => {
    return apiClient.get(`/institution/validate-consent/${ukn}?purpose=${purpose}`);
  },
};

