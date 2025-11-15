import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Upload, CheckCircle2, Clock, AlertCircle, LogOut, Loader2, Copy, Share2, X, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { getCurrentUser, logout, isAuthenticated } from '@/lib/auth';
import { kycApi } from '@/lib/api';
import { KYCStatus, KYCApplication } from '@/types/kyc';

const UserDashboard = memo(() => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [kycApplication, setKycApplication] = useState<KYCApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [consents, setConsents] = useState<any[]>([]);
  const [loadingConsents, setLoadingConsents] = useState(false);

  const kycStatus: KYCStatus = kycApplication?.status || 'DRAFT';

  // 🔐 Auth Guard
  useEffect(() => {
    if (!isAuthenticated() || !user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Fetch KYC application data
  useEffect(() => {
    const fetchKYCData = async () => {
      if (!isAuthenticated()) {
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        const application = await kycApi.getMyApplication();
        setKycApplication(application);
        setError(null);
      } catch (err: any) {
        // If 404, user hasn't created an application yet - that's okay
        if (err.message?.includes('404') || err.message?.includes('Not Found')) {
          setKycApplication(null);
        } else {
          // If authentication failed, clear token and redirect to login
          const status = (err as any).status;
          if (status === 401 || status === 403 ||
              err.message?.includes('401') || 
              err.message?.includes('403') ||
              err.message?.includes('Unauthorized') || 
              err.message?.includes('could not validate') ||
              err.message?.includes('Invalid credentials')) {
            logout();
            navigate('/login');
            return;
          }
          
          console.error('Error fetching KYC application:', err);
          setError(err.message || 'Failed to load KYC application');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchKYCData();
  }, [navigate]);

  // Fetch consent records
  useEffect(() => {
    const fetchConsents = async () => {
      if (!isAuthenticated() || !kycApplication?.ukn) {
        return;
      }

      try {
        setLoadingConsents(true);
        const consentList = await kycApi.getConsents();
        setConsents(consentList);
      } catch (err: any) {
        console.error('Error fetching consents:', err);
      } finally {
        setLoadingConsents(false);
      }
    };

    if (kycApplication?.status === 'VERIFIED') {
      fetchConsents();
    }
  }, [kycApplication]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getStatusIcon = (status: KYCStatus) => {
    switch (status) {
      case 'VERIFIED':
      case 'APPROVED':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'IN_REVIEW':
      case 'PROCESSING':
      case 'REGISTERED':
        return <Clock className="h-5 w-5 text-warning" />;
      case 'REJECTED':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'SUSPENDED':
      case 'EXPIRED':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Upload className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: KYCStatus) => {
    switch (status) {
      case 'VERIFIED':
      case 'APPROVED':
        return 'bg-success/10 text-success border-success/20';
      case 'IN_REVIEW':
      case 'PROCESSING':
      case 'REGISTERED':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'REJECTED':
      case 'SUSPENDED':
      case 'EXPIRED':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const copyUKN = () => {
    if (kycApplication?.ukn) {
      navigator.clipboard.writeText(kycApplication.ukn);
      toast.success('UKN copied to clipboard!');
    }
  };

  const shareUKN = () => {
    if (kycApplication?.ukn) {
      const shareData = {
        title: 'My KYC ID',
        text: `My Unique KYC Number: ${kycApplication.ukn}`,
        url: window.location.href
      };
      
      if (navigator.share) {
        navigator.share(shareData).catch(() => {
          copyUKN();
        });
      } else {
        copyUKN();
      }
    }
  };

  const handleGrantConsent = async (consentId: string) => {
    try {
      await kycApi.grantConsent(consentId);
      toast.success('Consent granted');
      // Refresh consents
      const consentList = await kycApi.getConsents();
      setConsents(consentList);
    } catch (err: any) {
      toast.error(err.message || 'Failed to grant consent');
    }
  };

  const handleRevokeConsent = async (consentId: string) => {
    try {
      await kycApi.revokeConsent(consentId);
      toast.success('Consent revoked');
      // Refresh consents
      const consentList = await kycApi.getConsents();
      setConsents(consentList);
    } catch (err: any) {
      toast.error(err.message || 'Failed to revoke consent');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#1DBF59] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">I</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">IdentiQ</h1>
              <p className="text-xs text-gray-600">User Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user?.email}</p>
              <Badge variant="outline" className="text-xs">User</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-700 hover:text-gray-900">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 md:py-8 max-w-5xl">
        <div className="space-y-6">
          {/* Welcome Section */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900">Welcome back!</h2>
            <p className="text-gray-600">
              Complete your identity verification to get started
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading your KYC status...</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {error && !loading && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="text-destructive">{error}</div>
              </CardContent>
            </Card>
          )}

          {/* Auto-Approval Success Message */}
          {!loading && kycApplication?.ukn && kycStatus === 'VERIFIED' && 
           kycApplication.reviewer_comment?.includes('Auto-approved') && (
            <Card className="border-success/20 bg-success/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="h-6 w-6 text-success mt-1" />
                  <div className="flex-1">
                    <h4 className="font-semibold mb-2 text-success">Application Auto-Approved!</h4>
                    <p className="text-sm text-muted-foreground">
                      Your application was automatically approved due to low risk score. 
                      Your UKN has been issued and you can now use it anywhere.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* UKN Card - Show when VERIFIED */}
          {!loading && kycApplication?.ukn && kycStatus === 'VERIFIED' && (
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">Your Unique KYC ID</CardTitle>
                    <CardDescription>
                      Use this ID anywhere - no need to upload documents again
                    </CardDescription>
                  </div>
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* UKN Display */}
                  <div className="bg-card p-6 rounded-lg border-2 border-primary/30">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-muted-foreground">UKN</span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={copyUKN}
                          className="h-8"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={shareUKN}
                          className="h-8"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="font-mono text-3xl font-bold text-primary mb-4 text-center">
                      {kycApplication.ukn}
                    </div>
                    
                    {/* QR Code */}
                    <div className="flex justify-center py-4 border-t border-border">
                      <div className="bg-white p-4 rounded-lg">
                        <QRCodeSVG
                          value={kycApplication.ukn}
                          size={200}
                          level="H"
                          includeMargin={true}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Verification Details */}
                  <div className="grid grid-cols-2 gap-4">
                    {kycApplication.verified_at && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Verified On</p>
                        <p className="text-sm font-medium">
                          {new Date(kycApplication.verified_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {kycApplication.expires_at && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Expires On</p>
                        <p className="text-sm font-medium">
                          {new Date(kycApplication.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {kycApplication.blockchain_tx_hash && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Blockchain Record</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {kycApplication.blockchain_tx_hash.slice(0, 20)}...
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(kycApplication.blockchain_tx_hash!);
                            toast.success('Transaction hash copied!');
                          }}
                          className="h-6"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Card */}
          {!loading && (
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>KYC Verification Status</CardTitle>
                    <CardDescription>
                      Your current verification progress
                    </CardDescription>
                  </div>
                  {getStatusIcon(kycStatus)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge className={getStatusColor(kycStatus)}>
                      {kycStatus.replace('_', ' ')}
                    </Badge>
                  </div>

                  {kycApplication && kycApplication.risk_score !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Risk Score:</span>
                      <Badge variant="outline">
                        {(kycApplication.risk_score * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  )}

                  {kycApplication && kycApplication.reviewer_comment && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground mb-1">
                        {kycApplication.reviewer_comment.includes('Auto-approved') 
                          ? 'System Message:' 
                          : 'Reviewer Comment:'}
                      </p>
                      <p className="text-sm">{kycApplication.reviewer_comment}</p>
                    </div>
                  )}

                  {/* Show processing status */}
                  {kycStatus === 'PROCESSING' && (
                    <div className="pt-4 border-t">
                      <div className="bg-warning/10 p-4 rounded-lg">
                        <p className="text-sm font-medium text-warning mb-2">
                          ⏳ Your application is being processed...
                        </p>
                        <p className="text-xs text-muted-foreground">
                          We're analyzing your documents and calculating risk score. 
                          Low risk applications are automatically approved.
                        </p>
                      </div>
                    </div>
                  )}

                  {kycStatus === 'IN_REVIEW' && (
                    <div className="pt-4 border-t">
                      <div className="bg-warning/10 p-4 rounded-lg">
                        <p className="text-sm font-medium text-warning mb-2">
                          📋 Your application is under review
                        </p>
                        <p className="text-xs text-muted-foreground">
                          A reviewer is examining your application. You'll be notified once verified.
                        </p>
                      </div>
                    </div>
                  )}

                  {kycStatus === 'DRAFT' && (
                    <div className="pt-4">
                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={() => navigate('/kyc-form')}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Start Verification Process
                      </Button>
                    </div>
                  )}

                  {kycStatus === 'VERIFIED' && kycApplication?.ukn && (
                    <div className="pt-4 border-t">
                      <div className="bg-success/10 p-4 rounded-lg">
                        <p className="text-sm font-medium text-success mb-2">
                          ✓ Your KYC is verified and active!
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Share your UKN with institutions to verify your identity instantly.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Process Steps */}
          <Card>
            <CardHeader>
              <CardTitle>Verification Process</CardTitle>
              <CardDescription>
                Follow these steps to complete your verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { 
                    step: 1, 
                    title: 'Upload Documents', 
                    description: 'Provide a valid ID (passport, driver\'s license, or national ID)',
                    completed: false 
                  },
                  { 
                    step: 2, 
                    title: 'Take a Selfie', 
                    description: 'Capture a clear photo of yourself for face matching',
                    completed: false 
                  },
                  { 
                    step: 3, 
                    title: 'Automated Verification', 
                    description: 'Our AI system will verify your documents and identity',
                    completed: false 
                  },
                  { 
                    step: 4, 
                    title: 'Review & Approval', 
                    description: 'If needed, a human reviewer will check your application',
                    completed: false 
                  },
                ].map((item) => (
                  <div 
                    key={item.step}
                    className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                      item.completed 
                        ? 'bg-success text-success-foreground' 
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {item.completed ? '✓' : item.step}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Consent Management - Show when VERIFIED */}
          {!loading && kycApplication?.ukn && kycStatus === 'VERIFIED' && (
            <Card>
              <CardHeader>
                <CardTitle>Consent Management</CardTitle>
                <CardDescription>
                  Manage which institutions can access your KYC data
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingConsents ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                ) : consents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No consent requests yet. Institutions will request access when they need to verify your identity.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {consents.map((consent) => (
                      <div
                        key={consent.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{consent.institution_name}</span>
                            {consent.consent_given ? (
                              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                                <Check className="h-3 w-3 mr-1" />
                                Granted
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                                Pending
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Purpose: {consent.purpose}
                          </p>
                          {consent.expires_at && (
                            <p className="text-xs text-muted-foreground">
                              Expires: {new Date(consent.expires_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {!consent.consent_given && (
                            <Button
                              size="sm"
                              onClick={() => handleGrantConsent(consent.id)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Grant
                            </Button>
                          )}
                          {consent.consent_given && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRevokeConsent(consent.id)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Revoke
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Help Section */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">Your Data is Secure</h4>
                  <p className="text-sm text-muted-foreground">
                    All documents are encrypted and stored securely. We use blockchain technology 
                    to maintain an immutable audit trail of all verification activities.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
});

UserDashboard.displayName = 'UserDashboard';

export default UserDashboard;
