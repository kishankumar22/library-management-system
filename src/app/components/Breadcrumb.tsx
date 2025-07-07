'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { useState, useEffect } from 'react';

const Breadcrumb: React.FC = () => {
  const pathname = usePathname();
  const [role, setRole] = useState<'admin' | 'student' | null>(null);

  // Load role from localStorage
  useEffect(() => {
    const storedRole = localStorage.getItem('role') as 'admin' | 'student' | null;
    setRole(storedRole || 'student'); // Fallback to 'student' if role is not set
  }, []);

  // Split the path into segments and filter out empty ones
  const pathSegments = pathname.split('/').filter((segment) => segment);

  // Determine base path based on role
  const basePath = role === 'admin' ? '/admin' : '/student';

  // Remove 'admin' or 'student' from breadcrumb display but keep in path for navigation
  const visibleSegments = pathSegments[0] === 'admin' || pathSegments[0] === 'student' ? pathSegments.slice(1) : pathSegments;

  // Get the current page title (last segment, formatted)
  const currentPageTitle = visibleSegments.length > 0
    ? visibleSegments[visibleSegments.length - 1]
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : 'Dashboard';

  // Create breadcrumb items for navigation
  const breadcrumbItems = [
    { label: 'Home', href: basePath, isHome: true }
  ];

  // Add each segment as a breadcrumb item
  visibleSegments.forEach((segment, index) => {
    const href = `${basePath}/${visibleSegments.slice(0, index + 1).join('/')}`;
    const label = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    breadcrumbItems.push({ label, href, isHome: false });
  });

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        {/* Left side - Page Title */}
        <div className="flex-shrink-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            {currentPageTitle}
          </h1>
        </div>

        {/* Right side - Breadcrumb Navigation */}
        <nav className="flex items-center space-x-1 text-sm text-gray-500">
          {breadcrumbItems.map((item, index) => (
            <div key={index} className="flex items-center">
              {/* Add separator before each item except the first */}
              {index > 0 && (
                <FontAwesomeIcon
                  icon={faChevronRight}
                  className="w-3 h-3 mx-2 text-gray-400"
                />
              )}

              {/* Breadcrumb item */}
              {index === breadcrumbItems.length - 1 ? (
                // Current page - not clickable, different styling
                <span className="text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-md">
                  {item.isHome ? (
                    <FontAwesomeIcon icon={faHome} className="w-3 h-3" />
                  ) : (
                    item.label
                  )}
                </span>
              ) : (
                // Clickable breadcrumb links
                <Link
                  href={item.href}
                  className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors duration-200 flex items-center"
                >
                  {item.isHome ? (
                    <FontAwesomeIcon icon={faHome} className="w-3 h-3" />
                  ) : (
                    item.label
                  )}
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Breadcrumb;