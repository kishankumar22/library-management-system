'use client';
import { useUser } from '@/app/hooks/useUser';

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faCalendarDays,
  faSearch,
  faFileExcel,
  faMoneyBill,
} from '@fortawesome/free-solid-svg-icons';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';

const ManagePenalty = () => {
  const [penalties, setPenalties] = useState([]);
  const [allPenalties, setAllPenalties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    searchTerm: '',
    statusFilter: 'all',
    startDate: '',
    endDate: '',
  });
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPenalty, setSelectedPenalty] = useState(null);
  const [paymentData, setPaymentData] = useState({
    PaymentMode: 'Cash',
    TransactionId: '',
    AmountPaid: '',
    ReceivedDate: new Date().toISOString().split('T')[0],
  });
  const [paymentHistory, setPaymentHistory] = useState([]);
  const user = useUser();

  useEffect(() => {
    fetchPenalties();
  }, []);

  const fetchPenalties = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/penalty', { timeout: 30000 });
      const filteredPenalties = response.data.filter(
        (penalty) => new Date(penalty.ReturnDate) > new Date(penalty.DueDate)
      );
      const uniquePenalties = Array.from(
        new Map(filteredPenalties.map((item) => [item.PenaltyId, item])).values()
      );
      setAllPenalties(uniquePenalties);
      applyFilters(uniquePenalties);
    } catch (error) {
      console.error('Error fetching penalties:', error);
      setError('Failed to load penalties. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (data) => {
    const { searchTerm, statusFilter, startDate, endDate } = filters;
    let filtered = [...data];

    if (searchTerm) {
      filtered = filtered.filter(
        (penalty) =>
          penalty.StudentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          penalty.BookTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(
        (penalty) =>
          statusFilter === 'paid' ? penalty.PenaltyStatus === 'paid' : penalty.PenaltyStatus === 'unpaid'
      );
    }
    if (startDate && endDate) {
      filtered = filtered.filter((penalty) => {
        const createdOn = new Date(penalty.CreatedOn);
        return createdOn >= new Date(startDate) && createdOn <= new Date(endDate);
      });
    }

    setPenalties(Array.from(new Map(filtered.map((item) => [item.PenaltyId, item])).values()));
  };

  useEffect(() => {
    applyFilters(allPenalties);
  }, [filters, allPenalties]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handlePaymentClick = async (penalty) => {
    setSelectedPenalty(penalty);
    setPaymentData({
      PaymentMode: 'Cash',
      TransactionId: '',
      AmountPaid: (penalty.Amount - penalty.TotalPaid).toString(),
      ReceivedDate: new Date().toISOString().split('T')[0],
    });
    setIsPaymentModalOpen(true);

    // Fetch payment history for the selected penalty
    try {
      const response = await axios.get(`/api/library-payment?issueId=${penalty.IssueId}`);
      setPaymentHistory(response.data);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setPaymentHistory([]);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!paymentData.AmountPaid || !paymentData.PaymentMode) {
      alert('Please fill all required fields');
      return;
    }

    const amountToPay = parseFloat(paymentData.AmountPaid);
    if (amountToPay <= 0) {
      alert('Amount paid must be greater than zero');
      return;
    }

    if (amountToPay > (selectedPenalty.Amount - selectedPenalty.TotalPaid)) {
      alert('Amount paid cannot exceed the remaining penalty amount');
      return;
    }

    const transactionExists = penalties.some(
      (penalty) =>
        penalty.TransactionId === paymentData.TransactionId &&
        penalty.PenaltyId !== selectedPenalty.PenaltyId
    );
    if (transactionExists && paymentData.PaymentMode !== 'Cash') {
      alert('Transaction number already exists for another payment!');
      return;
    }

    try {
await axios.post(
  '/api/penalty',
  {
    IssueId: selectedPenalty.IssueId,
    StudentId: selectedPenalty.StudentId,
    AmountPaid: amountToPay,
    PaymentMode: paymentData.PaymentMode,
    TransactionId: paymentData.TransactionId || null,
    ReceiveBy: user?.name || 'Admin',
    CreatedBy: user?.name || 'Admin',
  },
  { timeout: 30000 }
);

      setIsPaymentModalOpen(false);
      fetchPenalties();
      alert('Payment saved successfully');
      // Refresh payment history after submission
      const response = await axios.get(`/api/library-payment?issueId=${selectedPenalty.IssueId}`);
      setPaymentHistory(response.data);
    } catch (error) {
      console.error('Error saving payment:', error);
      alert(`Error saving payment: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData((prev) => ({ ...prev, [name]: value }));
  };

  const calculateLateDays = (issue) => {
    const returnDate = new Date(issue.ReturnDate);
    const dueDate = new Date(issue.DueDate);
    return Math.max(0, Math.ceil((returnDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const exportToExcel = () => {
    if (penalties.length === 0) {
      toast.warn('No penalties to export');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(penalties.map((penalty) => ({
      'Book Title': penalty.BookTitle,
      'Student Name': penalty.StudentName,
      'Course Name': penalty.courseName || 'N/A',
      'Days Late': calculateLateDays(penalty),
      'Issued On': new Date(penalty.IssueDate).toLocaleDateString(),
      'Due On': new Date(penalty.DueDate).toLocaleDateString(),
      'Penalty Status': penalty.PenaltyStatus,
      'Penalty Amount': `₹${penalty.Amount}`,
      'Paid Amount': `₹${penalty.TotalPaid}`,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Penalties');
    XLSX.writeFile(wb, 'Penalties_Report.xlsx');
  };

  const filteredPenaltiesCount = useMemo(() => penalties.length, [penalties]);

  return (
    <div className="container mx-auto p-4 bg-white rounded shadow overflow-hidden ">
      {loading ? (
        <div className="flex justify-center h-[85vh] items-center">
          <FontAwesomeIcon icon={faSpinner} spin size="lg" className="w-10 h-10 text-gray-600" />
        </div>
      ) : error ? (
        <div className="text-red-600 text-center p-4">{error}</div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
            <h1 className="text-xl font-bold text-gray-800">Manage Penalties</h1>
          </div>

          <div className="bg-gray-50 p-4 rounded mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-center">
              <div className="flex items-center gap-2 text-blue-600 font-medium pl-8 py-2 border rounded text-sm">
                Total Penalties: {filteredPenaltiesCount}
              </div>
              <div className="relative flex-1">
                <input
                  type="text"
                  name="searchTerm"
                  placeholder="Search by book or student..."
                  value={filters.searchTerm}
                  onChange={handleFilterChange}
                  className="w-full pl-8 pr-2 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <FontAwesomeIcon icon={faSearch} className="absolute left-2 top-2.5 text-gray-400" />
              </div>
              <select
                name="statusFilter"
                value={filters.statusFilter}
                onChange={handleFilterChange}
                className="border p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="border p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="border p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button
                onClick={exportToExcel}
                className="bg-green-600 text-white px-4 py-2 rounded text-sm flex items-center gap-2 hover:bg-green-700 transition-colors"
              >
                <FontAwesomeIcon icon={faFileExcel} /> Export to Excel
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left text-gray-700">Sr.</th>
                  <th className="px-2 py-2 text-left text-gray-700">📖 Book Title</th>
                  <th className="px-2 py-2 text-left text-gray-700">👨‍🎓 Student Name</th>
                  <th className="px-2 py-2 text-left text-gray-700">🎓 Course Name</th>
                  <th className="px-2 py-2 text-left text-gray-700">⏳ Days Late</th>
                  <th className="px-2 py-2 text-left text-gray-700">📅 Issued On</th>
                  <th className="px-2 py-2 text-left text-gray-700">📌 Due On</th>
                  <th className="px-2 py-2 text-left text-gray-700">🔄 Penalty Status</th>
                  <th className="px-2 py-2 text-left text-gray-700">💰 Penalty Amount</th>
                  <th className="px-2 py-2 text-left text-gray-700">💸 Paid Amount</th>
                  <th className="px-2 py-2 text-left text-gray-700">⚙️ Manage</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {penalties.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-2 py-2 text-center text-gray-500">
                      No penalties found
                    </td>
                  </tr>
                ) : (
                  penalties.map((penalty, index) => (
                    <tr key={penalty.PenaltyId} className="hover:bg-gray-50">
                      <td className="px-2 py-2">{index + 1}</td>
                      <td className="px-2 py-2 uppercase whitespace-nowrap">{penalty.BookTitle}</td>
                      <td className="px-2 py-2">{penalty.StudentName}</td>
                      <td className="px-2 py-2">{penalty.courseName || 'N/A'}</td>
                      <td className="px-2 py-2">
                        <div className="text-xs flex items-center gap-1">
                          <FontAwesomeIcon icon={faCalendarDays} className="text-red-500" />
                          <span>{calculateLateDays(penalty)} days</span>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        {new Date(penalty.IssueDate).toLocaleDateString()}
                      </td>
                      <td className="px-2 py-2">
                        {new Date(penalty.DueDate).toLocaleDateString()}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            penalty.PenaltyStatus === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {penalty.PenaltyStatus}
                        </span>
                      </td>
                      <td className="px-2 py-2">{penalty.Amount} INR</td>
                      <td className="px-2 py-2">{penalty.TotalPaid} INR</td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {penalty.PenaltyStatus === 'unpaid' && (
                          <button
                            onClick={() => handlePaymentClick(penalty)}
                            className="text-green-600 hover:text-green-800 bg-green-200 p-1 rounded text-xs flex items-center gap-1"
                          >
                            <FontAwesomeIcon icon={faMoneyBill} /> Pay Fine
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isPaymentModalOpen && selectedPenalty && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">💰 Pay Fine</h2>

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 mb-4">
              <p><strong>Student:</strong> <span className="text-gray-900">{selectedPenalty.StudentName}</span></p>
              <p><strong>Book:</strong> <span className="text-gray-900 uppercase">{selectedPenalty.BookTitle}</span></p>
              <p><strong>Course:</strong> {selectedPenalty.courseName || <span className="text-gray-400">N/A</span>}</p>
              <p><strong>Year:</strong> {selectedPenalty.courseYear || <span className="text-gray-400">N/A</span>}</p>
              <p><strong>Days Late:</strong> <span className="text-orange-600">{calculateLateDays(selectedPenalty)} days</span></p>
              <p>
                <strong>Penalty Status:</strong>{' '}
                <span className={selectedPenalty.PenaltyStatus === 'paid' ? 'text-green-600' : 'text-red-600'}>
                  {selectedPenalty.PenaltyStatus}
                </span>
              </p>
              <p><strong>Total Amount:</strong> ₹{selectedPenalty.Amount}</p>
              <p><strong>Paid:</strong> <span className="text-blue-600">₹{selectedPenalty.TotalPaid}</span></p>
              <p className="col-span-2"><strong>Remaining:</strong> <span className="text-red-600 font-semibold">₹{selectedPenalty.Amount - selectedPenalty.TotalPaid}</span></p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                <select
                  name="PaymentMode"
                  value={paymentData.PaymentMode}
                  onChange={handleInputChange}
                  className="border rounded w-full px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200"
                >
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              {paymentData.PaymentMode !== 'Cash' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Number</label>
                  <input
                    type="text"
                    name="TransactionId"
                    value={paymentData.TransactionId}
                    onChange={handleInputChange}
                    className="border rounded w-full px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid</label>
                <input
                  type="number"
                  name="AmountPaid"
                  value={paymentData.AmountPaid}
                  onChange={handleInputChange}
                  className="border rounded w-full px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Received Date</label>
                <input
                  type="date"
                  name="ReceivedDate"
                  value={paymentData.ReceivedDate}
                  onChange={handleInputChange}
                  className="border rounded w-full px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200"
                />
              </div>

              {/* Library Payment History Table */}
              <div className="mt-4">
                <h3 className="text-md font-medium text-gray-800 mb-2">Library Payment History</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-1 text-left text-gray-700">Book Title</th>
                        <th className="px-2 py-1 text-left text-gray-700">Student Name</th>
                        <th className="px-2 py-1 text-left text-gray-700">Course Name</th>
                        <th className="px-2 py-1 text-left text-gray-700">Amount Paid</th>
                        <th className="px-2 py-1 text-left text-gray-700">Payment Mode</th>
                        <th className="px-2 py-1 text-left text-gray-700">Transaction ID</th>
                        <th className="px-2 py-1 text-left text-gray-700">Created By</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paymentHistory.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-2 py-2 text-center text-gray-500">
                            No payment history found
                          </td>
                        </tr>
                      ) : (
                        paymentHistory.map((payment, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-2 py-1 uppercase">{payment.BookTitle}</td>
                            <td className="px-2 py-1">{payment.StudentName}</td>
                            <td className="px-2 py-1">{payment.CourseName || 'N/A'}</td>
                            <td className="px-2 py-1">₹{payment.AmountPaid}</td>
                            <td className="px-2 py-1">{payment.PaymentMode}</td>
                            <td className="px-2 py-1">{payment.TransactionId || 'N/A'}</td>
                            <td className="px-2 py-1">{payment.CreatedBy}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handlePaymentSubmit}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
              >
                Save Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ManagePenalty;