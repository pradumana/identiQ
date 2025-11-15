import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Eye, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { KYCApplication, KYCStatus } from '@/types/kyc';
import { KYCDetailDialog } from './KYCDetailDialog';

interface KYCReviewQueueProps {
  applications: KYCApplication[];
  onRefresh?: () => void;
}

export const KYCReviewQueue = ({ applications, onRefresh }: KYCReviewQueueProps) => {
  const [selectedApplication, setSelectedApplication] = useState<KYCApplication | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const getStatusColor = (status: KYCStatus) => {
    switch (status) {
      case 'VERIFIED':
      case 'APPROVED':
        return 'bg-success/10 text-success border-success/20';
      case 'IN_REVIEW':
      case 'PROCESSING':
      case 'UPLOADED':
      case 'REQUEST_INFO':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'REJECTED':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'SUSPENDED':
      case 'EXPIRED':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getRiskBadge = (score: number | null) => {
    if (score === null) return null;
    
    if (score < 0.3) {
      return <Badge className="bg-success/10 text-success border-success/20">Low Risk</Badge>;
    } else if (score < 0.6) {
      return <Badge className="bg-warning/10 text-warning border-warning/20">Medium Risk</Badge>;
    } else {
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20">High Risk</Badge>;
    }
  };

  const handleViewDetails = (application: KYCApplication) => {
    setSelectedApplication(application);
    setDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>KYC Review Queue</CardTitle>
          <CardDescription>
            Applications pending manual review. Low-risk applications (&lt; 30%) are automatically approved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success opacity-50" />
              <p className="text-lg font-medium mb-2">No applications in review queue</p>
              <p className="text-sm text-muted-foreground">
                All pending applications have been processed. Low-risk applications are auto-approved.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application ID</TableHead>
                    <TableHead>User Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-mono text-sm">{app.id}</TableCell>
                    <TableCell>{app.user_email}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(app.status)}>
                        {app.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {app.risk_score !== null && (
                          <span className="font-mono text-sm">
                            {(app.risk_score * 100).toFixed(0)}%
                          </span>
                        )}
                        {getRiskBadge(app.risk_score)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(app.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(app)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedApplication && (
        <KYCDetailDialog
          application={selectedApplication}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onActionComplete={() => {
            if (onRefresh) {
              onRefresh();
            }
          }}
        />
      )}
    </>
  );
};
