/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ApplicationDetailPage } from '../pages/admin/ApplicationDetailPage';
import { adminApi } from '../lib/api';

// Mock the API
jest.mock('../lib/api', () => ({
  adminApi: {
    approveApplication: jest.fn(),
    rejectApplication: jest.fn(),
  },
}));

// Mock Zustand store
const { mockStoreState, useKYCStore } = require('./__mocks__/kycStore');
jest.mock('../store/kycStore', () => require('./__mocks__/kycStore'));

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
      documents: [
        { type: 'PAN', url: '/pan.jpg' },
        { type: 'AADHAAR', url: '/aadhaar.jpg' },
      ],
      ocrData: { name: 'John Doe', dob: '1990-01-01' },
    },
  ];
  mockStoreState.approveApplication = mockApproveApplication;
  mockStoreState.rejectApplication = mockRejectApplication;
});

describe('Application Detail Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('kyc_auth_token', 'test_token');
  });

  it('displays applicant information', () => {
    render(
      <MemoryRouter initialEntries={['/admin/application/1']}>
        <Routes>
          <Route path="/admin/application/:id" element={<ApplicationDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/applicant information/i)).toBeInTheDocument();
  });

  it('approve button triggers correct mutation', async () => {
    (adminApi.approveApplication as jest.Mock).mockResolvedValueOnce({});

    render(
      <MemoryRouter initialEntries={['/admin/application/1']}>
        <Routes>
          <Route path="/admin/application/:id" element={<ApplicationDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    const approveButton = screen.getByRole('button', { name: /approve/i });
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mockApproveApplication).toHaveBeenCalled();
    });
  });

  it('reject button triggers correct mutation', async () => {
    (adminApi.rejectApplication as jest.Mock).mockResolvedValueOnce({});

    render(
      <MemoryRouter initialEntries={['/admin/application/1']}>
        <Routes>
          <Route path="/admin/application/:id" element={<ApplicationDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    const rejectButton = screen.getByRole('button', { name: /reject/i });
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(mockRejectApplication).toHaveBeenCalled();
    });
  });
});

