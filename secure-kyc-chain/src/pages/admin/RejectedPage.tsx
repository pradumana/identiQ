import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApplicationsTable } from '@/components/admin/ApplicationsTable';
import { useKYCStore } from '@/store/kycStore';
import { Loader2 } from 'lucide-react';

export const RejectedPage = () => {
  const applications = useKYCStore((state) => state.applications);
  const loading = useKYCStore((state) => state.loading);
  const error = useKYCStore((state) => state.error);
  const fetchApplications = useKYCStore((state) => state.fetchApplications);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  return (
    <div className="min-h-screen bg-white p-4 lg:pl-8 lg:pr-8">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">Rejected Applications</h1>
      <Card>
        <CardHeader>
          <CardTitle>Rejected KYC Applications</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-gray-600">Loading applications...</span>
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
            <ApplicationsTable applications={applications} filterStatus="rejected" />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

