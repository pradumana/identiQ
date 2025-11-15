import { useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, ArrowRight, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';

interface DocumentRequirement {
  doc_type: string;
  name: string;
  mandatory: boolean;
  description?: string;
}

interface DocumentListResponse {
  mandatory_documents: DocumentRequirement[];
  optional_documents: DocumentRequirement[];
  auto_extracted_details: string[];
  user_inputs: {
    name: string;
    date_of_birth: string;
    gender: string;
    marital_status: string;
    purpose: string;
  };
}

const KYCForm = memo(() => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    date_of_birth: '',
    gender: '',
    marital_status: '',
    purpose: '',
  });
  const [documentList, setDocumentList] = useState<DocumentListResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.date_of_birth || !formData.gender || 
        !formData.marital_status || !formData.purpose) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.post<DocumentListResponse>(
        '/documents/generate-document-list',
        formData
      );
      setDocumentList(response);
      toast.success('Document list generated successfully!');
    } catch (err: any) {
      console.error('Error generating document list:', err);
      toast.error(err.message || 'Failed to generate document list');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (documentList) {
      // Store document list in sessionStorage to use in upload page
      sessionStorage.setItem('kyc_document_list', JSON.stringify(documentList));
      sessionStorage.setItem('kyc_user_inputs', JSON.stringify(formData));
      navigate('/upload');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-primary rounded-lg">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">KYC Registration</h1>
              <p className="text-sm text-muted-foreground">
                Provide your details to generate personalized document requirements
              </p>
            </div>
          </div>

          {/* Form */}
          {!documentList ? (
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Fill in your details to get a customized list of required documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth *</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      required
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender *</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => setFormData({ ...formData, gender: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="marital_status">Marital Status *</Label>
                    <Select
                      value={formData.marital_status}
                      onValueChange={(value) => setFormData({ ...formData, marital_status: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select marital status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SINGLE">Single</SelectItem>
                        <SelectItem value="MARRIED">Married</SelectItem>
                        <SelectItem value="DIVORCED">Divorced</SelectItem>
                        <SelectItem value="WIDOWED">Widowed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purpose">Purpose of KYC *</Label>
                    <Select
                      value={formData.purpose}
                      onValueChange={(value) => setFormData({ ...formData, purpose: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select purpose" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GENERAL">General Verification</SelectItem>
                        <SelectItem value="BANK_ACCOUNT">Bank Account Opening</SelectItem>
                        <SelectItem value="EMPLOYMENT">Employment</SelectItem>
                        <SelectItem value="LOAN">Loan Application</SelectItem>
                        <SelectItem value="EDUCATION">Education</SelectItem>
                        <SelectItem value="HEALTH_INSURANCE">Health/Insurance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        Generate Document List
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            /* Document List Display */
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Your Required Documents</CardTitle>
                  <CardDescription>
                    Based on your information, here are the documents you need to upload
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Mandatory Documents */}
                  <div>
                    <h3 className="font-semibold mb-3 text-lg">Mandatory Documents</h3>
                    <div className="space-y-2">
                      {documentList.mandatory_documents.map((doc, index) => (
                        <div
                          key={index}
                          className="p-4 border rounded-lg bg-card"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg mt-1">
                              <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{doc.name}</span>
                                <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                                  Required
                                </span>
                              </div>
                              {doc.description && (
                                <p className="text-sm text-muted-foreground">
                                  {doc.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Optional Documents */}
                  {documentList.optional_documents.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 text-lg">Optional Documents</h3>
                      <div className="space-y-2">
                        {documentList.optional_documents.map((doc, index) => (
                          <div
                            key={index}
                            className="p-4 border rounded-lg bg-muted/30"
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-muted rounded-lg mt-1">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{doc.name}</span>
                                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                                    Optional
                                  </span>
                                </div>
                                {doc.description && (
                                  <p className="text-sm text-muted-foreground">
                                    {doc.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Auto-extracted Details */}
                  <div>
                    <h3 className="font-semibold mb-3 text-lg">Auto-extracted Details</h3>
                    <div className="p-4 border rounded-lg bg-primary/5">
                      <p className="text-sm text-muted-foreground mb-2">
                        The system will automatically extract the following information from your documents:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {documentList.auto_extracted_details.map((detail, index) => (
                          <li key={index}>{detail}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <Button onClick={handleContinue} className="w-full" size="lg">
                    Continue to Document Upload
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

KYCForm.displayName = 'KYCForm';

export default KYCForm;

