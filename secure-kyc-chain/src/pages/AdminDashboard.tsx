import { useEffect, memo } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, isAuthenticated } from "@/lib/auth";

const AdminDashboard = memo(() => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  
  // Redirect to new IdentiQ dashboard immediately
  useEffect(() => {
    if (isAuthenticated() && user) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate, user]);
  
  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1DBF59] mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to IdentiQ Dashboard...</p>
      </div>
    </div>
  );
});

AdminDashboard.displayName = "AdminDashboard";
export default AdminDashboard;
