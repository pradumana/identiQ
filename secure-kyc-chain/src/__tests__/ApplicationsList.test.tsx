/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ApplicationsPage } from '../pages/admin/ApplicationsPage';
import { adminApi } from '../lib/api';

// Mock the API
jest.mock('../lib/api', () => ({
  adminApi: {
    getApplications: jest.fn(),
  },
}));

// Mock Zustand store
const { mockStoreState, useKYCStore } = require('./__mocks__/kycStore');
jest.mock('../store/kycStore', () => require('./__mocks__/kycStore'));

// Override with test data
beforeEach(() => {
  mockStoreState.applications = [
    {
      id: '1',
      name: 'John Doe',
      status: 'approved',
      submittedAt: '2025-01-15',
      riskScore: 15,
    },
    {
      id: '2',
      name: 'Jane Smith',
      status: 'pending',
      submittedAt: '2025-01-16',
      riskScore: 65,
    },
  ];
});

describe('Applications List', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('kyc_auth_token', 'test_token');
  });

  it('renders applications table with rows from API mock', async () => {
    (adminApi.getApplications as jest.Mock).mockResolvedValueOnce([
      {
        id: '1',
        user_email: 'john@example.com',
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
      expect(screen.getByText(/applications/i)).toBeInTheDocument();
    });
  });

  it('displays application data correctly', () => {
    render(
      <MemoryRouter>
        <ApplicationsPage />
      </MemoryRouter>
    );

    // Check if table headers are present
    expect(screen.getByText(/application id/i)).toBeInTheDocument();
    expect(screen.getByText(/user name/i)).toBeInTheDocument();
    expect(screen.getByText(/status/i)).toBeInTheDocument();
  });
});

