'use client';
import { useState, useEffect } from 'react';
import { useUser } from '@/app/hooks/useUser';
import axios from 'axios';

export default function MyAccountPage() {
  const user = useUser();
  const [studentData, setStudentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const response = await axios.get('/api/student');
        setStudentData(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch student data');
        setLoading(false);
      }
    };
    fetchStudentData();
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen ">
        <h1 className="text-2xl font-bold text-indigo-700 animate-pulse">Loading user...</h1>
      </div>
    );
  }

  const filteredData = studentData.filter(
    (student) => student.email === user.email
  );

  return (
    <div className="flex flex-col items-center min-h-screen  py-12 px-4">
      <div className="w-full max-w-4xl bg-white shadow-xl rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-center">
          <h1 className="text-4xl font-extrabold text-white">
            Welcome, {user.name}!
          </h1>
          <p className="text-blue-100 mt-2">Manage your student profile</p>
        </div>

        {loading && (
          <p className="p-8 text-center text-gray-600">Loading student data...</p>
        )}
        {error && (
          <p className="p-8 text-center text-red-600">{error}</p>
        )}

        {!loading && !error && filteredData.length === 0 && (
          <p className="p-8 text-center text-gray-600">No student data found.</p>
        )}

        {!loading && !error && filteredData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
            <div className="flex justify-center">
              <img
                src={filteredData[0].studentImage}
                alt="Profile"
                className="w-72 h-72 rounded-full border-4 border-indigo-400 shadow-md object-cover"
              />
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-indigo-700">
                My Account Details
              </h2>
              <div className="space-y-2 text-gray-700">
                <Detail label="Name" value={`${filteredData[0].fName} ${filteredData[0].lName || ''}`} />
                <Detail label="Mobile" value={filteredData[0].mobileNumber} />
                <Detail label="Email" value={user.email || 'Not available'} />
                <Detail label="Address" value="Noida" />
                <Detail label="City" value="Noida" />
                <Detail label="Pincode" value="201301" />
                <Detail label="Course" value={filteredData[0].courseName} />
                <Detail label="Course Year" value={filteredData[0].courseYear} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-lg">
      <span className="font-semibold text-indigo-600">{label} :</span>{' '}
      <span className="text-black  hover:">{value}</span>
    </p>
  );
}
