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
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

export default function PenaltyReportPage() {
  const user = useUser();
  const [penalties, setPenalties] = useState([]);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // 1️⃣ Get student ID
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

  // 2️⃣ Get penalty data
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
    return <div className="p-8 text-center">Loading data...</div>;
  }

  // 3️⃣ Filter by studentId and deduplicate by PenaltyId
  const filteredPenalties = penalties
    .filter((p) => p.StudentId === studentId)
    .filter(
      (value, index, self) =>
        index === self.findIndex((t) => t.PenaltyId === value.PenaltyId)
    );

  return (
    <main className=" bg-blue-50 min-h-screen">
      <h1 className="text-2xl font-bold text-center mb-3 bg-blue-700 text-white p-2 rounded">
        <FontAwesomeIcon icon={faBook} className="mr-2" />
        Penalty Report
      </h1>

      {loading && <p>Loading penalty data...</p>}

      {!loading && filteredPenalties.length === 0 && (
        <p className="text-center text-gray-600">No penalties found.</p>
      )}

      {!loading && filteredPenalties.length > 0 && (
        <table className="min-w-full border border-blue-400 shadow-lg">
          <thead className="bg-blue-200">
            <tr>
              <th className="px-4 py-2 text-left">
                <FontAwesomeIcon icon={faBook} className="mr-1" />
                Book Name
              </th>
              <th className="px-4 py-2 text-left">
                <FontAwesomeIcon icon={faMoneyBill} className="mr-1" />
                Price
              </th>
              <th className="px-4 py-2 text-left">
                <FontAwesomeIcon icon={faDollarSign} className="mr-1" />
                Penalty Amt
              </th>
              <th className="px-4 py-2 text-left">
                <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
                Detail
              </th>
              <th className="px-4 py-2 text-left">
                <FontAwesomeIcon icon={faCalendarDays} className="mr-1" />
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredPenalties.map((penalty) => (
              <tr
                key={penalty.PenaltyId}
                className="odd:bg-blue-50 even:bg-blue-100 hover:bg-blue-200"
              >
                <td className="px-4 py-2">{penalty.BookTitle}</td>
                <td className="px-4 py-2">{penalty.Amount}</td>
                <td className="px-4 py-2">{penalty.TotalPaid}</td>
                <td className="px-4 py-2">{penalty.Remarks}</td>
                <td className="px-4 py-2">
                  {new Date(penalty.CreatedOn).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
