'use client';

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

interface SidebarProps {
  role: 'admin' | 'student';
}

const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Define route-to-title mappings
  const routeTitles = {
    '/admin': 'Dashboard',
    '/admin/subject': 'Manage Subject',
    '/admin/publication': 'Manage Publication',
    '/admin/book': 'Manage Book',
    '/admin/student-report': 'Student Report',
    '/admin/book-issue': 'Book Issue',
    '/admin/book-report': 'Book Report',
    '/admin/issue-report': 'Issue Report',
    '/admin/return-book': 'Return Book',
    '/admin/penalty': 'Penaltie',
    '/student': 'Dashboard',
    '/student/my-account': 'My Account',
    '/student/my-report': 'My Report',
    '/student/penalty-report': 'Penalty Report',
    '/student/book-report': 'Book Report',
  };

  // Get current page title based on route
  const currentTitle = routeTitles[pathname as keyof typeof routeTitles] || 'Library Management';

  // Set page title
  useEffect(() => {
    document.title = `${currentTitle} | Library Management`;
  }, [pathname, currentTitle]);

  const adminLinks = [
    { name: 'DashBoard', href: '/admin', icon: LayoutDashboard },
    { name: 'Manage Subject', href: '/admin/subject', icon: LibraryBig },
    { name: 'Manage Publication', href: '/admin/publication', icon: NotebookPen },
    { name: 'Manage Book', href: '/admin/book', icon: Book },
    // { name: 'Student Report', href: '/admin/student-report', icon: FileText },
    { name: 'Book Stock History', href: '/admin/book-stock-history', icon: BookCopy },
    { name: 'Book Issue', href: '/admin/book-issue', icon: BookDown },
    // { name: 'Issue Report', href: '/admin/issue-report', icon: ClipboardList },
    // { name: 'Return Book', href: '/admin/return-book', icon: BookOpenCheck },
    { name: 'Manage Penalty', href: '/admin/penalty', icon: AlertTriangle },
  ];

  const studentLinks = [
    { name: 'Dashboard', href: '/student', icon: LayoutDashboard },
    { name: 'My Account', href: '/student/my-account', icon: GraduationCap },
    { name: 'My Report', href: '/student/my-report', icon: FileText },
    { name: 'Penalty Report', href: '/student/penalty-report', icon: AlertTriangle },
    { name: 'Book Report', href: '/student/book-report', icon: BookCopy },
  ];

  const links = role === 'admin' ? adminLinks : studentLinks;

  return (
    <>
      {/* Mobile top-bar */}
      <div className="bg-gray-800 text-white flex items-center p-3 md:hidden fixed top-0 left-0 w-full z-20 shadow-md">
        <button onClick={() => setIsOpen(!isOpen)}>
          <Menu size={24} />
        </button>
        <h2 className="text-lg font-bold ml-3">{currentTitle}</h2>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-gray-800 text-white w-64 p-4 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 z-10 overflow-y-auto`}
      >
        <h2 className="text-xl font-bold mb-6 hidden md:block">Library Management</h2>
        <nav>
          <ul>
            {links.map(({ href, name, icon: Icon }) => (
              <li key={href} className="">
                <Link href={href} className="flex items-center gap-3 p-1.5 hover:bg-gray-700 rounded transition-colors">
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
        <div className="fixed inset-0 bg-black opacity-50 md:hidden z-0" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
};

export default Sidebar;