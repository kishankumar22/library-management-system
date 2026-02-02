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
  faSort,
  faCheckCircle,
  faExclamationCircle,
  faBookOpen,
  faAnglesLeft,
  faAnglesRight,
  faRotateLeft
} from '@fortawesome/free-solid-svg-icons';

export default function BookReportPage() {
  const user = useUser();
  const [studentId, setStudentId] = useState<number | null>(null);
  const [bookIssues, setBookIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<'all' | 'issued' | 'overdue' | 'returned'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('IssueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Fetch student ID
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
      <div className="flex items-center justify-center min-h-screen">
        <FontAwesomeIcon icon={faSpinner} spin className="w-8 h-8 text-blue-600 mr-3" />
        <span className="text-gray-600">Loading...</span>
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

  // Search filter
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

  // Stats
  const totalBooks = bookIssues.filter((issue) => issue.StudentId === studentId).length;
  const issuedBooks = bookIssues.filter(
    (issue) => issue.StudentId === studentId && issue.Status !== 'returned'
  ).length;
  const returnedBooks = bookIssues.filter(
    (issue) => issue.StudentId === studentId && issue.Status === 'returned'
  ).length;
  const overdueBooks = bookIssues.filter(
    (issue) =>
      issue.StudentId === studentId &&
      issue.Status !== 'returned' &&
      new Date(issue.DueDate) < new Date()
  ).length;

  // Pagination
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredIssues.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredIssues.length / rowsPerPage);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="min-h-screen p-2 bg-gray-50">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
        {/* Total Books */}
        <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-blue-600">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faBook} className="text-blue-600 text-lg" />
            <div className="flex-1">
              <p className="text-xs text-gray-600">Total Books</p>
              <p className="text-lg font-bold text-blue-700">{totalBooks}</p>
            </div>
          </div>
        </div>

        {/* Issued Books */}
        <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-yellow-600">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faBookOpen} className="text-yellow-600 text-lg" />
            <div className="flex-1">
              <p className="text-xs text-gray-600">Issued</p>
              <p className="text-lg font-bold text-yellow-700">{issuedBooks}</p>
            </div>
          </div>
        </div>

        {/* Returned Books */}
        <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-green-600">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faCheckCircle} className="text-green-600 text-lg" />
            <div className="flex-1">
              <p className="text-xs text-gray-600">Returned</p>
              <p className="text-lg font-bold text-green-700">{returnedBooks}</p>
            </div>
          </div>
        </div>

        {/* Overdue Books */}
        <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-red-600">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faExclamationCircle} className="text-red-600 text-lg" />
            <div className="flex-1">
              <p className="text-xs text-gray-600">Overdue</p>
              <p className="text-lg font-bold text-red-700">{overdueBooks}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-3 mb-2 border border-gray-200">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            <input
              type="text"
              placeholder="Search by book title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg w-full focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Status Filter - Clickable Stats */}
          <div className="flex rounded-lg border-2 border-gray-200 overflow-hidden shadow-sm">
            <button
              onClick={() => setStatusFilter(statusFilter === 'all' ? 'all' : 'all')}
              className={`flex flex-col items-center px-3 py-1.5 transition-all ${
                statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-blue-50 text-blue-700'
              }`}
            >
              <FontAwesomeIcon icon={faBook} className="text-sm mb-0.5" />
              <span className="text-[10px] leading-none">All</span>
              <span className="text-xs font-bold leading-none mt-0.5">{totalBooks}</span>
            </button>
            
            <div className="w-px bg-gray-300"></div>
            
            <button
              onClick={() => setStatusFilter(statusFilter === 'issued' ? 'all' : 'issued')}
              className={`flex flex-col items-center px-3 py-1.5 transition-all ${
                statusFilter === 'issued' ? 'bg-yellow-600 text-white' : 'bg-white hover:bg-yellow-50 text-yellow-700'
              }`}
            >
              <FontAwesomeIcon icon={faBookOpen} className="text-sm mb-0.5" />
              <span className="text-[10px] leading-none">Issued</span>
              <span className="text-xs font-bold leading-none mt-0.5">{issuedBooks}</span>
            </button>
            
            <div className="w-px bg-gray-300"></div>
            
            <button
              onClick={() => setStatusFilter(statusFilter === 'returned' ? 'all' : 'returned')}
              className={`flex flex-col items-center px-3 py-1.5 transition-all ${
                statusFilter === 'returned' ? 'bg-green-600 text-white' : 'bg-white hover:bg-green-50 text-green-700'
              }`}
            >
              <FontAwesomeIcon icon={faCheckCircle} className="text-sm mb-0.5" />
              <span className="text-[10px] leading-none">Returned</span>
              <span className="text-xs font-bold leading-none mt-0.5">{returnedBooks}</span>
            </button>
            
            <div className="w-px bg-gray-300"></div>
            
            <button
              onClick={() => setStatusFilter(statusFilter === 'overdue' ? 'all' : 'overdue')}
              className={`flex flex-col items-center px-3 py-1.5 transition-all ${
                statusFilter === 'overdue' ? 'bg-red-600 text-white' : 'bg-white hover:bg-red-50 text-red-700'
              }`}
            >
              <FontAwesomeIcon icon={faExclamationCircle} className="text-sm mb-0.5" />
              <span className="text-[10px] leading-none">Overdue</span>
              <span className="text-xs font-bold leading-none mt-0.5">{overdueBooks}</span>
            </button>
          </div>

          {/* Rows per page */}
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value={5}>5/page</option>
            <option value={10}>10/page</option>
            <option value={25}>25/page</option>
            <option value={50}>50/page</option>
          </select>

          {/* Clear Filter */}
          <button
            onClick={clearFilters}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 text-xs font-medium rounded-lg transition-all"
            title="Clear Filters"
          >
            <FontAwesomeIcon icon={faRotateLeft} />
          </button>

          {/* Count */}
          <span className="text-xs text-gray-600 font-medium ml-auto">
            Showing: <span className="font-bold text-blue-600">{filteredIssues.length}</span>
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden min-h-[60vh]">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <FontAwesomeIcon icon={faSpinner} spin className="w-6 h-6 text-blue-600 mr-3" />
            <span className="text-gray-600">Loading book issues...</span>
          </div>
        ) : currentRows.length === 0 ? (
          <div className="text-center py-12">
            <FontAwesomeIcon icon={faBook} className="text-5xl mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No books found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-blue-600 text-white sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold">#</th>
                    <th
                      className="px-3 py-2 text-left font-bold cursor-pointer hover:bg-blue-700"
                      onClick={() => {
                        if (sortBy === 'BookTitle') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('BookTitle');
                          setSortOrder('asc');
                        }
                      }}
                    >
                      📖 Book Title <FontAwesomeIcon icon={faSort} className="ml-1" />
                    </th>
                    <th
                      className="px-3 py-2 text-left font-bold cursor-pointer hover:bg-blue-700"
                      onClick={() => {
                        if (sortBy === 'IssueDate') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('IssueDate');
                          setSortOrder('asc');
                        }
                      }}
                    >
                      📅 Issue Date <FontAwesomeIcon icon={faSort} className="ml-1" />
                    </th>
                    <th
                      className="px-3 py-2 text-left font-bold cursor-pointer hover:bg-blue-700"
                      onClick={() => {
                        if (sortBy === 'DueDate') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('DueDate');
                          setSortOrder('asc');
                        }
                      }}
                    >
                      ⏳ Due Date <FontAwesomeIcon icon={faSort} className="ml-1" />
                    </th>
                    <th
                      className="px-3 py-2 text-center font-bold cursor-pointer hover:bg-blue-700"
                      onClick={() => {
                        if (sortBy === 'Days') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('Days');
                          setSortOrder('asc');
                        }
                      }}
                    >
                      📆 Days <FontAwesomeIcon icon={faSort} className="ml-1" />
                    </th>
                    <th className="px-3 py-2 text-center font-bold">🏷️ Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentRows.map((issue, index) => {
                    const days = Math.ceil(
                      (new Date(issue.DueDate).getTime() - new Date(issue.IssueDate).getTime()) /
                        (1000 * 60 * 60 * 24)
                    );

                    const isOverdue = new Date(issue.DueDate) < new Date() && issue.Status !== 'returned';
                    const isReturned = issue.Status === 'returned';

                    return (
                      <tr key={issue.IssueId} className="hover:bg-blue-50 transition-colors">
                        <td className="px-3 py-2 font-medium text-gray-700">
                          {indexOfFirstRow + index + 1}
                        </td>
                        <td className="px-3 py-2 font-bold text-gray-900 uppercase max-w-xs truncate" title={issue.BookTitle}>
                          {issue.BookTitle}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {new Date(issue.IssueDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {new Date(issue.DueDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="font-bold text-blue-700">{days} days</span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {isReturned ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-500 text-white font-bold text-[10px]">
                              <FontAwesomeIcon icon={faCheckCircle} />
                              Returned
                            </span>
                          ) : isOverdue ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-500 text-white font-bold text-[10px]">
                              <FontAwesomeIcon icon={faExclamationCircle} />
                              Overdue
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-500 text-white font-bold text-[10px]">
                              <FontAwesomeIcon icon={faBookOpen} />
                              Issued
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-50 px-3 py-2 flex items-center justify-between border-t border-gray-200">
                <div className="text-xs text-gray-700">
                  {indexOfFirstRow + 1}-{Math.min(indexOfLastRow, filteredIssues.length)} of {filteredIssues.length}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-blue-50 disabled:opacity-50"
                  >
                    <FontAwesomeIcon icon={faAnglesLeft} />
                  </button>

                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-blue-50 disabled:opacity-50"
                  >
                    <FontAwesomeIcon icon={faChevronLeft} />
                  </button>

                  {getPageNumbers().map((pageNum, idx) => (
                    pageNum === '...' ? (
                      <span key={idx} className="px-2 py-1 text-xs text-gray-500">...</span>
                    ) : (
                      <button
                        key={idx}
                        onClick={() => setCurrentPage(pageNum as number)}
                        className={`px-2.5 py-1 text-xs font-medium border rounded transition-all ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-blue-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  ))}

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-blue-50 disabled:opacity-50"
                  >
                    <FontAwesomeIcon icon={faChevronRight} />
                  </button>

                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-blue-50 disabled:opacity-50"
                  >
                    <FontAwesomeIcon icon={faAnglesRight} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
