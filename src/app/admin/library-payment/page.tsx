// Modern Library Payment Page with Consistent Design
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
  faRupeeSign
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

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const response = await axios.get('/api/library-payment');
        setPayments(response.data);
        setFilteredPayments(response.data);
      } catch (err) {
        setError('Failed to fetch payment data.');
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
  };

  const clearFilters = () => {
    setSearch('');
    setCourseFilter('');
    setFromDate('');
    setToDate('');
  };

  const uniqueCourses = [...new Set(payments.map(p => p.CourseName).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className=" mx-4 ">
        
        {/* Header Section */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FontAwesomeIcon icon={faCreditCard} className="text-blue-600 text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
                <p className="text-gray-600 text-sm">Manage and track library payment records</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={clearFilters}
                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faFilter} />
                Clear Filters
              </button>
              <button 
                onClick={handleExport}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faFileExcel} />
                Export Excel
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Records</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredPayments.length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <FontAwesomeIcon icon={faBook} className="text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Penalty</p>
                  <p className="text-2xl font-bold text-orange-600">₹{TotalPenaltyAmount.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <FontAwesomeIcon icon={faRupeeSign} className="text-orange-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Paid</p>
                  <p className="text-2xl font-bold text-green-600">₹{TotalAmountPaid.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <FontAwesomeIcon icon={faCreditCard} className="text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Remaining</p>
                  <p className="text-2xl font-bold text-red-600">₹{(TotalPenaltyAmount - TotalAmountPaid).toLocaleString()}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <FontAwesomeIcon icon={faRupeeSign} className="text-red-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 mb-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search book or student..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="relative">
              <FontAwesomeIcon icon={faGraduationCap} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="">All Courses</option>
                {uniqueCourses.map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
            </div>
            
            <div className="relative">
              <FontAwesomeIcon icon={faCalendar} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="relative">
              <FontAwesomeIcon icon={faCalendar} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <FontAwesomeIcon icon={faBook} className="mr-2" />
                      Book Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <FontAwesomeIcon icon={faUser} className="mr-2" />
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <FontAwesomeIcon icon={faGraduationCap} className="mr-2" />
                      Course
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <FontAwesomeIcon icon={faRupeeSign} className="mr-2" />
                      Amount Paid
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <FontAwesomeIcon icon={faCreditCard} className="mr-2" />
                      Payment Mode
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <FontAwesomeIcon icon={faCalendar} className="mr-2" />
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <div className="text-gray-500">
                          <FontAwesomeIcon icon={faBook} className="text-4xl mb-3" />
                          <p className="text-lg font-medium">No payment records found</p>
                          <p className="text-sm">Try adjusting your search filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((payment, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 capitalize">
                            {payment.BookTitle || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{payment.StudentName || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {payment.CourseName || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-green-600">
                            ₹{payment.AmountPaid?.toLocaleString() || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            payment.PaymentMode === 'Cash' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {payment.PaymentMode || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500 font-mono">
                            {payment.TransactionId || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{payment.CreatedBy || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
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
      </div>
    </div>
  );
}