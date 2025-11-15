import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect, useCallback, memo } from "react";
import { Upload, FileText, Camera, ArrowLeft, X, Check, AlertCircle, Shield, Lock, CheckCircle2, Sparkles, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { kycApi } from "@/lib/api";
import { VideoRecorder } from "@/components/VideoRecorder";

interface DocumentRequirement {
  doc_type: string;
  name: string;
  mandatory: boolean;
  description?: string;
}

interface DocumentUploadState {
  file: File | null;
  previewUrl: string | null;
  isUploading: boolean;
  isUploaded: boolean;
  validationErrors: string[];
  isValid: boolean;
}

const Uploads = memo(() => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [documentList, setDocumentList] = useState<DocumentRequirement[]>([]);
  const [documentUploads, setDocumentUploads] = useState<Map<string, DocumentUploadState>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // Load document list from sessionStorage
  useEffect(() => {
    const storedList = sessionStorage.getItem('kyc_document_list');
    if (storedList) {
      try {
        const parsed = JSON.parse(storedList);
        const docs = parsed.mandatory_documents || [];
        setDocumentList(docs);
        
        // Initialize upload states for all documents
        const initialUploads = new Map<string, DocumentUploadState>();
        docs.forEach((doc: DocumentRequirement) => {
          initialUploads.set(doc.doc_type, {
            file: null,
            previewUrl: null,
            isUploading: false,
            isUploaded: false,
            validationErrors: [],
            isValid: true
          });
        });
        setDocumentUploads(initialUploads);
      } catch (e) {
        console.error('Error parsing document list:', e);
      }
    }
  }, []);

  // Map frontend doc types to backend doc types
  const mapDocTypeToBackend = (docType: string): string => {
    if (docType === docType.toUpperCase() && (docType.includes('_') || docType === 'SELFIE' || docType === 'AADHAAR')) {
      return docType;
    }
    
    const mapping: Record<string, string> = {
      'passport': 'PASSPORT',
      'drivers_license': 'DRIVERS_LICENSE',
      'driving_license': 'DRIVING_LICENSE',
      'national_id': 'NATIONAL_ID',
      'aadhar_card': 'AADHAAR',
      'aadhaar': 'AADHAAR',
      'aadhar': 'AADHAAR',
      'pan_card': 'PAN_CARD',
      'utility_bill': 'UTILITY_BILL',
      'bank_statement': 'BANK_STATEMENT',
      'marriage_certificate': 'MARRIAGE_CERTIFICATE',
      'income_proof': 'INCOME_PROOF',
      'education_proof': 'EDUCATION_PROOF',
      'medical_certificate': 'MEDICAL_CERTIFICATE',
      'address_proof': 'ADDRESS_PROOF',
      'identity_doc': 'AADHAAR',
      'selfie': 'SELFIE',
    };
    
    const normalized = docType.toLowerCase().trim();
    return mapping[normalized] || docType.toUpperCase().replace(/\s+/g, '_');
  };

  const handleFileChange = useCallback(async (docType: string, file: File | null) => {
    if (!file) return;

    // Update state to show uploading
    setDocumentUploads(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(docType) || { file: null, previewUrl: null, isUploading: false, isUploaded: false };
      newMap.set(docType, {
        ...current,
        file,
        previewUrl: URL.createObjectURL(file),
        isUploading: true,
        isUploaded: false
      });
      return newMap;
    });

    try {
      const backendDocType = mapDocTypeToBackend(docType);
      const response = await kycApi.uploadDocument(file, backendDocType);
      
      // Check for validation errors in response
      const validationErrors: string[] = [];
      let isValid = true;
      
      if (response.validation_result) {
        isValid = response.validation_result.is_valid;
        if (response.validation_result.errors && response.validation_result.errors.length > 0) {
          validationErrors.push(...response.validation_result.errors);
        }
      }
      
      // Mark as uploaded
      setDocumentUploads(prev => {
        const newMap = new Map(prev);
        const current = newMap.get(docType);
        if (current) {
          newMap.set(docType, {
            ...current,
            isUploading: false,
            isUploaded: true,
            validationErrors,
            isValid
          });
        }
        return newMap;
      });

      // Show appropriate toast message
      if (!isValid && validationErrors.length > 0) {
        toast({
          title: "⚠️ Document Validation Failed",
          description: `The document doesn't match your entered details. Please check and upload the correct document.`,
          variant: "destructive",
        });
        
        // Show detailed errors
        setTimeout(() => {
          toast({
            title: "Validation Errors",
            description: validationErrors.join('. '),
            variant: "destructive",
            duration: 10000,
          });
        }, 500);
      } else {
        toast({
          title: "✅ Upload successful",
          description: `${documentList.find(d => d.doc_type === docType)?.name || docType} uploaded and validated successfully.`,
        });
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || `Failed to upload ${docType}. Please try again.`,
        variant: "destructive",
      });
      
      // Reset on error
      setDocumentUploads(prev => {
        const newMap = new Map(prev);
        const current = newMap.get(docType);
        if (current) {
          newMap.set(docType, {
            ...current,
            file: null,
            previewUrl: null,
            isUploading: false,
            isUploaded: false,
            validationErrors: [],
            isValid: true
          });
        }
        return newMap;
      });
    }
  }, [documentList, toast]);

  const handleRemoveFile = useCallback((docType: string) => {
    setDocumentUploads(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(docType);
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }
      newMap.set(docType, {
        file: null,
        previewUrl: null,
        isUploading: false,
        isUploaded: false,
        validationErrors: [],
        isValid: true
      });
      return newMap;
    });
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if all documents are uploaded
    const allUploaded = documentList.every(doc => {
      const uploadState = documentUploads.get(doc.doc_type);
      return uploadState?.isUploaded === true;
    });

    if (!allUploaded) {
      toast({
        title: "Incomplete uploads",
        description: "Please upload all required documents before submitting.",
        variant: "destructive",
      });
      return;
    }

    // Check if all documents are valid
    const allValid = documentList.every(doc => {
      const uploadState = documentUploads.get(doc.doc_type);
      return uploadState?.isValid === true;
    });

    if (!allValid) {
      toast({
        title: "⚠️ Validation Errors",
        description: "Some documents don't match your entered details. Please upload correct documents before submitting.",
        variant: "destructive",
        duration: 8000,
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Process the KYC application
      await kycApi.processApplication();

      toast({
        title: "Application submitted",
        description: "Your KYC application has been submitted and is being processed.",
      });

      // Navigate to dashboard after successful submission
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error: any) {
      console.error('Processing error:', error);
      toast({
        title: "Processing failed",
        description: error.message || "Failed to process application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [documentList, documentUploads, toast, navigate]);

  // Check if all documents are uploaded
  const allDocumentsUploaded = documentList.length > 0 && documentList.every(doc => {
    const uploadState = documentUploads.get(doc.doc_type);
    return uploadState?.isUploaded === true;
  });

  // Count uploaded documents
  const uploadedCount = Array.from(documentUploads.values()).filter(u => u.isUploaded).length;
  const totalCount = documentList.length;

  // Check if user has filled the form
  const hasDocumentList = documentList.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 max-w-6xl py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Secure Upload</span>
            </div>
          </div>

          {/* Document List Alert */}
          {!hasDocumentList && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>Please fill in your details first to get personalized document requirements.</span>
                  <Button size="sm" onClick={() => navigate('/kyc-form')} className="ml-4">
                    Fill Details
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Progress Indicator */}
          {hasDocumentList && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Upload Progress</CardTitle>
                    <CardDescription>
                      {uploadedCount} of {totalCount} documents uploaded
                    </CardDescription>
                  </div>
                  <Badge variant={allDocumentsUploaded ? "default" : "secondary"}>
                    {allDocumentsUploaded ? "Ready to Submit" : "In Progress"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="w-full bg-muted rounded-full h-3">
                  <div 
                    className="bg-primary h-3 rounded-full transition-all duration-300"
                    style={{ width: `${(uploadedCount / totalCount) * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Document Upload Cards */}
          {hasDocumentList && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {documentList.map((doc, index) => {
                const uploadState = documentUploads.get(doc.doc_type) || {
                  file: null,
                  previewUrl: null,
                  isUploading: false,
                  isUploaded: false,
                  validationErrors: [],
                  isValid: true
                };
                const isSelfie = doc.doc_type === 'SELFIE';

                return (
                  <Card key={index} className={
                    uploadState.isUploaded 
                      ? (uploadState.isValid ? 'border-success/50 bg-success/5' : 'border-destructive/50 bg-destructive/5')
                      : ''
                  }>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {uploadState.isUploaded ? (
                            uploadState.isValid ? (
                              <CheckCircle2 className="h-6 w-6 text-success" />
                            ) : (
                              <AlertCircle className="h-6 w-6 text-destructive" />
                            )
                          ) : (
                            <FileText className="h-6 w-6 text-muted-foreground" />
                          )}
                          <div>
                            <CardTitle className="text-lg">{doc.name}</CardTitle>
                            {doc.description && (
                              <CardDescription className="mt-1">{doc.description}</CardDescription>
                            )}
                          </div>
                        </div>
                        {uploadState.isUploaded && (
                          <Badge variant={uploadState.isValid ? "outline" : "destructive"} className={
                            uploadState.isValid 
                              ? "bg-success/10 text-success border-success/20"
                              : "bg-destructive/10 text-destructive border-destructive/20"
                          }>
                            {uploadState.isValid ? "Uploaded & Valid" : "Validation Failed"}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* File Input (hidden) - Only for non-selfie documents */}
                        {!isSelfie && (
                          <Input
                            ref={(el) => {
                              if (el) fileInputRefs.current.set(doc.doc_type, el);
                            }}
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              if (file) {
                                handleFileChange(doc.doc_type, file);
                              }
                            }}
                            disabled={uploadState.isUploading || uploadState.isUploaded}
                          />
                        )}

                        {/* Upload Area */}
                        {!uploadState.file ? (
                          isSelfie ? (
                            // Video Recorder for Selfie
                            <VideoRecorder
                              onVideoRecorded={(file) => {
                                handleFileChange(doc.doc_type, file);
                              }}
                              onError={(error) => {
                                toast({
                                  title: "Recording Error",
                                  description: error,
                                  variant: "destructive",
                                });
                              }}
                              disabled={uploadState.isUploading || uploadState.isUploaded}
                            />
                          ) : (
                            // File Upload for Documents
                            <div
                              onClick={() => !uploadState.isUploading && !uploadState.isUploaded && fileInputRefs.current.get(doc.doc_type)?.click()}
                              className={`
                                border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
                                ${uploadState.isUploading || uploadState.isUploaded
                                  ? 'border-muted bg-muted/50 cursor-not-allowed'
                                  : 'border-primary/30 hover:border-primary/50 hover:bg-primary/5'
                                }
                              `}
                            >
                              <div className="space-y-3">
                                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                                  <Upload className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-foreground">
                                    Click to upload or drag and drop
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    PNG, JPG, PDF up to 10MB • Encrypted upload
                                  </p>
                                </div>
                                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Lock className="h-3 w-3" />
                                    <span>Secure</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Shield className="h-3 w-3" />
                                    <span>Encrypted</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="space-y-3">
                            {/* Preview */}
                            {uploadState.previewUrl && uploadState.file.type.startsWith('image/') && (
                              <div className="relative w-full max-w-xs mx-auto">
                                <img
                                  src={uploadState.previewUrl}
                                  alt={doc.name}
                                  className="w-full h-auto rounded-lg border-2 border-border"
                                />
                              </div>
                            )}
                            
                            {/* File Info */}
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                              <div className="flex items-center gap-3">
                                {uploadState.isUploading ? (
                                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                ) : uploadState.isUploaded ? (
                                  uploadState.isValid ? (
                                    <CheckCircle2 className="h-5 w-5 text-success" />
                                  ) : (
                                    <AlertCircle className="h-5 w-5 text-destructive" />
                                  )
                                ) : (
                                  <FileText className="h-5 w-5 text-muted-foreground" />
                                )}
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{uploadState.file.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {(uploadState.file.size / 1024 / 1024).toFixed(2)} MB
                                    {uploadState.isUploading && ' • Uploading...'}
                                    {uploadState.isUploaded && uploadState.isValid && ' • Uploaded & Validated'}
                                    {uploadState.isUploaded && !uploadState.isValid && ' • Validation Failed'}
                                  </p>
                                </div>
                              </div>
                              {!uploadState.isUploading && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveFile(doc.doc_type)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            
                            {/* Validation Errors */}
                            {uploadState.isUploaded && !uploadState.isValid && uploadState.validationErrors.length > 0 && (
                              <Alert variant="destructive" className="mt-3">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  <div className="space-y-1">
                                    <p className="font-semibold">Document doesn't match your details:</p>
                                    <ul className="list-disc list-inside space-y-1 text-sm">
                                      {uploadState.validationErrors.map((error, idx) => (
                                        <li key={idx}>{error}</li>
                                      ))}
                                    </ul>
                                    <p className="text-xs mt-2 font-medium">
                                      ⚠️ Please upload the correct document that matches the details you entered.
                                    </p>
                                  </div>
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Submit Button */}
              <Card className="border-t-2">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Lock className="h-4 w-4" />
                        <span>Your documents are encrypted and secure</span>
                      </div>
                      {allDocumentsUploaded && documentList.every(doc => {
                        const uploadState = documentUploads.get(doc.doc_type);
                        return uploadState?.isValid === true;
                      }) && (
                        <div className="flex items-center gap-2 text-success">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>All documents uploaded and validated - Ready to submit</span>
                        </div>
                      )}
                      {allDocumentsUploaded && !documentList.every(doc => {
                        const uploadState = documentUploads.get(doc.doc_type);
                        return uploadState?.isValid === true;
                      }) && (
                        <div className="flex items-center gap-2 text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          <span>Some documents failed validation - Please fix errors before submitting</span>
                        </div>
                      )}
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-lg font-semibold" 
                      disabled={isProcessing || !allDocumentsUploaded || !documentList.every(doc => {
                        const uploadState = documentUploads.get(doc.doc_type);
                        return uploadState?.isValid === true;
                      })}
                      size="lg"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Shield className="mr-2 h-5 w-5" />
                          Complete Verification & Get UKN
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      By submitting, you agree to our terms and confirm that all documents are authentic and belong to you.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </form>
          )}
        </div>
      </div>
    </div>
  );
});

Uploads.displayName = 'Uploads';

export default Uploads;
