'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { LogOut } from 'lucide-react';
import defaultPic from '../../public/images/library.jpg'; // fallback image

const Header = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; profilePic?: string | null }>({ name: 'User', profilePic: null });
  const router = useRouter();

  useEffect(() => {
    // Load and parse user info
    const stored = localStorage.getItem('UserDetails');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const userData = parsed.user || {}; // nested user
        const name =
          userData.name ||
          (userData.fName && userData.lName ? `${userData.fName} ${userData.lName}` : 'User');

        const profilePic = userData.profilePic || userData.studentImage || null;

        setUser({ name, profilePic });
        console.log('User loaded from localStorage:', name, profilePic);
      } catch (err) {
        console.error('Failed to parse user data:', err);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('email');
    localStorage.removeItem('rememberMe');
    localStorage.removeItem('UserDetails');
    toast.success('Logged out successfully');
    router.refresh();
    router.push('/login');
  };

  return (
    <header className="bg-gray-900 text-white p-4 flex justify-end items-center sticky top-0 z-10">
      <div
        className="flex items-center space-x-2 cursor-pointer"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        <Image
          src={user.profilePic || defaultPic}
          alt="Profile"
          width={50}
          height={50}
          className="rounded-full object-cover"
        />
        <span className="hidden sm:inline">{user.name}</span>
      </div>

      {isDropdownOpen && (
        <div className="absolute right-4 mt-32 w-48 bg-white border border-gray-200 text-black rounded-md shadow-lg py-2 z-50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2 text-xl" />
            Logout
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
