'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Menu } from 'lucide-react';
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
    '/admin/penalty': 'Penalty',
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

  const adminLinks = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Manage Subject', href: '/admin/subject', icon: LibraryBig },
    { name: 'Manage Publication', href: '/admin/publication', icon: NotebookPen },
    { name: 'Manage Book', href: '/admin/book', icon: Book },
    { name: 'Book Issue', href: '/admin/book-issue', icon: BookDown },
    { name: 'Book Stock History', href: '/admin/book-stock-history', icon: BookCopy },
    { name: 'Manage Penalty', href: '/admin/penalty', icon: AlertTriangle },
    { name: 'Payment History', href: '/admin/library-payment', icon: ClipboardList },
  ];

  const studentLinks = [
    { name: 'Dashboard', href: '/student', icon: LayoutDashboard },
    { name: 'My Account', href: '/student/my-account', icon: GraduationCap },
    { name: 'My Report', href: '/student/my-report', icon: FileText },
    { name: 'Penalty Report', href: '/student/penalty-report', icon: AlertTriangle },
  ];

  const links = role === 'admin' ? adminLinks : studentLinks;

  // Close sidebar on navigation (mobile)
  const handleLinkClick = () => {
    if (isOpen && window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mobile top-bar */}
      <div className="bg-gray-800 text-white flex items-center p-3 md:hidden fixed top-0 left-0 w-full z-20 shadow-md">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle Sidebar Menu"
          aria-expanded={isOpen}
          aria-controls="sidebar-nav"
          className="focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded"
        >
          <Menu size={24} />
        </button>
        <h2 className="text-lg font-bold ml-3 truncate">{currentTitle}</h2>
      </div>

      {/* Sidebar */}
      <aside
        id="sidebar-nav"
        className={`fixed top-0 left-0 h-screen bg-gray-800 text-white w-64 p-4 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 z-10 transition-transform duration-300 ease-in-out overflow-y-auto shadow-lg`}
      >
        <div className="flex items-center gap-3 mb-6 px-2  rounded-lg transition-colors duration-200">
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
            <span className="text-sm text-gray-300">Management</span>
          </Link>
        </div>

        <nav>
          <ul>
            {links.map(({ href, name, icon: Icon }) => (
              <li key={href} className="mb-1">
                <Link
                  href={href}
                  onClick={handleLinkClick}
                  className={`flex items-center gap-3 p-2 rounded transition-colors ${
                    pathname === href ? 'bg-gray-700 text-white font-semibold' : 'hover:bg-gray-700'
                  }`}
                  aria-current={pathname === href ? 'page' : undefined}
                >
                  <Icon className="w-5 h-5" />
                  <span>{name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black opacity-50 md:hidden z-0"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default Sidebar;