'use client';

import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';


export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token || role !== 'admin') {
      toast.error('Access denied.');
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role="admin" />
      <div className="flex flex-col min-h-screen md:ml-64"> {/* sidebar width */}
        <Header
          user={{ name: 'Admin User', profilePic: '' }}
          onLogout={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            router.push('/login');
          }}
        />
        <Breadcrumb />
        <main className="flex-1 p-4">{children}</main>
      </div>
    </div>
  );
}
