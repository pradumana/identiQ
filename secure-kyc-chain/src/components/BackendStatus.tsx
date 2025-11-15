import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export const BackendStatus = () => {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        // Try to reach the health endpoint (no auth required)
        const response = await fetch('http://localhost:8000/health');
        if (response.ok) {
          setStatus('online');
          setError(null);
        } else {
          setStatus('offline');
          setError(`Backend returned status ${response.status}`);
        }
      } catch (err: any) {
        setStatus('offline');
        setError(err.message || 'Cannot connect to backend');
      }
    };

    checkBackend();
    // Check every 5 seconds
    const interval = setInterval(checkBackend, 5000);
    return () => clearInterval(interval);
  }, []);

  if (status === 'checking') {
    return (
      <Alert className="mb-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertDescription>Checking backend connection...</AlertDescription>
      </Alert>
    );
  }

  if (status === 'offline') {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-semibold">Backend server is not running</p>
            <p className="text-sm">{error}</p>
            <p className="text-sm">
              Please start the backend server:
              <code className="ml-2 px-2 py-1 bg-muted rounded text-xs">
                cd backend && uvicorn main:app --reload
              </code>
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="mb-4 border-success/20 bg-success/5">
      <CheckCircle2 className="h-4 w-4 text-success" />
      <AlertDescription className="text-success">
        Backend server is running and connected
      </AlertDescription>
    </Alert>
  );
};

