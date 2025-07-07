"use client"
import { useState, useEffect } from 'react';
import { useUser } from '@/app/hooks/useUser';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faPlus,
  faEdit,
  faTrash,
  faSearch,
  faFilter,
  faTimesCircle,
  faTimes,
  faToggleOff,
  faToggleOn
} from '@fortawesome/free-solid-svg-icons';



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
        <div className="text-center">
          <FontAwesomeIcon icon={faSpinner} className="text-xl text-indigo-600 animate-spin mb-4" />
          <h1 className="text-2xl font-bold text-indigo-700">Loading user...</h1>
        </div>
      </div>
    );
  }

  const filteredData = studentData.filter(
    (student) => student.email === user.email
  );

  return (
    <div className="min-h-screenpy-8 px-4 sm:px-6 lg:px-8">
      <div className="">
        {/* Main Content Card */}
        <div className="bg-white shadow-2xl rounded-3xl overflow-hidden border border-gray-100">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <FontAwesomeIcon icon={faSpinner} className="text-3xl text-indigo-600 animate-spin mb-3" />
                <p className="text-gray-600">Loading student data...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <FontAwesomeIcon icon={faTimesCircle} className="text-3xl text-red-500 mb-3" />
                <p className="text-red-600">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && filteredData.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <FontAwesomeIcon icon={faSearch} className="text-3xl text-gray-400 mb-3" />
                <p className="text-gray-600">No student data found.</p>
              </div>
            </div>
          )}

          {!loading && !error && filteredData.length > 0 && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6  items-center">
                {/* Profile Image Section */}
                <div className="flex justify-center items-center lg:justify-center ">
                  <div className="relative  ">
                    <div className="w-48 h-48 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 p-1 shadow-lg">
                      <img
                        src={filteredData[0].studentImage}
                        alt="Profile"
                        className="w-full h-full rounded-full object-cover border-2 border-white shadow-md"
                      />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-2 shadow-lg">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* Account Details Section */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="border-b border-gray-200 pb-3">
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">
                      Account Details
                    </h2>
                    <p className="text-sm text-gray-600">Your personal information and course details</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DetailCard 
                      icon={faEdit}
                      label="Full Name" 
                      value={`${filteredData[0].fName} ${filteredData[0].lName || ''}`}
                      gradient="from-blue-500 to-blue-600"
                    />
                    <DetailCard 
                      icon={faEdit}
                      label="Mobile" 
                      value={filteredData[0].mobileNumber}
                      gradient="from-green-500 to-green-600"
                    />
                    <DetailCard 
                      icon={faEdit}
                      label="Email" 
                      value={user.email || 'Not available'}
                      gradient="from-purple-500 to-purple-600"
                      fullWidth
                    />
                    <DetailCard 
                      icon={faEdit}
                      label="Address" 
                      value="Noida"
                      gradient="from-orange-500 to-orange-600"
                    />
                    <DetailCard 
                      icon={faEdit}
                      label="City" 
                      value="Noida"
                      gradient="from-pink-500 to-pink-600"
                    />
                    <DetailCard 
                      icon={faEdit}
                      label="Pincode" 
                      value="201301"
                      gradient="from-indigo-500 to-indigo-600"
                    />
                    <DetailCard 
                      icon={faEdit}
                      label="Course" 
                      value={filteredData[0].courseName}
                      gradient="from-red-500 to-red-600"
                    />
                    <DetailCard 
                      icon={faEdit}
                      label="Course Year" 
                      value={filteredData[0].courseYear}
                      gradient="from-teal-500 to-teal-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailCard({ icon, label, value, gradient, fullWidth = false }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 ${fullWidth ? 'sm:col-span-2' : ''}`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md`}>
          <FontAwesomeIcon icon={icon} className="text-white text-sm" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            {label}
          </p>
          <p className="text-sm font-semibold text-gray-900 break-words">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}