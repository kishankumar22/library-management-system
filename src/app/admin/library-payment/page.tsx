// Full modern compact UI for Library Payment Page
'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoneyBillWave, faFileExcel, faCreditCard, faCalendarAlt, faUser, faBook } from '@fortawesome/free-solid-svg-icons';
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

  const TotalAmountPaid = filteredPayments.reduce(
    (total, payment) => total + payment.AmountPaid,
    0
  );

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
    <main className="px-6">
      {/* Header */}
       <h1 className="text-2xl font-semibold text-gray-800 mb-2 p-1 flex items-center gap-2">
            📚 Payment History
          </h1>
      <div className="grid sm:grid-cols-2 gap-4 mb-1">
        <div>
         <div className="text-sm text-gray-600 space-x-4">
            <span className="text-black-600 font-bold">
               Total Payment: ₹{filteredPayments.length}
            </span>
            <span className="text-blue-600 font-medium">
              🔵Total Penalty: ₹{TotalPenaltyAmount}
            </span>
            <span className="text-green-600 font-medium">
              💵 Total Paid: ₹{TotalAmountPaid}
            </span>
            <span className="text-red-600 font-medium">
              🔴Total Remaining: ₹{TotalPenaltyAmount-TotalAmountPaid}
            </span>
          </div>
        </div>
        <div className="flex justify-end items-start gap-2 flex-wrap">
          <button onClick={clearFilters} className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 text-sm">
            Clear Filters
          </button>
          <button onClick={handleExport} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 flex items-center gap-2 text-sm">
            <FontAwesomeIcon icon={faFileExcel} /> Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <input type="text" placeholder="🔎 Search Book or Student" value={search} onChange={e => setSearch(e.target.value)} className="px-3 py-2 border rounded text-sm w-full" />
        <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} className="px-3 py-2 border rounded text-sm w-full">
          <option value="">🎓 All Courses</option>
          {uniqueCourses.map(course => (
            <option key={course} value={course}>{course}</option>
          ))}
        </select>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="px-3 py-2 border rounded text-sm w-full" />
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="px-3 py-2 border rounded text-sm w-full" />
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-gray-600">Loading...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <div className="overflow-x-auto bg-white shadow rounded-lg border border-gray-200">
          <table className="min-w-full text-sm text-gray-700">
            <thead className="bg-gray-100 text-gray-800">
              <tr>
                <th className="px-4 py-3 text-left">📘 Book</th>
                <th className="px-4 py-3 text-left">👤 Student</th>
                <th className="px-4 py-3 text-left">🎓 Course</th>
                <th className="px-4 py-3 text-left">💰 Paid</th>
                <th className="px-4 py-3 text-left">💳 Mode</th>
                <th className="px-4 py-3 text-left"># Txn ID</th>
                <th className="px-4 py-3 text-left">🧑‍💼 Created By</th>
                <th className="px-4 py-3 text-left">📅 Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-gray-500">
                    No records found
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment, index) => (
                  <tr key={index} className="hover:bg-gray-50 border-b">
                    <td className="px-4 py-2 capitalize">{payment.BookTitle}</td>
                    <td className="px-4 py-2">{payment.StudentName}</td>
                    <td className="px-4 py-2">{payment.CourseName || 'N/A'}</td>
                    <td className="px-4 py-2">₹{payment.AmountPaid}</td>
                    <td className="px-4 py-2">{payment.PaymentMode}</td>
                    <td className="px-4 py-2">{payment.TransactionId || 'N/A'}</td>
                    <td className="px-4 py-2">{payment.CreatedBy}</td>
                    <td className="px-4 py-2">{new Date(payment.CreatedOn).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
