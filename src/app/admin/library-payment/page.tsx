'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoneyBill } from '@fortawesome/free-solid-svg-icons';

export default function LibraryPaymentPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [paymentData, setPaymentData] = useState({
    PaymentMode: 'Cash',
    TransactionId: '',
    AmountPaid: '',
    ReceivedDate: new Date().toISOString().split('T')[0],
  });
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get('/api/library-payment', { timeout: 30000 });
        console.log('Fetched payments:', response.data); // Debug log
        setPayments(response.data);
      } catch (err) {
        setError(
          err.response?.status === 404
            ? 'No payment data found'
            : 'Failed to load payment data. Please try again later.'
        );
        console.error('Error fetching payments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  const handlePaymentClick = async (payment: { IssueId: any; }) => {
    if (!payment || !payment.IssueId) {
      setHistoryError('Invalid payment data. Missing or invalid IssueId.');
      return;
    }

    setSelectedPayment(payment);
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const penaltyResponse = await axios.get(`/api/penalty?issueId=${payment.IssueId}`, {
        timeout: 30000,
      });
      const penalty = penaltyResponse.data.find((p: { IssueId: any; }) => p.IssueId === payment.IssueId);
      if (penalty) {
        setPaymentData({
          PaymentMode: 'Cash',
          TransactionId: '',
          AmountPaid: (penalty.Amount - penalty.TotalPaid).toString(),
          ReceivedDate: new Date().toISOString().split('T')[0],
        });
      } else {
        setPaymentData({
          PaymentMode: 'Cash',
          TransactionId: '',
          AmountPaid: '0',
          ReceivedDate: new Date().toISOString().split('T')[0],
        });
      }
      const historyResponse = await axios.get(`/api/library-payment?issueId=${payment.IssueId}`, {
        timeout: 30000,
      });
      setPaymentHistory(historyResponse.data);
    } catch (error) {
      console.error('Error fetching penalty or payment history:', error);
      setPaymentData({
        PaymentMode: 'Cash',
        TransactionId: '',
        AmountPaid: '0',
        ReceivedDate: new Date().toISOString().split('T')[0],
      });
      setPaymentHistory([]);
      setHistoryError('Failed to load payment history. Please try again.');
    } finally {
      setHistoryLoading(false);
      setIsPaymentModalOpen(true);
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

    if (!selectedPayment || !selectedPayment.IssueId) {
      alert('Invalid payment selection. Missing IssueId.');
      return;
    }

    try {
      console.log('Sending payment data:', {
        IssueId: selectedPayment.IssueId,
        StudentId: selectedPayment.StudentId,
        AmountPaid: amountToPay,
        PaymentMode: paymentData.PaymentMode,
        TransactionId: paymentData.TransactionId || null,
        ReceivedDate: paymentData.ReceivedDate,
        ReceiveBy: 'Kishan Kumar',
        CreatedBy: 'Kishan Kumar',
      }); // Debug log
      const response = await axios.post(
        '/api/penalty',
        {
          IssueId: selectedPayment.IssueId,
          StudentId: selectedPayment.StudentId, // Ensure this exists in payment data
          AmountPaid: amountToPay,
          PaymentMode: paymentData.PaymentMode,
          TransactionId: paymentData.TransactionId || null,
          ReceivedDate: paymentData.ReceivedDate, // Added to match potential backend requirement
          ReceiveBy: 'Kishan Kumar',
          CreatedBy: 'Kishan Kumar',
        },
        { timeout: 30000 }
      );
      setIsPaymentModalOpen(false);
      const paymentsResponse = await axios.get('/api/library-payment');
      setPayments(paymentsResponse.data);
      const historyResponse = await axios.get(`/api/library-payment?issueId=${selectedPayment.IssueId}`, {
        timeout: 30000,
      });
      setPaymentHistory(historyResponse.data);
      alert('Payment saved successfully');
    } catch (error) {
      console.error('Error saving payment:', error);
      alert(`Error saving payment: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleInputChange = (e: { target: { name: any; value: any; }; }) => {
    const { name, value } = e.target;
    setPaymentData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <main className="p-4  mx-auto">
      <h1 className="text-2xl font-bold mb-4">Library Payment</h1>
      <p className="text-gray-600 mb-4">Manage Library Payments</p>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-600">Loading...</p>
        </div>
      ) : error ? (
        <div className="text-red-600 text-center p-4">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left text-gray-700">Book Title</th>
                <th className="px-2 py-2 text-left text-gray-700">Student Name</th>
                <th className="px-2 py-2 text-left text-gray-700">Course Name</th>
                <th className="px-2 py-2 text-left text-gray-700">Amount Paid</th>
                <th className="px-2 py-2 text-left text-gray-700">Payment Mode</th>
                <th className="px-2 py-2 text-left text-gray-700">Transaction ID</th>
                <th className="px-2 py-2 text-left text-gray-700">Created By</th>
                <th className="px-2 py-2 text-left text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-2 py-2 text-center text-gray-500">
                    No payments found
                  </td>
                </tr>
              ) : (
                payments.map((payment, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-2 py-1 uppercase">{payment.BookTitle}</td>
                    <td className="px-2 py-1">{payment.StudentName}</td>
                    <td className="px-2 py-1">{payment.CourseName || 'N/A'}</td>
                    <td className="px-2 py-1">₹{payment.AmountPaid}</td>
                    <td className="px-2 py-1">{payment.PaymentMode}</td>
                    <td className="px-2 py-1">{payment.TransactionId || 'N/A'}</td>
                    <td className="px-2 py-1">{payment.CreatedBy}</td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      <button
                        onClick={() => handlePaymentClick(payment)}
                        className="text-green-600 hover:text-green-800 bg-green-200 p-1 rounded text-xs flex items-center gap-1"
                        disabled={!payment.IssueId}
                      >
                        <FontAwesomeIcon icon={faMoneyBill} /> Pay Fine
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {isPaymentModalOpen && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">💰 Pay Fine</h2>

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 mb-4">
              <p><strong>Student:</strong> <span className="text-gray-900">{selectedPayment.StudentName}</span></p>
              <p><strong>Book:</strong> <span className="text-gray-900 uppercase">{selectedPayment.BookTitle}</span></p>
              <p><strong>Course:</strong> {selectedPayment.CourseName || <span className="text-gray-400">N/A</span>}</p>
              <p><strong>Year:</strong> <span className="text-gray-400">N/A</span></p>
              <p><strong>Days Late:</strong> <span className="text-orange-600">N/A</span></p>
              <p>
                <strong>Penalty Status:</strong>{' '}
                <span className="text-red-600">unpaid</span>
              </p>
              <p><strong>Total Amount:</strong> <span className="text-gray-900">₹{paymentData.AmountPaid || '0'}</span></p>
              <p><strong>Paid:</strong> <span className="text-blue-600">₹{selectedPayment.AmountPaid || '0'}</span></p>
              <p className="col-span-2"><strong>Remaining:</strong> <span className="text-red-600 font-semibold">₹{paymentData.AmountPaid ? (parseFloat(paymentData.AmountPaid) - (selectedPayment.AmountPaid || 0)) : '0'}</span></p>
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
                      {historyLoading ? (
                        <tr>
                          <td colSpan={7} className="px-2 py-2 text-center text-gray-600">
                            Loading history...
                          </td>
                        </tr>
                      ) : historyError ? (
                        <tr>
                          <td colSpan={7} className="px-2 py-2 text-center text-red-600">
                            {historyError}
                          </td>
                        </tr>
                      ) : paymentHistory.length === 0 ? (
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
    </main>
  );
}