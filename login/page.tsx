
// library-management-system/src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import Image from 'next/image';
import pic from '../../public/images/library.jpg';

const LoginPage = () => {
  const router = useRouter();
  const [role, setRole] = useState<'admin' | 'student'>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = role === 'admin' 
        ? { email, password, role }
        : { email, dob, role };
      
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
          toast.success('OTP sent to your email');
        } else {
          localStorage.setItem('token', data.token);
          localStorage.setItem('role', role);
          if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
          }
          toast.success('Logged in successfully');
          router.push(role === 'admin' ? '/admin/students' : '/student/my-account');
          router.refresh();
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('An error occurred during login');
    }
  };

  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, role }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', role);
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }
        setIsModalOpen(false);
        setIsOtpSent(false);
        setOtp('');
        toast.success('OTP verified successfully');
        router.push(role === 'admin' ? '/admin/students' : '/student/my-account');
        router.refresh();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('An error occurred during OTP verification');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setOtp('');
    setIsOtpSent(false);
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
        <div className="flex justify-center gap-4 mb-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              value="admin"
              checked={role === 'admin'}
              onChange={() => setRole('admin')}
              className="form-radio text-blue-600 mr-2"
            />
            <span className="text-gray-700">Librarian</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              value="student"
              checked={role === 'student'}
              onChange={() => setRole('student')}
              className="form-radio text-blue-600 mr-2"
            />
            <span className="text-gray-700">Student</span>
          </label>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
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
          {role === 'admin' ? (
            <div>
              <label className="block text-sm font-semibold text-gray-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              />
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
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded transition duration-200"
          >
            Login
          </button>
        </form>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm">
              <h3 className="text-xl font-bold mb-4 text-blue-700">Enter OTP</h3>
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
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition duration-200"
                  >
                    Verify OTP
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
