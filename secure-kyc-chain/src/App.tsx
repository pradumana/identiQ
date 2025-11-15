import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const InstitutionPortal = lazy(() => import("./pages/InstitutionPortal"));
const KYCForm = lazy(() => import("./pages/KYCForm"));
const Uploads = lazy(() => import("./pages/Uploads"));
const NotFound = lazy(() => import("./pages/NotFound"));

// IdentiQ Admin Pages
const IdentiQDashboardPage = lazy(() => import("./pages/admin/IdentiQDashboardPage").then(m => ({ default: m.IdentiQDashboardPage })));
const ApplicationsPage = lazy(() => import("./pages/admin/ApplicationsPage").then(m => ({ default: m.ApplicationsPage })));
const AutoVerificationPage = lazy(() => import("./pages/admin/AutoVerificationPage").then(m => ({ default: m.AutoVerificationPage })));
const ReviewQueuePage = lazy(() => import("./pages/admin/ReviewQueuePage").then(m => ({ default: m.ReviewQueuePage })));
const ApprovedPage = lazy(() => import("./pages/admin/ApprovedPage").then(m => ({ default: m.ApprovedPage })));
const RejectedPage = lazy(() => import("./pages/admin/RejectedPage").then(m => ({ default: m.RejectedPage })));
const HistoryPage = lazy(() => import("./pages/admin/HistoryPage").then(m => ({ default: m.HistoryPage })));
const FlaggedPage = lazy(() => import("./pages/admin/FlaggedPage").then(m => ({ default: m.FlaggedPage })));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage").then(m => ({ default: m.SettingsPage })));
const ApplicationDetailPage = lazy(() => import("./pages/admin/ApplicationDetailPage").then(m => ({ default: m.ApplicationDetailPage })));

// IdentiQ Layout
const IdentiQLayout = lazy(() => import("./components/layout/IdentiQLayout").then(m => ({ default: m.IdentiQLayout })));

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Optimized QueryClient with better defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/kyc-form" element={<KYCForm />} />
            <Route path="/upload" element={<Uploads />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute allowedRoles={['user']}>
                  <UserDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'reviewer']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            {/* IdentiQ Admin Routes */}
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'reviewer']}>
                  <IdentiQLayout>
                    <IdentiQDashboardPage />
                  </IdentiQLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/applications" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'reviewer']}>
                  <IdentiQLayout>
                    <ApplicationsPage />
                  </IdentiQLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/auto-verification" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'reviewer']}>
                  <IdentiQLayout>
                    <AutoVerificationPage />
                  </IdentiQLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/review-queue" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'reviewer']}>
                  <IdentiQLayout>
                    <ReviewQueuePage />
                  </IdentiQLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/approved" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'reviewer']}>
                  <IdentiQLayout>
                    <ApprovedPage />
                  </IdentiQLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/rejected" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'reviewer']}>
                  <IdentiQLayout>
                    <RejectedPage />
                  </IdentiQLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/history" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'reviewer']}>
                  <IdentiQLayout>
                    <HistoryPage />
                  </IdentiQLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/application/:id" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'reviewer']}>
                  <IdentiQLayout>
                    <ApplicationDetailPage />
                  </IdentiQLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/flagged" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'reviewer']}>
                  <IdentiQLayout>
                    <FlaggedPage />
                  </IdentiQLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/settings" 
              element={
                <ProtectedRoute allowedRoles={['admin', 'reviewer']}>
                  <IdentiQLayout>
                    <SettingsPage />
                  </IdentiQLayout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/institution" 
              element={
                <ProtectedRoute allowedRoles={['institution', 'admin']}>
                  <InstitutionPortal />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
