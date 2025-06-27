// library-management-system/src/app/components/Breadcrumb.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Breadcrumb: React.FC = () => {
  const pathname = usePathname();
  const pathSegments = pathname.split('/').filter((segment) => segment);

  return (
    <nav className="flex items-center space-x-2 text-md text-gray-600 bg-gray-50 p-2">
      <Link href="/admin" className="hover:underline">Home</Link>
      {pathSegments.map((segment, index) => (
        <span key={index} className="flex items-center">
          <span className="mx-2">/</span>
          <Link href={`/${pathSegments.slice(0, index + 1).join('/')}`} className="hover:underline">
            {segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ')}
          </Link>
        </span>
      ))}
    </nav>
  );
};

export default Breadcrumb;