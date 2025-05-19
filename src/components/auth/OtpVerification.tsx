import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const OtpVerification: React.FC = () => {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  
  const { verifyOtp, sendOtp, resetOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const phoneNumber = location.state?.phoneNumber;

  useEffect(() => {
    if (!phoneNumber) {
      toast.error('Phone number is required');
      navigate('/signup');
      return;
    }

    // Start the countdown for resend OTP
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Send OTP when component mounts
    const sendInitialOtp = async () => {
      try {
        setIsLoading(true);
        const id = await sendOtp(phoneNumber);
        setVerificationId(id);
        toast.success('OTP sent successfully');
      } catch (error: any) {
        toast.error(error.message || 'Failed to send OTP');
      } finally {
        setIsLoading(false);
      }
    };

    sendInitialOtp();

    return () => {
      clearInterval(timer);
      resetOtp();
    };
  }, [phoneNumber, sendOtp, resetOtp, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationId || !otp) {
      toast.error('Please enter the OTP');
      return;
    }

    try {
      setIsLoading(true);
      const isValid = await verifyOtp(verificationId, otp);
      
      if (isValid) {
        toast.success('Phone number verified successfully');
        // Redirect to dashboard after successful verification
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    
    try {
      setIsLoading(true);
      setCanResend(false);
      setCountdown(60);
      
      const id = await sendOtp(phoneNumber);
      setVerificationId(id);
      
      // Restart countdown
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      toast.success('New OTP sent successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend OTP');
      setCanResend(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verify Your Phone Number
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We've sent a verification code to {phoneNumber}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="otp" className="sr-only">
                Enter OTP
              </label>
              <input
                id="otp"
                name="otp"
                type="text"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Enter 6-digit OTP"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                isLoading || otp.length !== 6
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {isLoading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </div>
          
          <div className="text-center">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={!canResend || isLoading}
              className={`text-sm font-medium ${
                canResend ? 'text-indigo-600 hover:text-indigo-500' : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              {canResend ? 'Resend OTP' : `Resend OTP in ${countdown}s`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OtpVerification;
