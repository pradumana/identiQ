/**
 * Integration tests for Frontend-Backend API communication
 * Tests that frontend API client correctly calls backend endpoints
 */

import { authApi, adminApi, kycApi, institutionApi } from '../lib/api';

// Mock fetch globally
global.fetch = jest.fn();

describe('Frontend-Backend API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Authentication API Integration', () => {
    it('login calls POST /api/v1/auth/login with correct payload', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: true,
          access_token: 'test_token',
          user: { id: '1', email: 'admin@identiq.com', role: 'admin' },
        }),
      });

      await authApi.login('admin@identiq.com', 'admin123');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'admin@identiq.com', password: 'admin123' }),
        })
      );
    });

    it('register calls POST /api/v1/auth/register with correct payload', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: '1', email: 'user@example.com', role: 'user' }),
      });

      await authApi.register('user@example.com', 'password123', 'user');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/register'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'user@example.com', password: 'password123', role: 'user' }),
        })
      );
    });

    it('getMe calls GET /api/v1/auth/me with Authorization header', async () => {
      localStorage.setItem('kyc_auth_token', 'test_token');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: '1', email: 'admin@identiq.com', role: 'admin' }),
      });

      await authApi.getMe();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/me'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test_token',
          }),
        })
      );
    });
  });

  describe('Admin API Integration', () => {
    beforeEach(() => {
      localStorage.setItem('kyc_auth_token', 'admin_token');
    });

    it('getApplications calls GET /api/v1/admin/applications', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => [
          { id: '1', status: 'VERIFIED', risk_score: 0.15 },
        ],
      });

      await adminApi.getApplications();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/admin/applications'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer admin_token',
          }),
        })
      );
    });

    it('getMetrics calls GET /api/v1/admin/metrics', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          total_applications: 100,
          auto_approved: 50,
          manual_reviews: 30,
          rejected: 20,
        }),
      });

      await adminApi.getMetrics();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/admin/metrics'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('approveApplication calls POST /api/v1/admin/applications/{id}/approve with JSON body', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: '1', status: 'VERIFIED' }),
      });

      await adminApi.approveApplication('app-123', 'Approved by admin');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/admin/applications/app-123/approve'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ comment: 'Approved by admin' }),
        })
      );
    });

    it('rejectApplication calls POST /api/v1/admin/applications/{id}/reject with JSON body', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: '1', status: 'REJECTED' }),
      });

      await adminApi.rejectApplication('app-123', 'Invalid documents');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/admin/applications/app-123/reject'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ comment: 'Invalid documents' }),
        })
      );
    });
  });

  describe('KYC User API Integration', () => {
    beforeEach(() => {
      localStorage.setItem('kyc_auth_token', 'user_token');
    });

    it('getMyApplication calls GET /api/v1/kyc/applications/me', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: '1', status: 'VERIFIED', ukn: 'KYC-1234-5678-9012' }),
      });

      await kycApi.getMyApplication();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/kyc/applications/me'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('uploadDocument calls POST /api/v1/kyc/documents/upload with FormData', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: 'doc-1', doc_type: 'PASSPORT' }),
      });

      await kycApi.uploadDocument(file, 'PASSPORT');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/kyc/documents/upload'),
        expect.objectContaining({
          method: 'POST',
        })
      );

      // Verify FormData was used (Content-Type should not be set)
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const headers = callArgs[1].headers;
      expect(headers['Content-Type']).toBeUndefined();
    });
  });

  describe('Institution API Integration', () => {
    beforeEach(() => {
      localStorage.setItem('kyc_auth_token', 'institution_token');
    });

    it('resolveKyc calls GET /api/v1/institution/resolve-kyc/{ukn} with purpose query', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          ukn: 'KYC-1234-5678-9012',
          status: 'VERIFIED',
          verified_name: 'John Doe',
        }),
      });

      await institutionApi.resolveKyc('KYC-1234-5678-9012', 'bank_account');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/institution/resolve-kyc/KYC-1234-5678-9012'),
        expect.objectContaining({
          method: 'GET',
        })
      );

      // Check URL contains purpose parameter
      const url = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(url).toContain('purpose=bank_account');
    });

    it('requestConsent calls POST /api/v1/institution/request-consent/{ukn} with purpose', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          message: 'Consent request created',
          consent_id: 'consent-1',
        }),
      });

      await institutionApi.requestConsent('KYC-1234-5678-9012', 'loan_application');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/institution/request-consent/KYC-1234-5678-9012'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('Error Handling Integration', () => {
    it('handles 401 Unauthorized error correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ detail: 'Invalid credentials' }),
      });

      await expect(authApi.login('wrong@email.com', 'wrongpass')).rejects.toThrow();
    });

    it('handles 404 Not Found error correctly', async () => {
      localStorage.setItem('kyc_auth_token', 'token');
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ detail: 'UKN not found' }),
      });

      await expect(institutionApi.resolveKyc('KYC-9999-9999-9999', 'test')).rejects.toThrow();
    });

    it('handles network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(authApi.login('test@example.com', 'pass')).rejects.toThrow();
    });
  });

  describe('End-to-End Workflow Simulation', () => {
    it('simulates complete workflow: login → fetch applications → approve', async () => {
      // Step 1: Login
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          success: true,
          access_token: 'workflow_token',
          user: { id: '1', email: 'admin@identiq.com', role: 'admin' },
        }),
      });

      const loginResult = await authApi.login('admin@identiq.com', 'admin123');
      expect(loginResult).toHaveProperty('access_token');
      // Note: authApi.login may not set localStorage directly - it's handled by the auth module
      // The important part is that the API call was made correctly

      // Step 2: Fetch applications
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => [
          { id: 'app-1', status: 'IN_REVIEW', risk_score: 0.5 },
        ],
      });

      const applications = await adminApi.getApplications();
      expect(applications).toBeInstanceOf(Array);

      // Step 3: Approve application
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          id: 'app-1',
          status: 'VERIFIED',
          ukn: 'KYC-1234-5678-9012',
        }),
      });

      const approved = await adminApi.approveApplication('app-1', 'Approved in workflow test');
      expect(approved).toHaveProperty('status', 'VERIFIED');
      expect(approved).toHaveProperty('ukn');

      // Verify all API calls were made
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });
});

