'use client';

import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;

        if (!token || role !== 'admin') {
          toast.error('Access denied.');
          router.push('/login');
        }
      } catch (error) {
        toast.error('Authentication error. Please try again.');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <p className="text-gray-600 font-medium">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role="admin" />
      <div className="flex flex-col min-h-screen md:ml-64"> {/* Adjust margin based on sidebar state */}
        <Header />
        <Breadcrumb />
        <main className="flex-1 p-2">{children}</main>
      </div>
    </div>
  );
}