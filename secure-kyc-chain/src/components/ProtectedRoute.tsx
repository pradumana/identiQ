import { Navigate } from 'react-router-dom';
import { isAuthenticated, hasRole, getCurrentUser } from '@/lib/auth';
import { UserRole } from '@/types/kyc';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !hasRole(allowedRoles)) {
    const user = getCurrentUser();
    // Redirect to appropriate dashboard based on role
    if (user?.role === 'admin' || user?.role === 'reviewer') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};
