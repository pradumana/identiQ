import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi } from '@/lib/api';
import { 
  LayoutDashboard, 
  FileText, 
  Zap, 
  ClipboardList, 
  CheckCircle, 
  AlertTriangle, 
  Settings 
} from 'lucide-react';

interface DashboardMetrics {
  totalApplicationsToday: number;
  pendingVerifications: number;
  autoApprovedByAI: number;
  flaggedForReview: number;
  kycCompletionRate: number;
}

export const IdentiQDashboard = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalApplicationsToday: 0,
    pendingVerifications: 0,
    autoApprovedByAI: 0,
    flaggedForReview: 0,
    kycCompletionRate: 75,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const riskMetrics = await adminApi.getMetrics();
        const applications = await adminApi.getReviewQueue();
        
        // Calculate today's applications
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayApplications = applications.filter(app => {
          const appDate = new Date(app.created_at);
          return appDate >= today;
        });

        // Calculate metrics
        const totalToday = todayApplications.length;
        const pending = applications.filter(app => 
          app.status === 'IN_REVIEW' || app.status === 'PROCESSING' || app.status === 'UPLOADED'
        ).length;
        const autoApproved = riskMetrics.auto_approved || 0;
        const flagged = applications.filter(app => 
          app.risk_score && app.risk_score >= 0.5
        ).length;

        // Calculate completion rate (verified / total)
        const totalApps = riskMetrics.total_applications || 1;
        const verified = riskMetrics.auto_approved + (riskMetrics.total_applications - riskMetrics.manual_reviews - riskMetrics.rejected);
        const completionRate = Math.round((verified / totalApps) * 100);

        setMetrics({
          totalApplicationsToday: totalToday,
          pendingVerifications: pending,
          autoApprovedByAI: autoApproved,
          flaggedForReview: flagged,
          kycCompletionRate: completionRate || 75,
        });
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  // Donut chart component
  const DonutChart = ({ percentage }: { percentage: number }) => {
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative w-48 h-48 mx-auto">
        <svg className="transform -rotate-90 w-48 h-48">
          {/* Background circle */}
          <circle
            cx="96"
            cy="96"
            r={radius}
            stroke="#E5E7EB"
            strokeWidth="16"
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx="96"
            cy="96"
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
            <div className="text-4xl font-bold text-[#1DBF59]">{percentage}%</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-20 bg-[#0F3B3A] flex flex-col items-center py-6 z-10">
        <div className="mb-8">
          <div className="w-10 h-10 bg-[#1DBF59] rounded-lg flex items-center justify-center">
            <LayoutDashboard className="h-6 w-6 text-white" />
          </div>
        </div>
        
        <nav className="flex-1 space-y-6">
          <div className="relative group">
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#1DBF59] rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-12 h-12 bg-[#E7F7EC] rounded-xl flex items-center justify-center">
              <LayoutDashboard className="h-6 w-6 text-[#1DBF59]" />
            </div>
          </div>
          
          <div className="relative group">
            <div className="w-12 h-12 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors">
              <FileText className="h-6 w-6 text-white" />
            </div>
          </div>
          
          <div className="relative group">
            <div className="w-12 h-12 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors">
              <Zap className="h-6 w-6 text-white" />
            </div>
          </div>
          
          <div className="relative group">
            <div className="w-12 h-12 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors">
              <ClipboardList className="h-6 w-6 text-white" />
            </div>
          </div>
          
          <div className="relative group">
            <div className="w-12 h-12 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
          </div>
          
          <div className="relative group">
            <div className="w-12 h-12 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
          </div>
        </nav>
        
        <div className="relative group">
          <div className="w-12 h-12 flex items-center justify-center hover:bg-white/10 rounded-xl transition-colors">
            <Settings className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-20 p-8">
        {/* Top Navbar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#1DBF59] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">I</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">IdentiQ</span>
          </div>
          <div className="w-8"></div>
        </div>

        {/* Dashboard Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

        {/* Main Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Section - Donut Chart */}
          <div className="lg:col-span-1">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900">
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

          {/* Right Section - KYC Cards */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Total Applications Today */}
              <Card className="bg-[#F7F7F7] border border-gray-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Applications Today
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="h-12 w-16 bg-gray-300 rounded animate-pulse"></div>
                  ) : (
                    <div className="text-4xl font-bold text-gray-900">
                      {metrics.totalApplicationsToday}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card 2: Pending Verifications */}
              <Card className="bg-[#F7F7F7] border border-gray-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Pending Verifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="h-12 w-16 bg-gray-300 rounded animate-pulse"></div>
                  ) : (
                    <div className="text-4xl font-bold text-gray-900">
                      {metrics.pendingVerifications}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card 3: Auto-Approved by AI */}
              <Card className="bg-[#F7F7F7] border border-gray-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Auto-Approved by AI
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="h-12 w-16 bg-gray-300 rounded animate-pulse"></div>
                  ) : (
                    <div className="text-4xl font-bold text-gray-900">
                      {metrics.autoApprovedByAI}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card 4: Flagged for Review */}
              <Card className="bg-[#F7F7F7] border border-gray-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Flagged for Review
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="h-12 w-16 bg-gray-300 rounded animate-pulse"></div>
                  ) : (
                    <div className="text-4xl font-bold text-gray-900">
                      {metrics.flaggedForReview}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

