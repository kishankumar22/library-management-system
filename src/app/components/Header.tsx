'use client';

import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { LogOut } from 'lucide-react';
import defaultPic from '../../public/images/library.jpg'; // fallback image

const Header = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; profilePic?: string | null }>({ name: 'User', profilePic: null });
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null); // Ref for dropdown to detect outside clicks

  useEffect(() => {
    // Load and parse user info from UserDetails
    const stored = localStorage.getItem('UserDetails');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const userData = parsed.user || {}; // Nested user object
        const name =
          userData.name ||
          (userData.fName && userData.lName ? `${userData.fName} ${userData.lName}` : 'User');
        const profilePic = userData.profile_pic_url || userData.studentImage || null;
        setUser({ name, profilePic });
        // console.log('User loaded from localStorage:', name, profilePic, userData);
      } catch (err) {
        console.error('Failed to parse user data:', err);
      }
    }

    // Event listener for outside clicks to close dropdown
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    // Add event listener when dropdown is open
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }

    // Cleanup event listener
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isDropdownOpen]); // Re-run when isDropdownOpen changes

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
    <header className="bg-gray-900 text-white p-2 flex justify-end items-center sticky top-0 z-20 shadow-md">
      <div
        className="flex items-center space-x-3 cursor-pointer hover:bg-gray-800 p-1 rounded-full transition-colors duration-200"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        <Image
          src={user.profilePic || defaultPic}
          alt="Profile"
          width={36}
          height={36}
          className="rounded-full w-12 h-12 object-cover border-2 border-gray-600"
        />
        <span className="hidden sm:inline text-sm font-medium">{user.name}</span>
      </div>

      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-4 top-20 -mt-1 w-44 bg-white text-black rounded-lg shadow-xl py-2 z-50 transform transition-all duration-200 ease-in-out scale-95 origin-top-right"
        >
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 hover:text-blue-600 transition-colors duration-150"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;