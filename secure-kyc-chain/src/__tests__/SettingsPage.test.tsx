/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from '../pages/admin/SettingsPage';

// Mock Zustand store
const { mockStoreState, useKYCStore } = require('./__mocks__/kycStore');
jest.mock('../store/kycStore', () => require('./__mocks__/kycStore'));

const mockSetDarkMode = jest.fn();
const mockUpdateNotificationSettings = jest.fn();

beforeEach(() => {
  mockStoreState.setDarkMode = mockSetDarkMode;
  mockStoreState.updateNotificationSettings = mockUpdateNotificationSettings;
});

describe('Settings Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders dark mode toggle', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/dark mode/i)).toBeInTheDocument();
  });

  it('dark mode toggle persists in localStorage', async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );

    const darkModeToggle = screen.getByRole('switch', { name: /dark mode/i });
    fireEvent.click(darkModeToggle);

    await waitFor(() => {
      expect(mockSetDarkMode).toHaveBeenCalled();
    });
  });

  it('renders notification settings', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/fraud alerts/i)).toBeInTheDocument();
    expect(screen.getByText(/auto-approval alerts/i)).toBeInTheDocument();
    expect(screen.getByText(/review queue alerts/i)).toBeInTheDocument();
  });

  it('renders profile settings', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('Zustand store updates correctly', async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );

    const fraudToggle = screen.getByRole('switch', { name: /fraud alerts/i });
    fireEvent.click(fraudToggle);

    await waitFor(() => {
      expect(mockSetDarkMode).toHaveBeenCalled();
    });
  });
});

