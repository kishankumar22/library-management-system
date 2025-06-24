// library-management-system/src/app/components/Sidebar.tsx
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  role: 'admin' | 'student';
}

const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const router = useRouter();

  const adminLinks = [
    { name: 'Subjects', href: '/admin/subjects' },
    { name: 'Publications', href: '/admin/publications' },
    { name: 'Books', href: '/admin/books' },
    { name: 'Courses', href: '/admin/courses' },
    { name: 'Students', href: '/admin/students' },
    { name: 'Student Report', href: '/admin/student-report' },
    { name: 'Book Issue', href: '/admin/book-issue' },
    { name: 'Book Report', href: '/admin/book-report' },
    { name: 'Issue Report', href: '/admin/issue-report' },
    { name: 'Return Book', href: '/admin/return-book' },
    { name: 'Penalty', href: '/admin/penalty' },
  ];

  const studentLinks = [
    { name: 'My Account', href: '/student/my-account' },
    { name: 'My Report', href: '/student/my-report' },
    { name: 'Penalty Report', href: '/student/penalty-report' },
    { name: 'Book Report', href: '/student/book-report' },
  ];

  const links = role === 'admin' ? adminLinks : studentLinks;

  return (
    <aside className="w-64 bg-gray-800 text-white h-screen p-4">
      <h2 className="text-xl font-bold mb-4">Library Management</h2>
      <nav>
        <ul>
          {links.map((link) => (
            <li key={link.href} className="mb-2">
              <Link href={link.href} className="hover:bg-gray-700 p-2 rounded block">
                {link.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;