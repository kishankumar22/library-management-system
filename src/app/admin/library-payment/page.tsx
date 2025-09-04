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
  faAnglesRight
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
    <div className="min-h-screen bg-gray-50 p-2 md:p-4">
      <div className="max-w-screen-2xl mx-auto">
        
        {/* Header Section */}
        <div className="">
   

          {/* First Row: Stats Summary */}
     <div className="bg-white rounded-lg shadow-sm p-3 mb-3 flex gap-4">
  {/* Each stat box takes equal width */}
  <div className="flex-1 flex items-center justify-start gap-2 text-blue-700 text-sm md:text-base font-semibold">
    <FontAwesomeIcon icon={faBook} className="w-4 h-4" />
    <span>Total Records:</span>
    <span className="bg-blue-100 px-2 py-1 rounded text-xs md:text-sm">{totalItems}</span>
  </div>

  <div className="flex-1 flex items-center justify-start gap-2 text-orange-600 text-sm md:text-base font-semibold">
    <FontAwesomeIcon icon={faRupeeSign} className="w-4 h-4" />
    <span>Total Penalty:</span>
    <span className="bg-orange-100 px-2 py-1 rounded text-xs md:text-sm">₹{TotalPenaltyAmount.toLocaleString()}</span>
  </div>

  <div className="flex-1 flex items-center justify-start gap-2 text-green-600 text-sm md:text-base font-semibold">
    <FontAwesomeIcon icon={faCreditCard} className="w-4 h-4" />
    <span>Total Paid:</span>
    <span className="bg-green-100 px-2 py-1 rounded text-xs md:text-sm">₹{TotalAmountPaid.toLocaleString()}</span>
  </div>

  <div className="flex-1 flex items-center justify-start gap-2 text-red-600 text-sm md:text-base font-semibold">
    <FontAwesomeIcon icon={faRupeeSign} className="w-4 h-4" />
    <span>Remaining:</span>
    <span className="bg-red-100 px-2 py-1 rounded text-xs md:text-sm">₹{(TotalPenaltyAmount - TotalAmountPaid).toLocaleString()}</span>
  </div>
      </div>


          {/* Second Row: Filters and Actions */}
          <div className="bg-white rounded-lg shadow-sm p-3 mb-3">
            <div className="flex flex-col md:flex-row gap-3 items-stretch">
              {/* Search and Filters */}
              <div className="flex flex-1 flex-col md:flex-row gap-2">
                <div className="relative flex-grow">
                  <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search book or student..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                
                <div className="relative flex-grow">
                  <FontAwesomeIcon icon={faGraduationCap} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={courseFilter}
                    onChange={(e) => setCourseFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none text-sm"
                  >
                    <option value="">All Courses</option>
                    {uniqueCourses.map(course => (
                      <option key={course} value={course}>{course}</option>
                    ))}
                  </select>
                </div>
                
                <div className="relative flex-grow">
                  <FontAwesomeIcon icon={faCalendar} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                
                <div className="relative flex-grow">
                  <FontAwesomeIcon icon={faCalendar} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col md:flex-row gap-2 items-stretch">
                {/* Items Per Page */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-700 whitespace-nowrap hidden md:inline">Show:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                    className="px-2 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={75}>75</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <button 
                  onClick={clearFilters}
                  className="px-3 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex items-center gap-2 text-sm"
                >
                  <FontAwesomeIcon icon={faRotateLeft} size="xs" />
                  <span className="hidden md:inline">Clear</span>
                </button>
                
               
                
                <button 
                  onClick={handleExport}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center gap-2 text-sm"
                >
                  <FontAwesomeIcon icon={faFileExcel} />
                  <span className="hidden md:inline">Export</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading payment records...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-red-600 font-medium">{error}</p>
                <p className="text-gray-500 text-sm mt-1">Please try refreshing the page</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sr.</th>
                    <th className="px-4 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <FontAwesomeIcon icon={faBook} className="mr-1 md:mr-2" />
                      <span className="hidden md:inline">Book Title</span>
                    </th>
                    <th className="px-4 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <FontAwesomeIcon icon={faUser} className="mr-1 md:mr-2" />
                      <span className="hidden md:inline">Student</span>
                    </th>
                    <th className="px-4 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <FontAwesomeIcon icon={faGraduationCap} className="mr-1 md:mr-2" />
                      <span className="hidden md:inline">Course</span>
                    </th>
                    <th className="px-4 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <FontAwesomeIcon icon={faRupeeSign} className="mr-1 md:mr-2" />
                      <span className="hidden md:inline">Amount</span>
                    </th>
                    <th className="px-4 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <FontAwesomeIcon icon={faCreditCard} className="mr-1 md:mr-2" />
                      <span className="hidden md:inline">Mode</span>
                    </th>
                    <th className="px-4 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Transaction ID
                    </th>
                    <th className="px-4 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Created By
                    </th>
                    <th className="px-4 py-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <FontAwesomeIcon icon={faCalendar} className="mr-1 md:mr-2" />
                      <span className="hidden md:inline">Date</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentPayments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
                        <div className="text-gray-500">
                          <FontAwesomeIcon icon={faBook} className="text-4xl mb-3" />
                          <p className="text-lg font-medium">No payment records found</p>
                          <p className="text-sm">Try adjusting your search filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentPayments.map((payment, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-4 py-2 md:px-6 md:py-4 whitespace-nowrap text-sm">{startIndex + index + 1}</td>
                        <td className="px-4 py-2 md:px-6 md:py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 capitalize max-w-xs truncate">
                            {payment.BookTitle || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-2 md:px-6 md:py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 max-w-xs truncate">{payment.StudentName || 'N/A'}</div>
                        </td>
                        <td className="px-4 py-2 md:px-6 md:py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {payment.CourseName || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-2 md:px-6 md:py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-green-600">
                            ₹{payment.AmountPaid?.toLocaleString() || 0}
                          </div>
                        </td>
                        <td className="px-4 py-2 md:px-6 md:py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            payment.PaymentMode === 'Cash' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {payment.PaymentMode || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-2 md:px-6 md:py-4 whitespace-nowrap hidden md:table-cell">
                          <div className="text-sm text-gray-500 font-mono max-w-xs truncate">
                            {payment.TransactionId || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-2 md:px-6 md:py-4 whitespace-nowrap hidden lg:table-cell">
                          <div className="text-sm text-gray-900 max-w-xs truncate">{payment.CreatedBy || 'N/A'}</div>
                        </td>
                        <td className="px-4 py-2 md:px-6 md:py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {payment.CreatedOn 
                              ? new Date(payment.CreatedOn).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })
                              : 'N/A'
                            }
                          </div>
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2">
            {/* Pagination Info */}
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
              <span className="font-medium">{Math.min(endIndex, totalItems)}</span> of{' '}
              <span className="font-medium">{totalItems}</span> payment records
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              {/* First Page */}
              <button
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="First Page"
              >
                <FontAwesomeIcon icon={faAnglesLeft} size="sm" />
              </button>

              {/* Previous Page */}
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Previous Page"
              >
                <FontAwesomeIcon icon={faChevronLeft} size="sm" />
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {getPageNumbers().map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`px-2 py-1 text-sm border rounded ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              {/* Next Page */}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Next Page"
              >
                <FontAwesomeIcon icon={faChevronRight} size="sm" />
              </button>

              {/* Last Page */}
              <button
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Last Page"
              >
                <FontAwesomeIcon icon={faAnglesRight} size="sm" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}