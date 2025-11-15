/** @jest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { IdentiQDashboardPage } from '../pages/admin/IdentiQDashboardPage';
import { adminApi } from '../lib/api';

// Mock the API
jest.mock('../lib/api', () => ({
  adminApi: {
    getMetrics: jest.fn(),
    getReviewQueue: jest.fn(),
  },
}));

// Mock Zustand store
jest.mock('../store/kycStore', () => require('./__mocks__/kycStore'));

describe('Admin Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('kyc_auth_token', 'test_token');
    localStorage.setItem('user', JSON.stringify({ role: 'admin' }));
  });

  it('renders dashboard with metrics', async () => {
    (adminApi.getMetrics as jest.Mock).mockResolvedValueOnce({
      total_applications: 100,
      auto_approved: 50,
      manual_reviews: 30,
      rejected: 20,
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

    // Check if dashboard elements are rendered
    expect(screen.getByText(/kyc completion rate/i)).toBeInTheDocument();
  });

  it('loads metrics from /api/v1/admin/metrics', async () => {
    (adminApi.getMetrics as jest.Mock).mockResolvedValueOnce({
      total_applications: 50,
      auto_approved: 25,
      manual_reviews: 15,
      rejected: 10,
    });

    render(
      <MemoryRouter>
        <IdentiQDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(adminApi.getMetrics).toHaveBeenCalled();
    });
  });
});

