import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, XCircle, Loader2, Download, Eye, FileText, Image as ImageIcon } from 'lucide-react';
import { useKYCStore } from '@/store/kycStore';
import { getCurrentUser } from '@/lib/auth';
import { adminApi } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  doc_type: string;
  file_path: string;
  file_hash: string;
  extracted_data?: any;
  verified: boolean;
  uploaded_at: string;
  validation_result?: {
    is_valid: boolean;
    errors: string[];
  };
}

interface ApplicationDetail {
  id: string;
  name: string;
  email: string;
  phone?: string;
  dob?: string;
  address?: string;
  status: string;
  riskScore: number;
  faceMatchScore?: number;
  documents: Document[];
  user_details?: any;
  ocrData?: any;
}

export const ApplicationDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const approveApplication = useKYCStore((state) => state.approveApplication);
  const rejectApplication = useKYCStore((state) => state.rejectApplication);
  const user = getCurrentUser();

  useEffect(() => {
    const fetchApplication = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const app = await adminApi.getApplicationById(id);
        
        // Transform API response
        const transformedApp: ApplicationDetail = {
          id: app.id,
          name: app.user_details?.name || app.extracted_data?.name || app.user_email?.split('@')[0] || 'Unknown User',
          email: app.user_email || '',
          phone: app.user_details?.phone || '',
          dob: app.user_details?.date_of_birth || app.user_details?.dob || '',
          address: app.user_details?.address || app.extracted_data?.address || '',
          status: app.status?.toLowerCase() || 'pending',
          riskScore: app.risk_score !== undefined && app.risk_score !== null
            ? (app.risk_score <= 1 ? Math.round(app.risk_score * 100) : Math.round(app.risk_score))
            : 0,
          faceMatchScore: app.face_match_score !== undefined && app.face_match_score !== null 
            ? (app.face_match_score <= 1 ? Math.round(app.face_match_score * 100) : Math.round(app.face_match_score))
            : undefined,
          documents: app.documents || [],
          user_details: app.user_details,
          ocrData: (() => {
            const idDoc = app.documents?.find((d: any) => d.doc_type !== 'SELFIE');
            const extractedData = idDoc?.extracted_data || app.extracted_data || {};
            let parsedData = extractedData;
            if (typeof extractedData === 'string') {
              try {
                parsedData = JSON.parse(extractedData);
              } catch {
                parsedData = {};
              }
            }
            return {
              extractedText: parsedData?.raw_text || parsedData?.extractedText || '',
              fields: {
                name: parsedData?.name || app.user_details?.name || '',
                dob: parsedData?.dob || parsedData?.date_of_birth || app.user_details?.date_of_birth || '',
                idNumber: parsedData?.id_number || parsedData?.documentNumber || '',
                address: parsedData?.address || app.user_details?.address || '',
              },
            };
          })(),
        };
        
        setApplication(transformedApp);
      } catch (error: any) {
        console.error('Error fetching application:', error);
        toast.error(error.message || 'Failed to load application details');
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-4 lg:pl-8 lg:pr-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-gray-600">Loading application details...</span>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-white p-4 lg:pl-8 lg:pr-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Application not found</p>
          <Button onClick={() => navigate('/admin/applications')} className="mt-4">
            Back to Applications
          </Button>
        </div>
      </div>
    );
  }

  const handleApprove = async () => {
    try {
      await approveApplication(application.id, user?.email || 'Admin');
      toast.success('Application approved');
      navigate('/admin/approved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve application');
    }
  };

  const handleReject = async () => {
    try {
      await rejectApplication(application.id, user?.email || 'Admin');
      toast.success('Application rejected');
      navigate('/admin/rejected');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject application');
    }
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-green-600 bg-green-50';
    if (score < 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="min-h-screen bg-white p-4 lg:pl-8 lg:pr-8">
      <Button
        variant="ghost"
        onClick={() => navigate('/admin/applications')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Applications
      </Button>

      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
        Application Details - {application.id}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Applicant Information */}
        <Card>
          <CardHeader>
            <CardTitle>Applicant Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Name</label>
              <p className="text-gray-900">{application.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Email</label>
              <p className="text-gray-900">{application.email}</p>
            </div>
            {application.phone && (
              <div>
                <label className="text-sm font-medium text-gray-600">Phone</label>
                <p className="text-gray-900">{application.phone}</p>
              </div>
            )}
            {application.dob && (
              <div>
                <label className="text-sm font-medium text-gray-600">Date of Birth</label>
                <p className="text-gray-900">{new Date(application.dob).toLocaleDateString()}</p>
              </div>
            )}
            {application.address && (
              <div>
                <label className="text-sm font-medium text-gray-600">Address</label>
                <p className="text-gray-900">{application.address}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Documents</CardTitle>
            <CardDescription>
              {application.documents?.length || 0} document{application.documents?.length !== 1 ? 's' : ''} uploaded
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {application.documents && application.documents.length > 0 ? (
              <div className="space-y-3">
                {application.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={cn(
                      "border rounded-lg p-4",
                      doc.verified ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={cn(
                          "p-2 rounded-lg",
                          doc.verified ? "bg-green-100" : "bg-red-100"
                        )}>
                          {doc.doc_type === 'SELFIE' ? (
                            <ImageIcon className="h-5 w-5 text-green-700" />
                          ) : (
                            <FileText className="h-5 w-5 text-blue-700" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">
                              {doc.doc_type.replace(/_/g, ' ')}
                            </h4>
                            {doc.verified ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                Not Verified
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mb-2">
                            Uploaded: {new Date(doc.uploaded_at).toLocaleString()}
                          </p>
                          {doc.validation_result && !doc.validation_result.is_valid && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                              <p className="font-semibold text-red-800 mb-1">Validation Errors:</p>
                              <ul className="list-disc list-inside text-red-700">
                                {doc.validation_result.errors?.map((error, idx) => (
                                  <li key={idx}>{error}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {doc.extracted_data && typeof doc.extracted_data === 'object' && (
                            <details className="mt-2">
                              <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                                View extracted data
                              </summary>
                              <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                                {JSON.stringify(doc.extracted_data, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Open document in new tab
                            const fileUrl = doc.file_path.startsWith('http') 
                              ? doc.file_path 
                              : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${doc.file_path}`;
                            window.open(fileUrl, '_blank');
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const fileUrl = doc.file_path.startsWith('http') 
                              ? doc.file_path 
                              : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${doc.file_path}`;
                            const link = document.createElement('a');
                            link.href = fileUrl;
                            link.download = `${doc.doc_type}_${doc.id}`;
                            link.click();
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No documents uploaded yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* OCR Data */}
        {application.ocrData && (
          <Card>
            <CardHeader>
              <CardTitle>OCR Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {application.ocrData.extractedText && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Extracted Text</label>
                  <pre className="text-sm text-gray-700 bg-gray-50 p-3 rounded border overflow-x-auto">
                    {application.ocrData.extractedText}
                  </pre>
                </div>
              )}
              {application.ocrData.fields && (
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-2 block">Extracted Fields</label>
                  <div className="space-y-2">
                    {application.ocrData.fields.name && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="text-gray-900">{application.ocrData.fields.name}</span>
                      </div>
                    )}
                    {application.ocrData.fields.dob && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">DOB:</span>
                        <span className="text-gray-900">{application.ocrData.fields.dob}</span>
                      </div>
                    )}
                    {application.ocrData.fields.idNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">ID Number:</span>
                        <span className="text-gray-900 font-mono">{application.ocrData.fields.idNumber}</span>
                      </div>
                    )}
                    {application.ocrData.fields.address && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Address:</span>
                        <span className="text-gray-900">{application.ocrData.fields.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Face Match & Fraud Score */}
        <Card>
          <CardHeader>
            <CardTitle>Verification Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {application.faceMatchScore !== undefined && (
              <div>
                <label className="text-sm font-medium text-gray-600">Face Match Score</label>
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-gray-900">{application.faceMatchScore}%</span>
                    {application.faceMatchScore >= 85 ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approved
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">
                        <XCircle className="h-3 w-3 mr-1" />
                        Failed
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-600">Fraud Score</label>
              <div className="mt-2">
                <div className={cn('p-3 rounded-lg', getRiskColor(application.riskScore))}>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{application.riskScore}%</span>
                    <span className="text-sm">
                      {application.riskScore < 30 ? 'Low Risk' : application.riskScore < 70 ? 'Medium Risk' : 'High Risk'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      {application.status !== 'approved' && application.status !== 'rejected' && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Button
                onClick={handleApprove}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                onClick={handleReject}
                variant="destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

