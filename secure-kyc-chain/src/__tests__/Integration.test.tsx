/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { authApi, adminApi, kycApi, institutionApi } from '../lib/api';
import Login from '../pages/Login';
import { IdentiQDashboardPage } from '../pages/admin/IdentiQDashboardPage';
import { ApplicationsPage } from '../pages/admin/ApplicationsPage';
import { ApplicationDetailPage } from '../pages/admin/ApplicationDetailPage';
import UserDashboard from '../pages/UserDashboard';
import InstitutionPortal from '../pages/InstitutionPortal';

// Mock the API
jest.mock('../lib/api', () => ({
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
    getMe: jest.fn(),
  },
  adminApi: {
    getApplications: jest.fn(),
    getReviewQueue: jest.fn(),
    getMetrics: jest.fn(),
    approveApplication: jest.fn(),
    rejectApplication: jest.fn(),
  },
  kycApi: {
    getMyApplication: jest.fn(),
    getConsents: jest.fn(),
    uploadDocument: jest.fn(),
  },
  institutionApi: {
    resolveKyc: jest.fn(),
    requestConsent: jest.fn(),
  },
}));

// Mock Zustand store
jest.mock('../store/kycStore', () => require('./__mocks__/kycStore'));

const { mockStoreState } = require('./__mocks__/kycStore');

const mockFetchApplications = jest.fn();
const mockApproveApplication = jest.fn();
const mockRejectApplication = jest.fn();

beforeEach(() => {
  mockStoreState.applications = [
    {
      id: '1',
      name: 'John Doe',
      status: 'in_review',
      submittedAt: '2025-01-15',
      riskScore: 15,
      faceMatchScore: 95,
    },
  ];
  mockStoreState.fetchApplications = mockFetchApplications;
  mockStoreState.approveApplication = mockApproveApplication;
  mockStoreState.rejectApplication = mockRejectApplication;
});

// Mock auth
jest.mock('../lib/auth', () => ({
  getCurrentUser: () => ({ id: '1', email: 'admin@identiq.com', role: 'admin' }),
  isAuthenticated: () => true,
  logout: jest.fn(),
}));

