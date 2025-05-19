import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your email...');
  const { reloadUser } = useAuth();

  useEffect(() => {
    const verifyEmail = async () => {
      const oobCode = searchParams.get('oobCode');
      
      if (!oobCode) {
        setStatus('error');
        setMessage('Invalid verification link');
        return;
      }

      try {
        // In a real app, you would verify the email using the oobCode
        // For now, we'll just simulate a successful verification
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Reload user to get the latest email verification status
        await reloadUser();
        
        setStatus('success');
        setMessage('Your email has been verified successfully!');
        
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      } catch (error) {
        console.error('Email verification error:', error);
        setStatus('error');
        setMessage('Failed to verify email. The link may have expired or is invalid.');
      }
    };

    verifyEmail();
  }, [searchParams, navigate, reloadUser]);

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            {status === 'verifying' && (
              <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            )}
            {status === 'success' && (
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {status === 'error' && (
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {status === 'verifying' ? 'Verifying Email...' : status === 'success' ? 'Email Verified!' : 'Verification Failed'}
          </CardTitle>
          <CardDescription className="text-center">
            {message}
          </CardDescription>
        </CardHeader>
        {status === 'error' && (
          <CardFooter className="flex justify-center">
            <Button onClick={() => window.location.href = '/'}>
              Return to Home
            </Button>
          </CardFooter>
        )}
        {status === 'success' && (
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              Redirecting to dashboard...
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
