/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import App from '../App';

// Mock all lazy-loaded components
jest.mock('../pages/Index', () => ({
  __esModule: true,
  default: () => <div>Index Page</div>,
}));

jest.mock('../pages/Login', () => ({
  __esModule: true,
  default: () => <div>Login Page</div>,
}));

jest.mock('../pages/admin/IdentiQDashboardPage', () => ({
  IdentiQDashboardPage: () => <div>Dashboard Page</div>,
}));

jest.mock('../pages/admin/ApplicationsPage', () => ({
  ApplicationsPage: () => <div>Applications Page</div>,
}));

describe('Routing', () => {
  it('renders index page at root', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText('Index Page')).toBeInTheDocument();
  });

  it('renders login page at /login', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders dashboard at /admin/dashboard', () => {
    // Mock authentication
    localStorage.setItem('kyc_auth_token', 'test_token');
    localStorage.setItem('user', JSON.stringify({ role: 'admin' }));
    
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <App />
      </MemoryRouter>
    );
    
    // Should render dashboard (may be wrapped in layout)
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });
});

