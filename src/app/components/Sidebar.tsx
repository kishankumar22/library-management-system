'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ClipboardMinus, LayoutDashboard, Menu, X } from 'lucide-react';
import {
  Book,
  LibraryBig,
  GraduationCap,
  FileText,
  ClipboardList,
  NotebookPen,
  BookOpenCheck,
  BookCopy,
  AlertTriangle,
  BookDown,
} from 'lucide-react';
import defaultPic from '../../public/images/logo.jpg'; // fallback image

interface SidebarProps {
  role: 'admin' | 'student';
}

const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Define route-to-title mappings
  const routeTitles: { [key: string]: string } = {
    '/admin': 'Dashboard',
    '/admin/subject': 'Manage Subject',
    '/admin/publication': 'Manage Publication',
    '/admin/book': 'Manage Book',
    '/admin/student-report': 'Student Report',
    '/admin/book-issue': 'Book Issue',
    '/admin/book-report': 'Book Report',
    '/admin/issue-report': 'Issue Report',
    '/admin/library-payment': 'Library Payment',
    '/admin/view-logs': 'View Logs',
    '/admin/penalty': 'Penalty',
    '/admin/book-stock-history': 'Book Stock History',
    '/student': 'Dashboard',
    '/student/my-account': 'My Account',
    '/student/my-report': 'My Report',
    '/student/penalty-report': 'Penalty Report',
    '/student/book-report': 'Book Report',
  };

  // Get current page title based on route, with fallback
  const currentTitle = routeTitles[pathname] || 'Library Management';

  // Set page title
  useEffect(() => {
    document.title = `${currentTitle} | Library Management`;
  }, [pathname, currentTitle]);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Handle escape key to close sidebar on mobile
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      // Prevent background scrolling when mobile sidebar is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const adminLinks = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Manage Subject', href: '/admin/subject', icon: LibraryBig },
    { name: 'Manage Publication', href: '/admin/publication', icon: NotebookPen },
    { name: 'Manage Book', href: '/admin/book', icon: Book },
    { name: 'Book Issue', href: '/admin/book-issue', icon: BookDown },
    { name: 'Manage Penalty', href: '/admin/penalty', icon: AlertTriangle },
    { name: 'Payment History', href: '/admin/library-payment', icon: ClipboardList },
    { name: 'Book Stock History', href: '/admin/book-stock-history', icon: BookCopy },
    { name: 'View Logs', href: '/admin/view-logs', icon: ClipboardMinus },
  ];

  const studentLinks = [
    { name: 'Dashboard', href: '/student', icon: LayoutDashboard },
    { name: 'My Account', href: '/student/my-account', icon: GraduationCap },
    { name: 'My Report', href: '/student/my-report', icon: FileText },
    { name: 'Penalty Report', href: '/student/penalty-report', icon: AlertTriangle },
  ];

  const links = role === 'admin' ? adminLinks : studentLinks;

  // Handle link clicks - close sidebar on mobile
  const handleLinkClick = () => {
    setIsOpen(false);
  };

  // Handle sidebar toggle
  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile Header Bar - Only visible on mobile devices */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gray-800 text-white shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleSidebar}
              className="p-1 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
              aria-label="Toggle navigation menu"
              aria-expanded={isOpen}
              aria-controls="mobile-sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold truncate">
              {currentTitle}
            </h1>
          </div>
        </div>
      </div>

      {/* Main Sidebar - Responsive behavior */}
      <aside
        id="mobile-sidebar"
        className={`fixed top-0 left-0 h-screen w-64 bg-gray-800 text-white shadow-xl transform transition-transform duration-300 ease-in-out z-40 overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-white shadow-md">
              <Image
                src={defaultPic}
                alt="JK Library Logo"
                width={48}
                height={48}
                className="object-contain w-full h-full"
                priority
              />
            </div>
            <Link
              href={role === 'admin' ? '/admin' : '/student'}
              className="flex flex-col leading-snug"
              onClick={handleLinkClick}
              aria-label="Navigate to Dashboard"
            >
              <h2 className="text-xl font-bold text-white">
                JK <span className="text-blue-400">Library</span>
              </h2>
              <span className="text-sm text-gray-300">Management System</span>
            </Link>
          </div>
          
          {/* Close button - only visible on mobile */}
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 md:hidden transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1">
          {links.map(({ href, name, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium flex items-center justify-center gap-2">{name}
                    {isActive && (
                  <div className="ml-auto w-2 h-2 bg-blue-200 rounded-full animate-pulse"></div>
                )}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700 bg-gray-800">
          <div className="text-center text-xs text-gray-400">
            <p>© 2024 JK Library</p>
            <p>Management System</p>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay - Only visible when sidebar is open on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default Sidebar;