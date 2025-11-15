import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useKYCStore } from '@/store/kycStore';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const HistoryPage = () => {
  const applications = useKYCStore((state) => state.applications);
  const loading = useKYCStore((state) => state.loading);
  const error = useKYCStore((state) => state.error);
  const fetchApplications = useKYCStore((state) => state.fetchApplications);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
      case 'in_review':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Sort by latest first
  const sortedApplications = [...applications].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );

  return (
    <div className="min-h-screen bg-white p-4 lg:pl-8 lg:pr-8">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">KYC History</h1>
      <Card>
        <CardHeader>
          <CardTitle>Complete Application History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-gray-600">Loading history...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">
              <p>{error}</p>
              <button
                onClick={() => fetchApplications()}
                className="mt-4 text-primary hover:underline"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Application ID</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Timestamp</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Final Decision</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Reviewer</th>
                </tr>
              </thead>
              <tbody>
                {sortedApplications.map((app) => (
                  <tr
                    key={app.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm font-mono text-gray-900">{app.id}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(app.submittedAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={cn('text-xs', getStatusColor(app.status))}>
                        {app.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {app.reviewer || 'System'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

