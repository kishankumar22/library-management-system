'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Breadcrumb: React.FC = () => {
  const pathname = usePathname();
  const pathSegments = pathname.split('/').filter((segment) => segment);

  // Remove 'admin' from breadcrumb display but keep in path
  const visibleSegments = pathSegments[0] === 'admin' ? pathSegments.slice(1) : pathSegments;

  return (
    <nav className="flex items-center space-x-2 text-md text-gray-600 bg-gray-50 p-2">
      <Link href="/admin" className="hover:underline">Home</Link>
      {visibleSegments.map((segment, index) => {
        const href = `/admin/${visibleSegments.slice(0, index + 1).join('/')}`;
        const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');

        return (
          <span key={index} className="flex items-center">
            <span className="mx-2">/</span>
            <Link href={href} className="hover:underline">{label}</Link>
          </span>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
