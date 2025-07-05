'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

import { useUser } from '@/app/hooks/useUser';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBook,
  faSpinner,
  faFilter,
  faSearch,
  faCalendarDays,
  faFileExcel,
  faChevronLeft,
  faChevronRight,
  faSort
} from '@fortawesome/free-solid-svg-icons';


export default function BookReportPage() {
  const user = useUser();
  const [studentId, setStudentId] = useState<number | null>(null);
  const [bookIssues, setBookIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<'all' | 'issued' | 'overdue' | 'returned'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('IssueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  // Fetch student ID from email
  useEffect(() => {
    const fetchStudentId = async () => {
      try {
        const response = await axios.get('/api/student');
        const students = response.data;

        const currentStudent = students.find(
          (student: { email: string }) => student.email === user.email
        );

        if (currentStudent) {
          setStudentId(currentStudent.id);
        } else {
          console.warn('No student found for this email');
        }
      } catch (err) {
        console.error('Error fetching student:', err);
      }
    };

    if (user?.email) {
      fetchStudentId();
    }
  }, [user]);

  // Fetch book issues
  useEffect(() => {
    const fetchBookIssues = async () => {
      try {
        const response = await axios.get('/api/book-issue');
        setBookIssues(response.data);
      } catch (err) {
        console.error('Error fetching book issues:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookIssues();
  }, []);

  if (!user || !studentId) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        <FontAwesomeIcon icon={faSpinner} spin  className='w-6 h-6' />
        Loading...
      </div>
    );
  }

  // Filter by StudentId
  let filteredIssues = bookIssues.filter((issue) => issue.StudentId === studentId);

  // Filter by Status
  if (statusFilter === 'issued') {
    filteredIssues = filteredIssues.filter((issue) => issue.Status !== 'returned');
  } else if (statusFilter === 'returned') {
    filteredIssues = filteredIssues.filter((issue) => issue.Status === 'returned');
  } else if (statusFilter === 'overdue') {
    const now = new Date();
    filteredIssues = filteredIssues.filter(
      (issue) => issue.Status !== 'returned' && new Date(issue.DueDate) < now
    );
  }

  // Filter by search term
  if (searchTerm.trim() !== '') {
    filteredIssues = filteredIssues.filter((issue) =>
      issue.BookTitle.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Sort
  filteredIssues.sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];

    if (sortBy === 'IssueDate' || sortBy === 'DueDate') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    } else if (sortBy === 'Days') {
      const aDays = Math.ceil(
        (new Date(a.DueDate).getTime() - new Date(a.IssueDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      const bDays = Math.ceil(
        (new Date(b.DueDate).getTime() - new Date(b.IssueDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      aValue = aDays;
      bValue = bDays;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Label
  let listLabel = '';
  if (statusFilter === 'all') {
    listLabel = `📚 Total Books: ${filteredIssues.length}`;
  } else if (statusFilter === 'issued') {
    listLabel = `📕 Issued Books: ${filteredIssues.length}`;
  } else if (statusFilter === 'returned') {
    listLabel = `📗 Returned Books: ${filteredIssues.length}`;
  } else if (statusFilter === 'overdue') {
    listLabel = `⏰ Overdue Books: ${filteredIssues.length}`;
  }

  // Pagination
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredIssues.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredIssues.length / rowsPerPage);

//   // Export to Excel
//   const handleExport = () => {
//     if(filteredIssues.length==0){
//         toast.warn("No Data To export")
//         return;
//     }
//     const exportData = filteredIssues.map((issue) => ({
//       BookTitle: issue.BookTitle,
//       IssueDate: new Date(issue.IssueDate).toLocaleString(),
//       DueDate: new Date(issue.DueDate).toLocaleString(),
//       Days: Math.ceil(
//         (new Date(issue.DueDate).getTime() - new Date(issue.IssueDate).getTime()) /
//           (1000 * 60 * 60 * 24)
//       ),
//       Status: issue.Status
//     }));

//     const worksheet = XLSX.utils.json_to_sheet(exportData);
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, 'Book Report');

//     XLSX.writeFile(workbook, 'BookReport.xlsx');
//   };

  return (
    <div className="min-h-screen p-2 bg-white text-black">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-indigo-800">
          <FontAwesomeIcon icon={faBook} />
          My Book Report
        </h1>
        {/* <button
          onClick={handleExport}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2"
        >
          <FontAwesomeIcon icon={faFileExcel} /> Export Excel
        </button> */}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-2">
        <div className="flex items-center gap-2">
                  <div className="flex items-center text-lg font-medium text-green-700">{listLabel}</div>
          <FontAwesomeIcon icon={faFilter} className="text-gray-600" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="border px-3 py-1 rounded"
          >
            <option value="all">All</option>
            <option value="issued">Issued</option>
            <option value="overdue">Overdue</option>
            <option value="returned">Returned</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faSearch} className="text-gray-600" />
          <input
            type="text"
            placeholder="Search Book Title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border px-3 py-1 rounded w-64"
          />
        </div>
      </div>

      {/* Dynamic Label */}


      {loading && (
        <p className="text-gray-500 flex items-center gap-2">
          <FontAwesomeIcon icon={faSpinner} spin />
          Loading book issues...
        </p>
      )}

      {!loading && currentRows.length === 0 && (
        <p className="text-gray-500">No books found for these filters.</p>
      )}

      {!loading && currentRows.length > 0 && (
        <div className="overflow-x-auto border border-gray-200 rounded shadow-sm">
          <table className="min-w-full border-collapse">
            <thead className="bg-indigo-50">
              <tr>
                {[
                  { label: '📖 Book Title', key: 'BookTitle' },
                  { label: '📅 Issue Date', key: 'IssueDate' },
                  { label: '⏳ Due Date', key: 'DueDate' },
                  { label: '📆 Days', key: 'Days' },
                  { label: '🏷️ Status', key: 'Status' }
                ].map((col) => (
                  <th
                    key={col.key}
                    className="border px-4 py-2 text-left cursor-pointer hover:bg-indigo-100"
                    onClick={() => {
                      if (sortBy === col.key) {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy(col.key);
                        setSortOrder('asc');
                      }
                    }}
                  >
                    {col.label} <FontAwesomeIcon icon={faSort} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentRows.map((issue) => {
                const days = Math.ceil(
                  (new Date(issue.DueDate).getTime() - new Date(issue.IssueDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                );

                let rowColor = '';
                if (issue.Status === 'returned') {
                  rowColor = 'bg-green-50';
                } else if (new Date(issue.DueDate) < new Date() && issue.Status !== 'returned') {
                  rowColor = 'bg-red-50';
                } else {
                  rowColor = 'bg-yellow-50';
                }

                return (
                  <tr key={issue.IssueId} className={`hover:bg-gray-100 ${rowColor}`}>
                    <td className="border px-4 py-2">{issue.BookTitle}</td>
                    <td className="border px-4 py-2">
                      {new Date(issue.IssueDate).toLocaleString()}
                    </td>
                    <td className="border px-4 py-2">
                      {new Date(issue.DueDate).toLocaleString()}
                    </td>
                    <td className="border px-4 py-2">{days} days</td>
                    <td className="border px-4 py-2 capitalize font-semibold">
                      {issue.Status === 'returned' && '✅ Returned'}
                      {issue.Status !== 'returned' &&
                      new Date(issue.DueDate) < new Date()
                        ? '⏰ Overdue'
                        : issue.Status !== 'returned'
                        ? '📕 Issued'
                        : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faChevronLeft} /> Prev
          </button>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
      </div>
    </div>
  );
}
