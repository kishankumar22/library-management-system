'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFileExcel, 
  faFilter, 
  faSearch, 
  faCreditCard,
  faCalendar,
  faGraduationCap,
  faUser,
  faBook,
  faRupeeSign,
  faRotateLeft,
  faSync,
  faChevronLeft,
  faChevronRight,
  faAnglesLeft,
  faAnglesRight,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';


export default function LibraryPaymentPage() {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, courseFilter, fromDate, toDate, itemsPerPage]);

useEffect(() => {
  const fetchPayments = async () => {
    try {
      const response = await axios.get("/api/library-payment");
      setPayments(response.data);
      setFilteredPayments(response.data);
    } catch (err) {
      setError("No records found.");
    } finally {
      setLoading(false);
    }
  };
  fetchPayments();
}, []);

  useEffect(() => {
    const lowerSearch = search.toLowerCase();
    const filtered = payments.filter(p => {
      const matchSearch =
        p.BookTitle?.toLowerCase().includes(lowerSearch) ||
        p.StudentName?.toLowerCase().includes(lowerSearch);
      const matchCourse = courseFilter ? p.CourseName === courseFilter : true;
      const matchDate =
        (!fromDate || new Date(p.CreatedOn) >= new Date(fromDate)) &&
        (!toDate || new Date(p.CreatedOn) <= new Date(toDate));
      return matchSearch && matchCourse && matchDate;
    });
    setFilteredPayments(filtered);
  }, [search, courseFilter, fromDate, toDate, payments]);

  // Calculate totals - this is where we aggregate the financial data
  const TotalAmountPaid = filteredPayments.reduce(
    (total, payment) => total + payment.AmountPaid,
    0
  );

  // Calculate unique penalties to avoid double counting
  const uniquePenalties = new Map();
  filteredPayments.forEach(payment => {
    if (payment.IssueId && !uniquePenalties.has(payment.IssueId)) {
      uniquePenalties.set(payment.IssueId, payment.PenaltyAmount || 0);
    }
  });
  const TotalPenaltyAmount = Array.from(uniquePenalties.values()).reduce(
    (sum, amt) => sum + amt,
    0
  );

  // Pagination calculations
  const totalItems = filteredPayments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPayments = filteredPayments.slice(startIndex, endIndex);

  // Pagination handlers
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let end = Math.min(totalPages, start + maxVisiblePages - 1);
    
    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  const handleExport = () => {
    if (filteredPayments.length === 0) {
      toast.warn('No data to export');
      return;
    }
    // Create Excel file with proper formatting
    const worksheet = XLSX.utils.json_to_sheet(filteredPayments);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payments');
    XLSX.writeFile(workbook, 'LibraryPayments.xlsx');
    toast.success('Data exported successfully');
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/library-payment');
      setPayments(response.data);
      setFilteredPayments(response.data);
      setSearch('');
      setCourseFilter('');
      setFromDate('');
      setToDate('');
      setCurrentPage(1);
      setError(null);
      toast.success('Data refreshed successfully');
    } catch (err) {
      setError('No records found.');
      toast.error('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setCourseFilter('');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
  };

  const uniqueCourses = [...new Set(payments.map(p => p.CourseName).filter(Boolean))];

  return (
<div className="min-h-screen bg-gray-50 p-2">
  <div className="max-w-screen-2xl mx-auto">
    
    {/* Stats Summary Cards */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
      {/* Total Records */}
      <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-blue-600">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faBook} className="text-blue-600 text-lg" />
          <div className="flex-1">
            <p className="text-xs text-gray-600">Total Records</p>
            <p className="text-lg font-bold text-blue-700">{totalItems}</p>
          </div>
        </div>
      </div>

      {/* Total Penalty */}
      <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-orange-600">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faRupeeSign} className="text-orange-600 text-lg" />
          <div className="flex-1">
            <p className="text-xs text-gray-600">Total Penalty</p>
            <p className="text-lg font-bold text-orange-700">₹{TotalPenaltyAmount.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Total Paid */}
      <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-green-600">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faCreditCard} className="text-green-600 text-lg" />
          <div className="flex-1">
            <p className="text-xs text-gray-600">Total Paid</p>
            <p className="text-lg font-bold text-green-700">₹{TotalAmountPaid.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Remaining */}
      <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-red-600">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faRupeeSign} className="text-red-600 text-lg" />
          <div className="flex-1">
            <p className="text-xs text-gray-600">Remaining</p>
            <p className="text-lg font-bold text-red-700">₹{(TotalPenaltyAmount - TotalAmountPaid).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>

    {/* Compact Filters Row */}
    <div className="bg-white rounded-lg shadow-sm p-3 mb-2 border border-gray-200">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          <input
            type="text"
            placeholder="Search book or student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg w-full focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Course Filter */}
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
        >
          <option value="">All Courses</option>
          {uniqueCourses.map(course => (
            <option key={course} value={course}>{course}</option>
          ))}
        </select>

        {/* Date Range */}
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="px-2 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 w-32"
          title="From Date"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="px-2 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 w-32"
          title="To Date"
        />

        {/* Items Per Page */}
        <select
          value={itemsPerPage}
          onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
          className="px-2 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
        >
          <option value={25}>25/page</option>
          <option value={50}>50/page</option>
          <option value={75}>75/page</option>
          <option value={100}>100/page</option>
        </select>

        {/* Clear Filter */}
        <button
          onClick={clearFilters}
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 text-xs font-medium rounded-lg transition-all"
          title="Clear Filters"
        >
          <FontAwesomeIcon icon={faRotateLeft} />
        </button>

        {/* Export to Excel */}
        <button
          onClick={handleExport}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap ml-auto"
        >
          <FontAwesomeIcon icon={faFileExcel} className="mr-1" />
          Export
        </button>

        {/* Count Info */}
        <span className="text-xs text-gray-600 font-medium">
          {startIndex + 1}-{Math.min(endIndex, totalItems)} / {totalItems}
        </span>
      </div>
    </div>

    {/* Table Section */}
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <FontAwesomeIcon icon={faSpinner} spin className="text-blue-600 text-2xl mr-3" />
          <span className="text-gray-600">Loading payment records...</span>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-red-600 font-medium">{error}</p>
            <p className="text-gray-500 text-sm mt-1">Please try refreshing the page</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto min-h-[66vh]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-blue-600">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase">Sr.</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase">Book Title</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase">Student</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase">Course</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase">Amount</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase">Mode</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase hidden md:table-cell">Transaction ID</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase hidden lg:table-cell">Created By</th>
                <th className="px-3 py-2 text-left text-xs font-bold text-white uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {currentPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <FontAwesomeIcon icon={faBook} className="text-4xl mb-3 text-gray-300" />
                    <p className="text-lg font-medium">No payment records found</p>
                    <p className="text-sm">Try adjusting your search filters</p>
                  </td>
                </tr>
              ) : (
                currentPayments.map((payment, index) => (
                  <tr key={index} className="hover:bg-blue-50 transition-colors">
                    <td className="px-3 py-2 text-xs font-medium text-gray-900">{startIndex + index + 1}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-gray-900 uppercase max-w-xs truncate" title={payment.BookTitle}>
                      {payment.BookTitle || 'N/A'}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700 max-w-xs truncate">{payment.StudentName || 'N/A'}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {payment.CourseName || 'N/A'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs font-bold text-green-600">
                      ₹{payment.AmountPaid?.toLocaleString() || 0}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        payment.PaymentMode === 'Cash' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {payment.PaymentMode || 'N/A'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 font-mono max-w-xs truncate hidden md:table-cell">
                      {payment.TransactionId || 'N/A'}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700 max-w-xs truncate hidden lg:table-cell">
                      {payment.CreatedBy || 'N/A'}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {payment.CreatedOn 
                        ? new Date(payment.CreatedOn).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })
                        : 'N/A'
                      }
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>

    {/* Pagination */}
    {totalPages > 1 && (
      <div className="bg-gray-50 px-3 py-2 mt-2 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-700">
            {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-blue-50 disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faAnglesLeft} />
            </button>

            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-blue-50 disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>

            {getPageNumbers().map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => goToPage(pageNum)}
                className={`px-2.5 py-1 text-xs font-medium border rounded transition-all ${
                  currentPage === pageNum
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 hover:bg-blue-50'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-blue-50 disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>

            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-blue-50 disabled:opacity-50"
            >
              <FontAwesomeIcon icon={faAnglesRight} />
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
</div>

  );
}