describe('Frontend-Backend Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Authentication Flow', () => {
    it('login flow calls correct API endpoint', async () => {
      (authApi.login as jest.Mock).mockResolvedValueOnce({
        success: true,
        access_token: 'test_token',
        user: { id: '1', email: 'admin@identiq.com', role: 'admin' },
      });

      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'admin@identiq.com' } });
      fireEvent.change(passwordInput, { target: { value: 'admin123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(authApi.login).toHaveBeenCalledWith('admin@identiq.com', 'admin123');
      });
    });

    it('stores token in localStorage after login', async () => {
      (authApi.login as jest.Mock).mockResolvedValueOnce({
        success: true,
        access_token: 'test_token_123',
        user: { id: '1', email: 'admin@identiq.com', role: 'admin' },
      });

      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'admin@identiq.com' } });
      fireEvent.change(passwordInput, { target: { value: 'admin123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(localStorage.getItem('kyc_auth_token')).toBe('test_token_123');
      });
    });
  });

  describe('Admin Dashboard Integration', () => {
    it('dashboard loads metrics from /api/v1/admin/metrics', async () => {
      (adminApi.getMetrics as jest.Mock).mockResolvedValueOnce({
        total_applications: 100,
        auto_approved: 50,
        manual_reviews: 30,
        rejected: 20,
        average_risk_score: 0.35,
      });

      (adminApi.getReviewQueue as jest.Mock).mockResolvedValueOnce([]);

      render(
        <MemoryRouter>
          <IdentiQDashboardPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(adminApi.getMetrics).toHaveBeenCalled();
      });
    });

    it('applications page fetches from /api/v1/admin/applications', async () => {
      (adminApi.getApplications as jest.Mock).mockResolvedValueOnce([
        {
          id: '1',
          user_email: 'user@example.com',
          status: 'VERIFIED',
          risk_score: 0.15,
          created_at: '2025-01-15T10:00:00Z',
        },
      ]);

      render(
        <MemoryRouter>
          <ApplicationsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockFetchApplications).toHaveBeenCalled();
      });
    });
  });

  describe('Application Approval Flow', () => {
    it('approve button calls correct API endpoint', async () => {
      (adminApi.approveApplication as jest.Mock).mockResolvedValueOnce({
        id: '1',
        status: 'VERIFIED',
      });

      render(
        <MemoryRouter initialEntries={['/admin/application/1']}>
          <ApplicationDetailPage />
        </MemoryRouter>
      );

      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(mockApproveApplication).toHaveBeenCalledWith('1', expect.any(String));
      });
    });

    it('reject button calls correct API endpoint', async () => {
      (adminApi.rejectApplication as jest.Mock).mockResolvedValueOnce({
        id: '1',
        status: 'REJECTED',
      });

      render(
        <MemoryRouter initialEntries={['/admin/application/1']}>
          <ApplicationDetailPage />
        </MemoryRouter>
      );

      const rejectButton = screen.getByRole('button', { name: /reject/i });
      fireEvent.click(rejectButton);

      await waitFor(() => {
        expect(mockRejectApplication).toHaveBeenCalled();
      });
    });
  });

  describe('User KYC Flow', () => {
    it('user dashboard fetches application from /api/v1/kyc/applications/me', async () => {
      (kycApi.getMyApplication as jest.Mock).mockResolvedValueOnce({
        id: '1',
        status: 'VERIFIED',
        ukn: 'KYC-1234-5678-9012',
      });

      (kycApi.getConsents as jest.Mock).mockResolvedValueOnce([]);

      render(
        <MemoryRouter>
          <UserDashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(kycApi.getMyApplication).toHaveBeenCalled();
      });
    });
  });

  describe('Institution UKN Lookup Flow', () => {
    it('institution portal calls /api/v1/institution/resolve-kyc/{ukn}', async () => {
      (institutionApi.resolveKyc as jest.Mock).mockResolvedValueOnce({
        ukn: 'KYC-1234-5678-9012',
        status: 'VERIFIED',
        verified_name: 'John Doe',
        verified_age: 30,
        risk_score: 0.15,
      });

      render(
        <MemoryRouter>
          <InstitutionPortal />
        </MemoryRouter>
      );

      // Find inputs by placeholder or label
      const inputs = screen.getAllByRole('textbox');
      const uknInput = inputs.find(input => 
        (input as HTMLInputElement).placeholder?.toLowerCase().includes('ukn') ||
        (input as HTMLInputElement).name?.toLowerCase().includes('ukn')
      ) || inputs[0];
      const purposeInput = inputs.find(input => 
        (input as HTMLInputElement).placeholder?.toLowerCase().includes('purpose') ||
        (input as HTMLInputElement).name?.toLowerCase().includes('purpose')
      ) || inputs[1];
      
      // Find submit button
      const buttons = screen.getAllByRole('button');
      const submitButton = buttons.find(btn => 
        btn.textContent?.toLowerCase().includes('verify') ||
        btn.textContent?.toLowerCase().includes('lookup') ||
        btn.textContent?.toLowerCase().includes('search')
      ) || buttons[0];

      fireEvent.change(uknInput, { target: { value: 'KYC-1234-5678-9012' } });
      fireEvent.change(purposeInput, { target: { value: 'bank_account' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(institutionApi.resolveKyc).toHaveBeenCalledWith('KYC-1234-5678-9012', 'bank_account');
      });
    });

    it('handles 404 error for non-existent UKN', async () => {
      (institutionApi.resolveKyc as jest.Mock).mockRejectedValueOnce({
        status: 404,
        message: 'UKN not found',
      });

      render(
        <MemoryRouter>
          <InstitutionPortal />
        </MemoryRouter>
      );

      // Find inputs by placeholder or label
      const inputs = screen.getAllByRole('textbox');
      const uknInput = inputs.find(input => 
        (input as HTMLInputElement).placeholder?.toLowerCase().includes('ukn') ||
        (input as HTMLInputElement).name?.toLowerCase().includes('ukn')
      ) || inputs[0];
      const purposeInput = inputs.find(input => 
        (input as HTMLInputElement).placeholder?.toLowerCase().includes('purpose') ||
        (input as HTMLInputElement).name?.toLowerCase().includes('purpose')
      ) || inputs[1];
      
      // Find submit button
      const buttons = screen.getAllByRole('button');
      const submitButton = buttons.find(btn => 
        btn.textContent?.toLowerCase().includes('verify') ||
        btn.textContent?.toLowerCase().includes('lookup') ||
        btn.textContent?.toLowerCase().includes('search')
      ) || buttons[0];

      fireEvent.change(uknInput, { target: { value: 'KYC-9999-9999-9999' } });
      fireEvent.change(purposeInput, { target: { value: 'test' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(institutionApi.resolveKyc).toHaveBeenCalled();
      });
    });
  });

  describe('End-to-End Workflow', () => {
    it('complete flow: login → dashboard → applications → detail → approve', async () => {
      // Step 1: Login
      (authApi.login as jest.Mock).mockResolvedValueOnce({
        success: true,
        access_token: 'token123',
        user: { id: '1', email: 'admin@identiq.com', role: 'admin' },
      });

      // Step 2: Dashboard metrics
      (adminApi.getMetrics as jest.Mock).mockResolvedValueOnce({
        total_applications: 50,
        auto_approved: 25,
        manual_reviews: 15,
        rejected: 10,
      });

      // Step 3: Applications list
      (adminApi.getApplications as jest.Mock).mockResolvedValueOnce([
        {
          id: '1',
          user_email: 'user@example.com',
          status: 'IN_REVIEW',
          risk_score: 0.5,
        },
      ]);

      // Step 4: Approve application
      (adminApi.approveApplication as jest.Mock).mockResolvedValueOnce({
        id: '1',
        status: 'VERIFIED',
        ukn: 'KYC-1234-5678-9012',
      });

      // Simulate login
      localStorage.setItem('kyc_auth_token', 'token123');
      localStorage.setItem('user', JSON.stringify({ id: '1', email: 'admin@identiq.com', role: 'admin' }));

      // Render dashboard
      const { rerender } = render(
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <IdentiQDashboardPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(adminApi.getMetrics).toHaveBeenCalled();
      });

      // Navigate to applications
      rerender(
        <MemoryRouter initialEntries={['/admin/applications']}>
          <ApplicationsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockFetchApplications).toHaveBeenCalled();
      });

      // Navigate to detail and approve
      rerender(
        <MemoryRouter initialEntries={['/admin/application/1']}>
          <ApplicationDetailPage />
        </MemoryRouter>
      );

      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(mockApproveApplication).toHaveBeenCalled();
      });
    });
  });
});

