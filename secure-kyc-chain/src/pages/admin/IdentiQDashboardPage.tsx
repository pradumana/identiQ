import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi } from '@/lib/api';
import { useKYCStore } from '@/store/kycStore';

interface DashboardMetrics {
  totalApplicationsToday: number;
  pendingVerifications: number;
  autoApprovedByAI: number;
  flaggedForReview: number;
  kycCompletionRate: number;
}

export const IdentiQDashboardPage = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalApplicationsToday: 0,
    pendingVerifications: 0,
    autoApprovedByAI: 0,
    flaggedForReview: 0,
    kycCompletionRate: 75,
  });
  const [loading, setLoading] = useState(true);

  const fetchApplications = useKYCStore((state) => state.fetchApplications);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const allApplications = await adminApi.getApplications();
        const reviewQueue = await adminApi.getReviewQueue();
        
        // Calculate today's applications
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayApplications = allApplications.filter((app: any) => {
          const appDate = new Date(app.created_at);
          return appDate >= today;
        });

        // Calculate pending verifications
        // Count applications that need review based on status
        // This matches what users see in the applications list
        const pending = allApplications.filter((app: any) => {
          const status = (app.status || '').toUpperCase();
          return ['IN_REVIEW', 'PROCESSING', 'UPLOADED', 'REGISTERED', 'DRAFT', 'REQUEST_INFO'].includes(status);
        }).length;

        // Calculate auto-approved: VERIFIED/APPROVED status with low risk score (< 30% or < 0.3)
        // Auto-approved means: status is VERIFIED/APPROVED AND risk_score is low (< 30% or < 0.3)
        const autoApproved = allApplications.filter((app: any) => {
          const status = (app.status || '').toUpperCase();
          const isVerified = status === 'VERIFIED' || status === 'APPROVED';
          
          if (!isVerified) return false;
          
          // Handle both percentage (0-100) and decimal (0-1) risk scores
          const riskScore = app.risk_score;
          if (riskScore === null || riskScore === undefined) return false;
          
          // If risk_score is > 1, it's likely a percentage (0-100), else it's decimal (0-1)
          const isLowRisk = riskScore > 1 
            ? riskScore < 30  // Percentage format: < 30%
            : riskScore < 0.3; // Decimal format: < 0.3
          
          return isLowRisk;
        }).length;
        
        // Also check review queue for debugging
        console.log('Review Queue Details:', {
          reviewQueueLength: reviewQueue.length,
          reviewQueueApps: reviewQueue.map((app: any) => ({
            id: app.id,
            status: app.status,
            risk_score: app.risk_score
          }))
        });

        // Flagged for review (high risk applications: risk_score >= 50% or >= 0.5)
        const flagged = allApplications.filter((app: any) => {
          const riskScore = app.risk_score;
          if (riskScore === null || riskScore === undefined) return false;
          
          // Handle both percentage and decimal formats
          return riskScore > 1 
            ? riskScore >= 50  // Percentage format: >= 50%
            : riskScore >= 0.5; // Decimal format: >= 0.5
        }).length;

        // Calculate completion rate: (approved / total) * 100
        const totalApps = allApplications.length || 1;
        const approved = allApplications.filter((app: any) => {
          const status = (app.status || '').toUpperCase();
          return status === 'VERIFIED' || status === 'APPROVED';
        }).length;
        const completionRate = totalApps > 0 ? Math.round((approved / totalApps) * 100) : 0;

        console.log('Metrics calculated:', {
          totalApplicationsToday: todayApplications.length,
          pendingVerifications: pending,
          autoApprovedByAI: autoApproved,
          flaggedForReview: flagged,
          totalApps,
          approved,
          allApplicationsStatuses: allApplications.map((a: any) => ({ 
            id: a.id, status: a.status, risk_score: a.risk_score 
          }))
        });

        setMetrics({
          totalApplicationsToday: todayApplications.length,
          pendingVerifications: pending,
          autoApprovedByAI: autoApproved,
          flaggedForReview: flagged,
          kycCompletionRate: completionRate,
        });
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const DonutChart = ({ percentage }: { percentage: number }) => {
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative w-full max-w-[192px] mx-auto aspect-square">
        <svg className="transform -rotate-90 w-full h-full">
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            stroke="#E5E7EB"
            strokeWidth="16"
            fill="none"
          />
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            stroke="#1DBF59"
            strokeWidth="16"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-[#1DBF59]">{percentage}%</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="p-4 lg:pl-8 lg:pr-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8">Dashboard</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Left Section - Donut Chart */}
          <div className="lg:col-span-1">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base md:text-lg font-semibold text-gray-900">
                  KYC Completion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1DBF59]"></div>
                  </div>
                ) : (
                  <DonutChart percentage={metrics.kycCompletionRate} />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Section - KYC Stats Cards */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <Link to="/admin/applications?filter=today">
                <Card className="bg-[#F7F7F7] border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Total Applications Today
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="h-12 w-16 bg-gray-300 rounded animate-pulse"></div>
                    ) : (
                      <div className="text-3xl md:text-4xl font-bold text-gray-900">
                        {metrics.totalApplicationsToday}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>

              <Link to="/admin/review-queue">
                <Card className="bg-[#F7F7F7] border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Pending Verifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="h-12 w-16 bg-gray-300 rounded animate-pulse"></div>
                    ) : (
                      <div className="text-3xl md:text-4xl font-bold text-gray-900">
                        {metrics.pendingVerifications}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>

              <Link to="/admin/approved?filter=auto">
                <Card className="bg-[#F7F7F7] border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Auto-Approved by AI
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="h-12 w-16 bg-gray-300 rounded animate-pulse"></div>
                    ) : (
                      <div className="text-3xl md:text-4xl font-bold text-gray-900">
                        {metrics.autoApprovedByAI}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>

              <Link to="/admin/applications?filter=flagged">
                <Card className="bg-[#F7F7F7] border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Flagged for Review
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="h-12 w-16 bg-gray-300 rounded animate-pulse"></div>
                    ) : (
                      <div className="text-3xl md:text-4xl font-bold text-gray-900">
                        {metrics.flaggedForReview}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

