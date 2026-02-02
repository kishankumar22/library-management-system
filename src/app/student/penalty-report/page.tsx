'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '@/app/hooks/useUser';
import {
  faBook,
  faMoneyBill,
  faDollarSign,
  faInfoCircle,
  faCalendarDays,
  faSpinner,
  faSearch,
  faRotateLeft,
  faExclamationCircle,
  faCheckCircle,
  faAnglesLeft,
  faAnglesRight,
  faChevronLeft,
  faChevronRight,
  faSort,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export default function PenaltyReportPage() {
  const user = useUser();
  const [penalties, setPenalties] = useState([]);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
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

  // Fetch penalties
  useEffect(() => {
    const fetchPenalties = async () => {
      try {
        const response = await axios.get('/api/penalty');
        setPenalties(response.data);
      } catch (err) {
        console.error('Error fetching penalties:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPenalties();
  }, []);

  if (!user || !studentId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FontAwesomeIcon icon={faSpinner} spin className="w-8 h-8 text-blue-600 mr-3" />
        <span className="text-gray-600">Loading...</span>
      </div>
    );
  }

  // Filter by studentId and deduplicate
  let filteredPenalties = penalties
    .filter((p) => p.StudentId === studentId)
    .filter(
      (value, index, self) =>
        index === self.findIndex((t) => t.PenaltyId === value.PenaltyId)
    );

  // Status filter
  if (statusFilter === 'paid') {
    filteredPenalties = filteredPenalties.filter((p) => p.PenaltyStatus === 'paid');
  } else if (statusFilter === 'unpaid') {
    filteredPenalties = filteredPenalties.filter((p) => p.PenaltyStatus === 'unpaid');
  }

  // Search filter
  if (searchTerm.trim() !== '') {
    filteredPenalties = filteredPenalties.filter((p) =>
      p.BookTitle.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Calculate stats
  const totalPenalties = penalties.filter((p) => p.StudentId === studentId).length;
  const totalAmount = penalties
    .filter((p) => p.StudentId === studentId)
    .reduce((sum, p) => sum + (p.Amount || 0), 0);
  const totalPaid = penalties
    .filter((p) => p.StudentId === studentId)
    .reduce((sum, p) => sum + (p.TotalPaid || 0), 0);
  const totalPending = totalAmount - totalPaid;

  const paidCount = penalties.filter(
    (p) => p.StudentId === studentId && p.PenaltyStatus === 'paid'
  ).length;
  const unpaidCount = penalties.filter(
    (p) => p.StudentId === studentId && p.PenaltyStatus === 'unpaid'
  ).length;

  // Pagination
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredPenalties.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredPenalties.length / rowsPerPage);

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
        {/* Total Penalties */}
        <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-blue-600">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faExclamationCircle} className="text-blue-600 text-lg" />
            <div className="flex-1">
              <p className="text-xs text-gray-600">Total Penalties</p>
              <p className="text-lg font-bold text-blue-700">{totalPenalties}</p>
            </div>
          </div>
        </div>

        {/* Total Amount */}
        <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-orange-600">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faMoneyBill} className="text-orange-600 text-lg" />
            <div className="flex-1">
              <p className="text-xs text-gray-600">Total Amount</p>
              <p className="text-lg font-bold text-orange-700">₹{totalAmount}</p>
            </div>
          </div>
        </div>

        {/* Total Paid */}
        <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-green-600">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faCheckCircle} className="text-green-600 text-lg" />
            <div className="flex-1">
              <p className="text-xs text-gray-600">Total Paid</p>
              <p className="text-lg font-bold text-green-700">₹{totalPaid}</p>
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-red-600">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faDollarSign} className="text-red-600 text-lg" />
            <div className="flex-1">
              <p className="text-xs text-gray-600">Pending</p>
              <p className="text-lg font-bold text-red-700">₹{totalPending}</p>
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
              onClick={() => setStatusFilter('all')}
              className={`flex flex-col items-center px-3 py-1.5 transition-all ${
                statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-blue-50 text-blue-700'
              }`}
            >
              <FontAwesomeIcon icon={faExclamationCircle} className="text-sm mb-0.5" />
              <span className="text-[10px] leading-none">All</span>
              <span className="text-xs font-bold leading-none mt-0.5">{totalPenalties}</span>
            </button>
            
            <div className="w-px bg-gray-300"></div>
            
            <button
              onClick={() => setStatusFilter('paid')}
              className={`flex flex-col items-center px-3 py-1.5 transition-all ${
                statusFilter === 'paid' ? 'bg-green-600 text-white' : 'bg-white hover:bg-green-50 text-green-700'
              }`}
            >
              <FontAwesomeIcon icon={faCheckCircle} className="text-sm mb-0.5" />
              <span className="text-[10px] leading-none">Paid</span>
              <span className="text-xs font-bold leading-none mt-0.5">{paidCount}</span>
            </button>
            
            <div className="w-px bg-gray-300"></div>
            
            <button
              onClick={() => setStatusFilter('unpaid')}
              className={`flex flex-col items-center px-3 py-1.5 transition-all ${
                statusFilter === 'unpaid' ? 'bg-red-600 text-white' : 'bg-white hover:bg-red-50 text-red-700'
              }`}
            >
              <FontAwesomeIcon icon={faExclamationCircle} className="text-sm mb-0.5" />
              <span className="text-[10px] leading-none">Unpaid</span>
              <span className="text-xs font-bold leading-none mt-0.5">{unpaidCount}</span>
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
            Showing: <span className="font-bold text-blue-600">{filteredPenalties.length}</span>
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden min-h-[60vh]">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <FontAwesomeIcon icon={faSpinner} spin className="w-6 h-6 text-blue-600 mr-3" />
            <span className="text-gray-600">Loading penalties...</span>
          </div>
        ) : currentRows.length === 0 ? (
          <div className="text-center py-12">
            <FontAwesomeIcon icon={faCheckCircle} className="text-5xl mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No penalties found</p>
            <p className="text-xs text-gray-400 mt-1">You have no penalties!</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-blue-600 text-white sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold">#</th>
                    <th className="px-3 py-2 text-left font-bold">
                      <FontAwesomeIcon icon={faBook} className="mr-1" />
                      Book Title
                    </th>
                    <th className="px-3 py-2 text-right font-bold">
                      <FontAwesomeIcon icon={faMoneyBill} className="mr-1" />
                      Penalty
                    </th>
                    <th className="px-3 py-2 text-right font-bold">
                      <FontAwesomeIcon icon={faDollarSign} className="mr-1" />
                      Paid
                    </th>
                    <th className="px-3 py-2 text-left font-bold">
                      <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
                      Remarks
                    </th>
                    <th className="px-3 py-2 text-left font-bold">
                      <FontAwesomeIcon icon={faCalendarDays} className="mr-1" />
                      Date
                    </th>
                    <th className="px-3 py-2 text-center font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentRows.map((penalty, index) => {
                    const isPaid = penalty.PenaltyStatus === 'paid';
                    
                    return (
                      <tr key={penalty.PenaltyId} className="hover:bg-blue-50 transition-colors">
                        <td className="px-3 py-2 font-medium text-gray-700">
                          {indexOfFirstRow + index + 1}
                        </td>
                        <td className="px-3 py-2 font-bold text-gray-900 uppercase max-w-xs truncate" title={penalty.BookTitle}>
                          {penalty.BookTitle}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-orange-600">
                          ₹{penalty.Amount || 0}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-green-600">
                          ₹{penalty.TotalPaid || 0}
                        </td>
                        <td className="px-3 py-2 text-gray-700 max-w-xs truncate" title={penalty.Remarks}>
                          {penalty.Remarks || <span className="text-gray-400 italic">—</span>}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {new Date(penalty.CreatedOn).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-500 text-white font-bold text-[10px]">
                              <FontAwesomeIcon icon={faCheckCircle} />
                              Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-500 text-white font-bold text-[10px]">
                              <FontAwesomeIcon icon={faExclamationCircle} />
                              Unpaid
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
                  {indexOfFirstRow + 1}-{Math.min(indexOfLastRow, filteredPenalties.length)} of {filteredPenalties.length}
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
