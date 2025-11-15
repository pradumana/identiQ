import { useNavigate } from 'react-router-dom';
import { memo, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Shield, Lock, CheckCircle, Zap, FileCheck, Users } from 'lucide-react';
import { isAuthenticated, getCurrentUser } from '@/lib/auth';
import { authApi } from '@/lib/api';
import { BackendStatus } from '@/components/BackendStatus';

const Index = memo(() => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const validateAndRedirect = async () => {
      if (!isAuthenticated()) {
        setCheckingAuth(false);
        return;
      }

      // Validate token by calling /auth/me
      try {
        await authApi.getMe();
        // Token is valid, redirect to appropriate dashboard
        if (user?.role === 'admin') {
          navigate('/admin/dashboard');
        } else if (user?.role === 'reviewer') {
          navigate('/admin/dashboard'); // Reviewers also go to admin dashboard but with limited access
        } else {
          navigate('/dashboard');
        }
      } catch (error: any) {
        // Check if it's a network/backend error
        if (error.message?.includes('fetch') || 
            error.message?.includes('Failed to fetch') ||
            error.message?.includes('NetworkError') ||
            error.status === 0) {
          // Backend is not available - don't clear token, just stay on index
          console.log('Backend not available, staying on index page');
        } else {
          // Token is invalid, clear it and stay on index page
          console.log('Invalid token, clearing authentication');
          localStorage.removeItem('kyc_auth_token');
          localStorage.removeItem('kyc_user');
        }
      } finally {
        setCheckingAuth(false);
      }
    };

    validateAndRedirect();
  }, [user, navigate]);

  const features = [
    {
      icon: FileCheck,
      title: 'One-Time Registration',
      description: 'Complete your KYC verification once. Get a permanent UKN that works across all institutions and services. No repeated document uploads.',
    },
    {
      icon: Users,
      title: 'Biometric Security',
      description: 'Advanced facial recognition and liveness detection ensure your identity is unique and secure. One person, one UKN—globally verified.',
    },
    {
      icon: Zap,
      title: 'Instant Verification',
      description: 'Institutions can verify your identity in seconds using your UKN. Real-time risk assessment with AI-powered fraud detection.',
    },
    {
      icon: Lock,
      title: 'Blockchain Protected',
      description: 'Your verification records are stored on an immutable blockchain. Tamper-proof, transparent, and compliant with global regulations.',
    },
  ];

  // Show loading state while validating authentication
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      {/* Backend Status Check */}
      <div className="container mx-auto px-4 pt-4">
        <BackendStatus />
      </div>
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="p-4 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-lg">
                <Shield className="h-16 w-16 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-foreground rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
              </div>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            IdentiQ
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              One-Time KYC, Lifetime Access
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Complete your KYC verification once and get a permanent Unique KYC Number (UKN). 
            Use it anywhere—banks, institutions, and services—without uploading documents again.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              onClick={() => navigate('/register')}
              className="text-lg px-8 h-12"
            >
              Get Started
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate('/login')}
              className="text-lg px-8 h-12"
            >
              Sign In
            </Button>
          </div>

          <div className="flex items-center justify-center gap-6 pt-8 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span>ISO 27001 Certified</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span>GDPR & SOC 2 Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span>Bank-Grade Encryption</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span>99.9% Uptime SLA</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            Why Choose IdentiQ?
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Trusted by leading financial institutions, government agencies, and businesses worldwide. 
            Your identity, verified once, accepted everywhere.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all hover:shadow-lg"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-6 p-12 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
          <h2 className="text-3xl font-bold">
            Get Your Unique KYC Number Today
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Join millions of users who have simplified their identity verification. 
            One registration, lifetime access. Start your secure KYC journey in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => navigate('/register')}
              className="text-lg px-8 h-12"
            >
              Create Your UKN Now
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => navigate('/login')}
              className="text-lg px-8 h-12"
            >
              Already Have UKN? Sign In
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            🔒 Your data is encrypted and stored securely. We never share your information without your explicit consent.
          </p>
        </div>
      </section>
    </div>
  );
});

Index.displayName = 'Index';

export default Index;
