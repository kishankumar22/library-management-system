'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import Image from 'next/image';
import pic from '../../public/images/library.jpg';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faEye, faEyeSlash, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

const LoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'email' | 'verify'>('email');
  const [userType, setUserType] = useState<'admin' | 'student' | null>(null);

  // Load localStorage data on client side
  useEffect(() => {
    const storedEmail = localStorage.getItem('email') || '';
    const storedRememberMe = localStorage.getItem('rememberMe') === 'true';
    const token = localStorage.getItem('token');

    setEmail(storedEmail);
    setRememberMe(storedRememberMe);

    if (token && storedEmail) {
      checkUserType(storedEmail, true);
    }
  }, [router]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOtpSent && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOtpSent, resendTimer]);

  const checkUserType = async (email: string, isAutoLogin = false) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': isAutoLogin ? `Bearer ${localStorage.getItem('token')}` : '',
        },
        body: JSON.stringify({ email, step: 'email' }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        if (data.userType) {
          setUserType(data.userType);
          setStep('verify');
          
          if (isAutoLogin && data.userType === 'admin') {
            // For auto-login, we need to check the token
            const token = localStorage.getItem('token');
            if (token) {
              const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ email, step: 'verify' }),
              });
              
              const data = await res.json();
              if (res.ok) {
                if (data.token) {
                  localStorage.setItem('token', data.token);
                  localStorage.setItem('role', 'admin');
                  localStorage.setItem('email', email);
                  toast.success('Auto-login successful');
                  router.push('/admin/students');
                  router.refresh();
                }
              }
            }
          }
        } else {
          toast.error('User type not found');
        }
      } else {
        toast.error(data.message || 'Email not found');
      }
    } catch (error: any) {
      console.error('Error checking user type:', error);
      toast.error('An error occurred while checking user type');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Email is required');
      return;
    }
    
    if (rememberMe) {
      localStorage.setItem('email', email);
      localStorage.setItem('rememberMe', 'true');
    } else {
      localStorage.removeItem('email');
      localStorage.removeItem('rememberMe');
    }
    
    await checkUserType(email);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const storedEmail = localStorage.getItem('email');
      
      if (token && storedEmail === email) {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Remember-Me': rememberMe.toString(),
          },
          body: JSON.stringify({ email, step: 'verify', skipOTP: true }),
        });
        
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem('token', data.token || token);
          localStorage.setItem('role', userType || '');
          localStorage.setItem('email', email);
          if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
          }
          toast.success('Logged in successfully');
          router.push(userType === 'admin' ? '/admin/students' : '/student/my-account');
          router.refresh();
        } else {
          toast.error(data.message || 'Login failed');
        }
      } else {
        const body = { 
          email, 
          step: 'verify',
          ...(userType === 'admin' ? { password } : { dob }),
          rememberMe 
        };
        
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Remember-Me': rememberMe.toString(),
          },
          body: JSON.stringify(body),
        });
        
        const data = await res.json();
        if (res.ok) {
          if (data.otpRequired) {
            setIsOtpSent(true);
            setIsModalOpen(true);
            setResendTimer(55);
            toast.success('OTP sent to your email');
          } else {
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', userType || '');
            localStorage.setItem('email', email);
            if (rememberMe) {
              localStorage.setItem('rememberMe', 'true');
            }
            toast.success('Logged in successfully');
            router.push(userType === 'admin' ? '/admin/students' : '/student/my-account');
            router.refresh();
          }
        } else {
          toast.error(data.message || 'Login failed');
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Remember-Me': rememberMe.toString(),
        },
        body: JSON.stringify({ email, otp, role: userType }),
      });
      
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', userType || '');
        localStorage.setItem('email', email);
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }
        setIsModalOpen(false);
        setIsOtpSent(false);
        setOtp('');
        setResendTimer(0);
        toast.success('OTP verified successfully');
        router.push(userType === 'admin' ? '/admin/students' : '/student/my-account');
        router.refresh();
      } else {
        toast.error(data.message || 'OTP verification failed');
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      toast.error('An error occurred during OTP verification');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setIsLoading(true);
    try {
      const body = { 
        email, 
        step: 'verify',
        ...(userType === 'admin' ? { password } : { dob }),
        rememberMe 
      };
      
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Remember-Me': rememberMe.toString(),
        },
        body: JSON.stringify(body),
      });
      
      const data = await res.json();
      if (res.ok && data.otpRequired) {
        setResendTimer(55);
        toast.success('OTP resent to your email');
      } else {
        toast.error(data.message || 'Failed to resend OTP');
      }
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      toast.error('An error occurred while resending OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setOtp('');
    setIsOtpSent(false);
    setResendTimer(0);
  };

  const goBackToEmail = () => {
    setStep('email');
    setUserType(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 p-4">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md">
        <h2 className="text-3xl font-bold text-center mb-6 text-blue-700">🔐 Login</h2>
        <div className="flex justify-center mb-6">
          <Image
            src={pic}
            alt="Library Logo"
            width={100}
            height={100}
            className="rounded-full border-4 border-blue-500 shadow-md"
          />
        </div>
        
        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>
            
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="form-checkbox text-blue-600 mr-2"
              />
              <span className="text-gray-700">Remember Me</span>
            </label>
            
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded transition duration-200 flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading && <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />}
              Next
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="flex items-center mb-4">
              <button
                type="button"
                onClick={goBackToEmail}
                className="text-blue-600 hover:text-blue-800 mr-2"
              >
                <FontAwesomeIcon icon={faArrowLeft} />
              </button>
              <span className="text-gray-700">{email}</span>
            </div>
            
            {userType === 'admin' ? (
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700">Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full mt-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 mt-2.5"
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                </button>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-gray-700">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full mt-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                  required
                />
              </div>
            )}
            
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded transition duration-200 flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading && <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />}
              Login
            </button>
          </form>
        )}
        
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm">
              <h3 className="text-xl font-bold mb-4 text-blue-700">Enter OTP</h3>
              <p className="text-sm text-gray-600 mb-4">We've sent a 6-digit OTP to {email}</p>
              <form onSubmit={handleOtpVerification} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">OTP</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full mt-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="bg-gray-500 hover:bg-gray-600 text-white p-2 rounded transition duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition duration-200 flex items-center justify-center"
                    disabled={isLoading}
                  >
                    {isLoading && <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />}
                    Verify OTP
                  </button>
                </div>
              </form>
              <p className="text-sm text-gray-500 mt-4">
                Resend OTP in {resendTimer > 0 ? resendTimer : '0'}s{' '}
                <button
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || isLoading}
                  className="text-blue-600 hover:text-blue-800 disabled:text-gray-400 ml-2"
                >
                  Resend OTP
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;