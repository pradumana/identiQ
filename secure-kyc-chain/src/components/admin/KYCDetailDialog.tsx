import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, AlertCircle, FileText, User, Activity } from 'lucide-react';
import { KYCApplication } from '@/types/kyc';
import { toast } from 'sonner';
import { ShapExplanation } from './ShapExplanation';
import { adminApi } from '@/lib/api';

interface KYCDetailDialogProps {
  application: KYCApplication;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionComplete?: () => void;
}

export const KYCDetailDialog = ({ application, open, onOpenChange, onActionComplete }: KYCDetailDialogProps) => {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: 'APPROVE' | 'REJECT') => {
    if (action === 'REJECT' && !comment.trim()) {
      toast.error('Please provide a comment when rejecting an application');
      return;
    }

    setLoading(true);
    
    try {
      if (action === 'APPROVE') {
        await adminApi.approveApplication(application.id, comment.trim() || undefined);
        toast.success('Application approved successfully');
      } else {
        await adminApi.rejectApplication(application.id, comment.trim());
        toast.success('Application rejected successfully');
      }
      
      onOpenChange(false);
      if (onActionComplete) {
        onActionComplete();
      }
    } catch (error: any) {
      console.error('Error processing application:', error);
      toast.error(error.message || `Failed to ${action === 'APPROVE' ? 'approve' : 'reject'} application`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>KYC Application Details</DialogTitle>
          <DialogDescription>
            Review application {application.id}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Application Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">User Email</p>
                    <p className="font-medium">{application.user_email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className="mt-1">{application.status}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Risk Score</p>
                    <p className="font-medium">
                      {application.risk_score !== null 
                        ? `${(application.risk_score * 100).toFixed(0)}%` 
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Face Match</p>
                    <p className="font-medium">
                      {application.face_match_score !== undefined
                        ? `${(application.face_match_score * 100).toFixed(0)}%`
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Submitted</p>
                    <p className="font-medium">
                      {new Date(application.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="font-medium">
                      {new Date(application.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {application.documents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Extracted Data</CardTitle>
                </CardHeader>
                <CardContent>
                  {application.documents
                    .filter(doc => doc.doc_type !== 'SELFIE')
                    .map(doc => (
                      <div key={doc.id} className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          {doc.doc_type.replace('_', ' ')}
                        </p>
                        <div className="grid grid-cols-2 gap-3 pl-4">
                          {Object.entries(doc.extracted_data).map(([key, value]) => (
                            <div key={key}>
                              <p className="text-xs text-muted-foreground capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </p>
                              <p className="text-sm font-medium">{value as string}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {application.documents.map(doc => (
                <Card key={doc.id}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {doc.doc_type.replace('_', ' ')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                      <User className="h-16 w-16 text-muted-foreground" />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Verified:</span>
                        <Badge variant={doc.verified ? 'default' : 'secondary'}>
                          {doc.verified ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">File Hash:</span>
                        <code className="text-xs">{doc.file_hash.slice(0, 12)}...</code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Uploaded:</span>
                        <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="risk" className="space-y-4">
            {application.shap_explanation && (
              <ShapExplanation 
                features={application.shap_explanation}
                riskScore={application.risk_score || 0}
              />
            )}
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Verification Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {application.verifications.map((verification, index) => (
                    <div key={verification.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <Activity className="h-4 w-4 text-primary" />
                        </div>
                        {index < application.verifications.length - 1 && (
                          <div className="w-px h-full bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium text-sm capitalize">
                          {verification.event_type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(verification.timestamp).toLocaleString()}
                        </p>
                        {verification.tx_hash && (
                          <code className="text-xs bg-muted px-2 py-1 rounded mt-2 inline-block">
                            TX: {verification.tx_hash.slice(0, 20)}...
                          </code>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {(application.status === 'IN_REVIEW' || application.status === 'PROCESSING' || application.status === 'UPLOADED') && (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="comment">Reviewer Comment</Label>
              <Textarea
                id="comment"
                placeholder="Add a comment about this application..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                variant="default"
                onClick={() => handleAction('APPROVE')}
                disabled={loading}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve Application
              </Button>
              <Button
                className="flex-1"
                variant="destructive"
                onClick={() => handleAction('REJECT')}
                disabled={loading}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject Application
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
