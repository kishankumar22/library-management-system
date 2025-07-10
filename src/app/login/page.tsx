'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import Image from 'next/image';
import axios from 'axios';
import pic from '../../public/images/logo.jpg';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faEye, faEyeSlash, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

const LoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'email' | 'verify'>('email');
  const [userType, setUserType] = useState<'admin' | 'student' | null>(null);
  const [rememberedUser, setRememberedUser] = useState<string | null>(null);

  // Auto-login if token exists
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

  const validateToken = async (email: string, token: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post(
        '/api/auth/login',
        { email: email.toLowerCase().trim(), step: 'verify' },
        { headers: { Authorization: `Bearer ${token}`, 'X-Remember-Me': rememberMe } }
      );
      const data = response.data;
      if (response.status === 200 && data.token) {
        setUserType(data.userType);
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.userType);
        localStorage.setItem('rememberedUser', email.toLowerCase().trim());
        localStorage.setItem('UserDetails', JSON.stringify(data || {}));
        toast.success('Auto-login successful');
        router.push(data.userType === 'admin' ? '/admin' : '/student');
        router.refresh();
      } else {
        localStorage.clear();
        toast.error(data.message || 'Invalid or expired token');
      }
    } catch (error: any) {
      localStorage.clear();
      toast.error(error.response?.data?.message || 'Error validating token');
    } finally {
      setIsLoading(false);
    }
  };

  const checkUserType = async (email: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post('/api/auth/login', {
        email: email.toLowerCase().trim(),
        step: 'email',
      });
      const data = response.data;
      if (response.status === 200 && data.userType) {
        setUserType(data.userType);
        setStep('verify');
      } else {
        toast.error(data.message || 'Email not found');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'An error occurred while checking user type');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error('Email is required');
    await checkUserType(email);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const body = {
        email: email.toLowerCase().trim(),
        step: 'verify',
        ...(userType === 'admin' ? { password } : { dob }),
        rememberMe,
      };

      const response = await axios.post('/api/auth/login', body, {
        headers: { 'X-Remember-Me': rememberMe },
      });
      const data = response.data;

      if (response.status === 200 && data.token) {
        if (rememberMe) {
          localStorage.setItem('rememberedUser', email.toLowerCase().trim());
        } else {
          localStorage.removeItem('rememberedUser');
        }
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', userType || '');
        localStorage.setItem('UserDetails', JSON.stringify(data || {}));
        toast.success('Logged in successfully');
        router.push(userType === 'admin' ? '/admin' : '/student');
        router.refresh();
      } else {
        toast.error(data.message || 'Login failed');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const goBackToEmail = () => {
    setStep('email');
    setUserType(null);
    setPassword('');
    setDob('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <Image
            src={pic}
            alt="Library Logo"
            width={100}
            height={100}
            priority
            className="rounded-full border-4 border-blue-500 shadow-md"
          />
        </div>

        {/* Branding */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-blue-800">JK Institute of Pharmacy</h1>
          <p className="text-sm text-gray-600">Library Management System</p>
        </div>

        {/* Email Step */}
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
              {isLoading && <FontAwesomeIcon icon={faSpinner} spin className="mr-2 animate-spin" />}
              Next
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="flex items-center mb-2">
              <button
                type="button"
                onClick={goBackToEmail}
                className="text-blue-600 hover:text-blue-800 mr-2"
              >
                <FontAwesomeIcon icon={faArrowLeft} />
              </button>
              <span className="text-gray-700">{email}</span>
            </div>

            {/* User Type Badge */}
            {userType && (
              <div className="text-center mb-2">
                <span className="inline-block bg-blue-600 text-white text-xs font-semibold rounded-full px-3 py-1 shadow">
                  {userType === 'admin' ? 'Admin Login' : 'Student Login'}
                </span>
              </div>
            )}

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
              {isLoading && <FontAwesomeIcon icon={faSpinner} spin className="mr-2 animate-spin" />}
              Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
