import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import { KYCApplication } from '@/store/kycStore';
import { cn } from '@/lib/utils';

interface ApplicationsTableProps {
  applications: KYCApplication[];
  filterStatus?: 'pending' | 'approved' | 'rejected' | 'in_review';
}

export const ApplicationsTable = ({ applications, filterStatus }: ApplicationsTableProps) => {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'approved':
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
      case 'in_review':
      case 'processing':
      case 'uploaded':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-green-600';
    if (score < 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredApplications = filterStatus
    ? applications.filter((app) => {
        if (filterStatus === 'pending') {
          return app.status === 'pending' || app.status === 'in_review';
        }
        if (filterStatus === 'approved') {
          return app.status === 'approved' || app.status === 'verified';
        }
        return app.status === filterStatus;
      })
    : applications;

  if (filteredApplications.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No applications found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Application ID</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">User Name</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date Submitted</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Risk Score</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredApplications.map((app) => (
            <tr
              key={app.id}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <td className="py-3 px-4 text-sm font-mono text-gray-900">{app.id}</td>
              <td className="py-3 px-4 text-sm text-gray-900">{app.name}</td>
              <td className="py-3 px-4 text-sm text-gray-600">
                {new Date(app.submittedAt).toLocaleDateString()}
              </td>
              <td className="py-3 px-4">
                <Badge className={cn('text-xs', getStatusColor(app.status))}>
                  {app.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </td>
              <td className="py-3 px-4">
                <span className={cn('text-sm font-semibold', getRiskColor(app.riskScore))}>
                  {app.riskScore}%
                </span>
              </td>
              <td className="py-3 px-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/admin/application/${app.id}`)}
                  className="text-primary hover:text-primary/80"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View Details
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

