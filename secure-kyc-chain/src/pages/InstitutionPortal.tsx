import { useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  Loader2,
  Copy,
  Download,
  FileText,
  User,
  Calendar,
  Hash
} from 'lucide-react';
import { getCurrentUser, logout, isAuthenticated } from '@/lib/auth';
import { toast } from 'sonner';
import { institutionApi } from '@/lib/api';

interface KYCSummary {
  ukn: string;
  status: string;
  verified_name?: string;
  verified_age?: number;
  verified_address?: string;
  risk_score?: number;
  verified_at?: string;
  expires_at?: string;
  face_match_score?: number;
  blockchain_tx_hash?: string;
}

const InstitutionPortal = memo(() => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [ukn, setUkn] = useState('');
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);
  const [kycSummary, setKycSummary] = useState<KYCSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auth Guard
  if (!isAuthenticated() || !user) {
    navigate('/login');
    return null;
  }

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setKycSummary(null);

    if (!ukn.trim()) {
      setError('Please enter a UKN');
      return;
    }

    if (!purpose.trim()) {
      setError('Please specify the purpose for this verification');
      return;
    }

    setLoading(true);

    try {
      const summary = await institutionApi.resolveKyc(ukn, purpose) as KYCSummary;
      setKycSummary(summary);
      toast.success('KYC verified successfully');
    } catch (err: any) {
      console.error('KYC lookup error:', err);
      const status = (err as any).status;
      
      if (status === 404) {
        setError('UKN not found or not verified');
      } else if (status === 410) {
        setError('This KYC has expired');
      } else if (status === 401 || status === 403) {
        setError('You do not have permission to access this KYC');
        logout();
        navigate('/login');
      } else {
        setError(err.message || 'Failed to lookup KYC');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyUKN = () => {
    if (kycSummary?.ukn) {
      navigator.clipboard.writeText(kycSummary.ukn);
      toast.success('UKN copied to clipboard!');
    }
  };

  const downloadPDF = () => {
    // TODO: Implement PDF generation
    toast.info('PDF download feature coming soon');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getStatusColor = (status: string) => {
    if (status === 'VERIFIED') {
      return 'bg-success/10 text-success border-success/20';
    }
    return 'bg-muted text-muted-foreground';
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
              <p className="text-xs text-gray-600">Institution Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{user?.email}</p>
              <Badge variant="outline" className="text-xs capitalize">
                {user?.role}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-700 hover:text-gray-900">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 md:py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Welcome Section */}
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-gray-900">KYC Verification Portal</h2>
            <p className="text-gray-600">
              Enter a UKN to verify customer identity instantly
            </p>
          </div>

          {/* Lookup Form */}
          <Card>
            <CardHeader>
              <CardTitle>Lookup KYC by UKN</CardTitle>
              <CardDescription>
                Enter the Unique KYC Number provided by the customer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLookup} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="ukn">Unique KYC Number (UKN)</Label>
                  <Input
                    id="ukn"
                    placeholder="KYC-XXXX-XXXX-XXXX"
                    value={ukn}
                    onChange={(e) => setUkn(e.target.value.toUpperCase())}
                    required
                    disabled={loading}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: KYC-XXXX-XXXX-XXXX
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purpose">Verification Purpose</Label>
                  <Input
                    id="purpose"
                    placeholder="e.g., bank_account_opening, loan_application"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Specify why you need to verify this KYC
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Verify KYC
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* KYC Summary Results */}
          {kycSummary && (
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>KYC Verification Results</CardTitle>
                    <CardDescription>
                      Verified identity information
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyUKN}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy UKN
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadPDF}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Status */}
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      <span className="font-medium">Verification Status</span>
                    </div>
                    <Badge className={getStatusColor(kycSummary.status)}>
                      {kycSummary.status}
                    </Badge>
                  </div>

                  {/* UKN */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">UKN</span>
                    </div>
                    <p className="font-mono text-2xl font-bold text-primary">
                      {kycSummary.ukn}
                    </p>
                  </div>

                  {/* Verified Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {kycSummary.verified_name && (
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-muted-foreground">Name</span>
                        </div>
                        <p className="text-lg font-semibold">{kycSummary.verified_name}</p>
                      </div>
                    )}

                    {kycSummary.verified_age !== undefined && (
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-muted-foreground">Age</span>
                        </div>
                        <p className="text-lg font-semibold">{kycSummary.verified_age} years</p>
                      </div>
                    )}

                    {kycSummary.verified_address && (
                      <div className="p-4 border rounded-lg md:col-span-2">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-muted-foreground">Address</span>
                        </div>
                        <p className="text-lg font-semibold">{kycSummary.verified_address}</p>
                      </div>
                    )}
                  </div>

                  {/* Risk Score */}
                  {kycSummary.risk_score !== undefined && (
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Risk Score</span>
                        <Badge variant="outline" className={
                          kycSummary.risk_score < 0.3 
                            ? 'border-success text-success' 
                            : kycSummary.risk_score < 0.6
                            ? 'border-warning text-warning'
                            : 'border-destructive text-destructive'
                        }>
                          {(kycSummary.risk_score * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Verification Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    {kycSummary.verified_at && (
                      <div className="p-4 border rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Verified On</p>
                        <p className="text-sm font-medium">
                          {new Date(kycSummary.verified_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {kycSummary.expires_at && (
                      <div className="p-4 border rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Expires On</p>
                        <p className="text-sm font-medium">
                          {new Date(kycSummary.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Blockchain Record */}
                  {kycSummary.blockchain_tx_hash && (
                    <div className="p-4 border rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Blockchain Transaction</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-background px-2 py-1 rounded font-mono flex-1">
                          {kycSummary.blockchain_tx_hash}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(kycSummary.blockchain_tx_hash!);
                            toast.success('Transaction hash copied!');
                          }}
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

          {/* Info Card */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">How It Works</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Customers register once with IdentiQ and receive a Unique KYC Number (UKN).
                    When they need to verify their identity with your institution, they simply
                    provide their UKN. No document uploads required!
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Instant verification - no waiting for document processing</li>
                    <li>Blockchain-verified identity records</li>
                    <li>Reduced fraud with face deduplication</li>
                    <li>GDPR-compliant consent management</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
});

InstitutionPortal.displayName = 'InstitutionPortal';

export default InstitutionPortal;

