// Mock Zustand store for all tests
export const mockStoreState = {
  applications: [],
  loading: false,
  error: null,
  fetchApplications: jest.fn(),
  setApplications: jest.fn(),
  updateApplication: jest.fn(),
  approveApplication: jest.fn(),
  rejectApplication: jest.fn(),
  settings: {
    darkMode: false,
    notifications: {
      fraudAlerts: true,
      autoApprovalAlerts: true,
      reviewQueueAlerts: true,
    },
    profile: {
      name: 'Test User',
      email: 'test@example.com',
    },
  },
  setDarkMode: jest.fn(),
  updateNotificationSettings: jest.fn(),
  updateProfile: jest.fn(),
};

export const useKYCStore = jest.fn((selector?: any) => {
  if (typeof selector === 'function') {
    return selector(mockStoreState);
  }
  return mockStoreState;
});

