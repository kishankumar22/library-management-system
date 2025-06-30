'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faCalendarDays,
  faSearch,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';

const ManagePenalty = () => {
  const [penalties, setPenalties] = useState([]);
  const [allPenalties, setAllPenalties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false); // Changed to false by default
  const [selectedPenalty, setSelectedPenalty] = useState(null);
  const [paymentData, setPaymentData] = useState({
    PaymentMode: 'Cash',
    TransactionId: '',
    AmountPaid: '',
    ReceivedDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchPenalties();
  }, []);

  const fetchPenalties = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/penalty');
      let filteredPenalties = response.data;

      // Filter penalties based on overdue books
      filteredPenalties = filteredPenalties.filter((penalty) => {
        const issue = penalty;
        return new Date(issue.ReturnDate) > new Date(issue.DueDate);
      });

      setAllPenalties(filteredPenalties);
      applyFilters(filteredPenalties);
    } catch (error) {
      console.error('Error fetching penalties:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (data) => {
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
          statusFilter === 'paid' ? penalty.Status === 'paid' : penalty.Status === 'unpaid'
      );
    }
    if (startDate && endDate) {
      filtered = filtered.filter((penalty) => {
        const createdOn = new Date(penalty.CreatedOn);
        return createdOn >= new Date(startDate) && createdOn <= new Date(endDate);
      });
    }

    setPenalties(filtered);
  };

  useEffect(() => {
    applyFilters(allPenalties);
  }, [searchTerm, statusFilter, startDate, endDate]);

  const handlePaymentClick = (penalty) => {
    setSelectedPenalty(penalty);
    setPaymentData({
      PaymentMode: 'Cash',
      TransactionId: '',
      AmountPaid: penalty.Amount.toString(),
      ReceivedDate: new Date().toISOString().split('T')[0],
    });
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async () => {
    if (!paymentData.AmountPaid || !paymentData.PaymentMode) {
      alert('Please fill all required fields');
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
      await axios.post('/api/panalty', {
        IssueId: selectedPenalty.IssueId,
        StudentId: selectedPenalty.StudentId, // Added StudentId
        AmountPaid: parseFloat(paymentData.AmountPaid),
        PaymentMode: paymentData.PaymentMode,
        TransactionId: paymentData.TransactionId || null,
        ReceivedBy: 'Kishan Kumar',
        CreatedBy: 'Kishan Kumar',
      });

      await axios.put(`/api/penalty?id=${selectedPenalty.PenaltyId}`, {
        Status: 'paid',
      });

      setIsPaymentModalOpen(false);
      fetchPenalties();
      alert('Payment saved successfully');
    } catch (error) {
      console.error('Error saving payment:', error);
      alert('Error saving payment');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const calculateLateDays = (issue) => {
    const returnDate = new Date(issue.ReturnDate);
    const dueDate = new Date(issue.DueDate);
    return Math.max(0, Math.ceil((returnDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="container mx-auto p-4 bg-white rounded shadow overflow-hidden">
      {loading ? (
        <div className="flex justify-center items-center p-4">
          <FontAwesomeIcon icon={faSpinner} spin size="lg" />
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
            <h1 className="text-xl font-bold">Manage Penalties</h1>
          </div>

          <div className="bg-gray-50 p-4 rounded mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by book or student..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-2 py-1 border rounded text-sm"
                />
                <FontAwesomeIcon
                  icon={faSearch}
                  className="absolute left-2 top-2 text-gray-400 text-sm"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border p-2 rounded text-sm"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border p-2 rounded text-sm"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border p-2 rounded text-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left">Sr.</th>
                  <th className="px-2 py-2 text-left">📖 Book Title</th>
                  <th className="px-2 py-2 text-left">👨‍🎓 Student Name</th>
                  <th className="px-2 py-2 text-left">🎓Course Name</th>
                  <th className="px-2 py-2 text-left">⏳Days Late</th>
                  <th className="px-2 py-2 text-left">📅 Issued On</th>
                  <th className="px-2 py-2 text-left">📌Due On</th>
                  <th className="px-2 py-2 text-left">🔄 Penalty Status</th>
                  <th className="px-2 py-2 text-left">💰 Penalty Amount</th>
                  <th className="px-2 py-2 text-left">⚙️Manage</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {penalties.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-2 py-2 text-center text-gray-500">
                      No penalties found
                    </td>
                  </tr>
                ) : (
                  penalties.map((penalty, index) => (
                    <tr key={penalty.PenaltyId} className="hover:bg-gray-50">
                      <td className="px-2 py-2">{index + 1}</td>
                      <td className="px-2 py-2 whitespace-nowrap">{penalty.BookTitle}</td>
                      <td className="px-2 py-2">{penalty.StudentName}</td>
                      <td className="px-2 py-2">{penalty.courseName || 'N/A'}</td>
                      <td className="px-2 py-2">
                        <div className="text-xs flex items-center gap-1">
                          <FontAwesomeIcon
                            icon={faCalendarDays}
                            className="text-red-500"
                          />
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
                            penalty.Status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {penalty.Status}
                        </span>
                      </td>
                      <td className="px-2 py-2">{penalty.Amount} INR</td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {penalty.Status === 'unpaid' && (
                          <button
                            onClick={() => handlePaymentClick(penalty)}
                            className="text-red-600 hover:text-red-800 text-xs flex items-center gap-1"
                          >
                            <FontAwesomeIcon icon={faTrash} /> Pay Fine
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Pay Fine</h2>
            <p>Student: {selectedPenalty.StudentName}</p>
            <p>Book: {selectedPenalty.BookTitle}</p>
            <p>Course: {selectedPenalty.courseName || 'N/A'}</p>
            <p>Year: {selectedPenalty.courseYear || 'N/A'}</p>
            <p>Days Late: {calculateLateDays(selectedPenalty)} days</p>
            <p>
              Penalty Status: <span className="text-red-600">Unpaid</span>
            </p>
            <p>Total Amount: {selectedPenalty.Amount} INR</p>
            <div className="mb-4 mt-4">
              <label className="block mb-1 text-sm">Payment Mode</label>
              <select
                name="PaymentMode"
                value={paymentData.PaymentMode}
                onChange={handleInputChange}
                className="border p-2 w-full rounded text-sm"
              >
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block mb-1 text-sm">Transaction Number</label>
              <input
                type="text"
                name="TransactionId"
                value={paymentData.TransactionId}
                onChange={handleInputChange}
                className="border p-2 w-full rounded text-sm"
                required={paymentData.PaymentMode !== 'Cash'}
                disabled={paymentData.PaymentMode === 'Cash'}
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1 text-sm">Amount Paid</label>
              <input
                type="number"
                name="AmountPaid"
                value={paymentData.AmountPaid}
                onChange={handleInputChange}
                className="border p-2 w-full rounded text-sm"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1 text-sm">Received Date</label>
              <input
                type="date"
                name="ReceivedDate"
                value={paymentData.ReceivedDate}
                onChange={handleInputChange}
                className="border p-2 w-full rounded text-sm"
              />
            </div>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handlePaymentSubmit}
                className="bg-blue-500 text-white px-4 py-2 rounded text-sm"
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