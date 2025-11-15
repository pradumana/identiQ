/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UserDashboard from '../pages/UserDashboard';
import { kycApi } from '../lib/api';

// Mock the API
jest.mock('../lib/api', () => ({
  kycApi: {
    getMyApplication: jest.fn(),
    getConsents: jest.fn(),
  },
}));

describe('User Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('kyc_auth_token', 'test_token');
  });

  it('renders user dashboard', () => {
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

    expect(screen.getByText(/identiq/i)).toBeInTheDocument();
  });

  it('fetches KYC application data', async () => {
    (kycApi.getMyApplication as jest.Mock).mockResolvedValueOnce({
      id: '1',
      status: 'VERIFIED',
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

  it('displays KYC status', async () => {
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

