'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '@/app/hooks/useUser';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBook,
  faSpinner,
  faFilter,
  faMoneyBill,
  faExclamationCircle,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';

export default function StudentDashboard() {
  const user = useUser();
  const [studentId, setStudentId] = useState<number | null>(null);
  const [bookIssues, setBookIssues] = useState([]);
  const [penalties, setPenalties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          setError('No student found for this email');
        }
      } catch (err) {
        console.error('Error fetching student:', err);
        setError('Failed to fetch student data');
      }
    };

    if (user?.email) {
      fetchStudentId();
    }
  }, [user]);

  // Fetch book issues and penalties
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bookIssuesRes, penaltiesRes] = await Promise.all([
          axios.get('/api/book-issue'),
          axios.get('/api/penalty'),
        ]);
        setBookIssues(bookIssuesRes.data);
        setPenalties(penaltiesRes.data);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      fetchData();
    }
  }, [studentId]);

  // Filter book issues by studentId
  const filteredIssues = bookIssues.filter((issue) => issue.StudentId === studentId);

  // Calculate book issue stats
  const totalBooks = filteredIssues.length;
  const issuedBooks = filteredIssues.filter((issue) => issue.Status !== 'returned').length;
  const overdueBooks = filteredIssues.filter(
    (issue) => issue.Status !== 'returned' && new Date(issue.DueDate) < new Date()
  ).length;
  const returnedBooks = filteredIssues.filter((issue) => issue.Status === 'returned').length;

  // Filter penalties by studentId and deduplicate
  const filteredPenalties = penalties
    .filter((p) => p.StudentId === studentId)
    .filter(
      (value, index, self) =>
        index === self.findIndex((t) => t.PenaltyId === value.PenaltyId)
    );
  const totalPenalty = filteredPenalties.reduce((sum, p) => sum + (p.TotalPaid || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-600">
        <FontAwesomeIcon icon={faSpinner} spin className="w-6 h-6" />
        Loading...
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">{error}</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 text-black">
      

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6  mb-2">
        {/* Total Books Card */}
        <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Books</p>
              <p className="text-2xl font-semibold text-indigo-600">{totalBooks}</p>
            </div>
            <FontAwesomeIcon icon={faBook} className="text-indigo-400 w-6 h-6" />
          </div>
          {/* <a
            href="/book-report"
            className="text-blue-500 text-sm mt-2 inline-flex items-center hover:underline"
          >
            View Details <FontAwesomeIcon icon={faChevronRight} className="ml-1" />
          </a> */}
        </div>

        {/* Issued Books Card */}
        <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Issued Books</p>
              <p className="text-2xl font-semibold text-blue-600">{issuedBooks}</p>
            </div>
            <FontAwesomeIcon icon={faBook} className="text-blue-400 w-6 h-6" />
          </div>
          {/* <a
            href="/book-report?status=issued"
            className="text-blue-500 text-sm mt-2 inline-flex items-center hover:underline"
          >
            View Details <FontAwesomeIcon icon={faChevronRight} className="ml-1" />
          </a> */}
        </div>

        {/* Overdue Books Card */}
        <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Overdue Books</p>
              <p className="text-2xl font-semibold text-red-600">{overdueBooks}</p>
            </div>
            <FontAwesomeIcon icon={faExclamationCircle} className="text-red-400 w-6 h-6" />
          </div>
          {/* <a
            href="/book-report?status=overdue"
            className="text-blue-500 text-sm mt-2 inline-flex items-center hover:underline"
          >
            View Details <FontAwesomeIcon icon={faChevronRight} className="ml-1" />
          </a> */}
        </div>

        {/* Total Penalty Card */}
        <div className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Penalty</p>
              <p className="text-2xl font-semibold text-green-600">
                ₹{totalPenalty.toFixed(2)}
              </p>
            </div>
            <FontAwesomeIcon icon={faMoneyBill} className="text-green-400 w-6 h-6" />
          </div>
          {/* <a
            href="/penalty-report"
            className="text-blue-500 text-sm mt-2 inline-flex items-center hover:underline"
          >
            View Details <FontAwesomeIcon icon={faChevronRight} className="ml-1" />
          </a> */}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-indigo-800">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/student/my-report"
            className="bg-indigo-100 p-4 rounded-lg hover:bg-indigo-200 transition-colors flex items-center justify-between"
          >
            <span className="text-indigo-800 font-medium">View Book Report</span>
            <FontAwesomeIcon icon={faChevronRight} className="text-indigo-600" />
          </a>
          <a
            href="/student/penalty-report"
            className="bg-green-100 p-4 rounded-lg hover:bg-green-200 transition-colors flex items-center justify-between"
          >
            <span className="text-green-800 font-medium">View Penalty Report</span>
            <FontAwesomeIcon icon={faChevronRight} className="text-green-600" />
          </a>
        </div>
      </div>
    </main>
  );
}