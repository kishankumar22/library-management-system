'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { LogOut } from 'lucide-react';
import pic from '../../public/images/library.jpg';

interface HeaderProps {
  user: { name: string; profilePic?: string };
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('email');
    localStorage.removeItem('rememberMe');
    onLogout();
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
          src={user.profilePic || pic}
          alt="Profile"
          width={40}
          height={40}
          className="rounded-full"
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