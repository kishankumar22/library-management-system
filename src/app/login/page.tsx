'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import Image from 'next/image';
import axios from 'axios';
import pic from '../../public/images/Library.png';
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
  const [rememberedUser, setRememberedUser] = useState<string | null>(null);

  // Check for remembered user and validate token on mount
  useEffect(() => {
    const remembered = localStorage.getItem('rememberedUser');
    const token = localStorage.getItem('token');
    if (remembered && token) {
      setRememberedUser(remembered);
      setEmail(remembered);
      setRememberMe(true);
      validateToken(remembered, token);
    }
  }, []);

  // Handle resend OTP timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOtpSent && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOtpSent, resendTimer]);

  // Validate token for remembered user
  const validateToken = async (email: string, token: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post(
        '/api/auth/login',
        { email: email.toLowerCase(), step: 'verify' },
        { headers: { Authorization: `Bearer ${token}`, 'X-Remember-Me': rememberMe } }
      );

      const data = response.data;
      console.log('Token Validation Response:', data);
      if (response.status === 200 && data.token) {
        setUserType(data.userType);
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.userType);
        localStorage.setItem('rememberedUser', email.toLowerCase());
        toast.success('Auto-login successful');
        router.push(data.userType === 'admin' ? '/admin' : '/student');
        router.refresh();
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        toast.error(data.message || 'Invalid or expired token');
      }
    } catch (error: any) {
      console.error('Token validation error:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      toast.error(error.response?.data?.message || 'Error validating token');
    } finally {
      setIsLoading(false);
    }
  };

  // Check user type (admin or student)
  const checkUserType = async (email: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post('/api/auth/login', {
        email: email.toLowerCase(),
        step: 'email',
      });

      const data = response.data;
      console.log('Check User Type Response:', data);
      if (response.status === 200 && data.userType) {
        setUserType(data.userType);
        setStep('verify');
      } else {
        toast.error(data.message || 'Email not found');
      }
    } catch (error: any) {
      console.error('Error checking user type:', error);
      toast.error(error.response?.data?.message || 'An error occurred while checking user type');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle email submission
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Email is required');
      return;
    }
    await checkUserType(email);
  };

  // Handle login (password/DOB and OTP)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const body = {
        email: email.toLowerCase(),
        step: 'verify',
        ...(userType === 'admin' ? { password } : { dob }),
        rememberMe,
      };

      const response = await axios.post('/api/auth/login', body, {
        headers: { 'X-Remember-Me': rememberMe },
      });
      const data = response.data;
      console.log('Login Response:', data);

      if (response.status === 200) {
        if (data.otpRequired) {
          setIsOtpSent(true);
          setIsModalOpen(true);
          setResendTimer(59);
          toast.success('OTP sent to your email');
        } else if (data.token) {
          if (rememberMe) {
            localStorage.setItem('rememberedUser', email.toLowerCase());
            setRememberedUser(email.toLowerCase());
          } else {
            localStorage.removeItem('rememberedUser');
            setRememberedUser(null);
          }
          localStorage.setItem('token', data.token);
          localStorage.setItem('role', userType || '');
          toast.success('Logged in successfully');
          router.push(userType === 'admin' ? '/admin' : '/student');
          router.refresh();
        } else {
          toast.error('Login failed: No token received');
        }
      } else {
        toast.error(data.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP verification
  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post('/api/auth/otp', {
        email: email.toLowerCase(),
        otp: otp.trim(),
        role: userType,
      }, {
        headers: { 'X-Remember-Me': rememberMe },
      });

      const data = response.data;
      console.log('OTP Verification Response:', data);
      if (response.status === 200 && data.token) {
        if (rememberMe) {
          localStorage.setItem('rememberedUser', email.toLowerCase());
          setRememberedUser(email.toLowerCase());
        } else {
          localStorage.removeItem('rememberedUser');
          setRememberedUser(null);
        }
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', userType || '');
        setIsModalOpen(false);
        setIsOtpSent(false);
        setOtp('');
        setResendTimer(0);
        toast.success('OTP verified successfully');
        router.push(userType === 'admin' ? '/admin' : '/student');
        router.refresh();
      } else {
        toast.error(data.message || 'OTP verification failed');
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      toast.error(error.response?.data?.message || 'An error occurred during OTP verification');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setIsLoading(true);
    try {
      const body = {
        email: email.toLowerCase(),
        step: 'verify',
        ...(userType === 'admin' ? { password } : { dob }),
        rememberMe,
      };

      const response = await axios.post('/api/auth/login', body, {
        headers: { 'X-Remember-Me': rememberMe },
      });
      const data = response.data;
      console.log('Resend OTP Response:', data);

      if (response.status === 200 && data.otpRequired) {
        setResendTimer(59);
        toast.success('OTP resent to your email');
      } else {
        toast.error(data.message || 'Failed to resend OTP');
      }
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      toast.error(error.response?.data?.message || 'An error occurred while resending OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // Close OTP modal
  const closeModal = () => {
    setIsModalOpen(false);
    setOtp('');
    setIsOtpSent(false);
    setResendTimer(0);
  };

  // Go back to email step
  const goBackToEmail = () => {
    setStep('email');
    setUserType(null);
    setPassword('');
    setDob('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 p-4">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex justify-center mb-2">
          <Image
            src={pic}
            alt="Library Logo"
            width={100}
            height={100}
            className="rounded-full border-4 border-blue-500 shadow-md"
          />
        </div>
        <h2 className="text-3xl font-bold text-center mb-2 text-blue-700">Login</h2>

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())}
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
                    onChange={(e) => setOtp(e.target.value.trim())}
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