"use client"
import { useState, useEffect } from 'react';
import { useUser } from '@/app/hooks/useUser';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faUser,
  faEnvelope,
  faPhone,
  faMapMarkerAlt,
  faCity,
  faMapPin,
  faGraduationCap,
  faCalendar,
  faTimesCircle,
  faCheckCircle,
  faUserCircle,
  faIdCard,
  faTimes,
  faExpand,
} from '@fortawesome/free-solid-svg-icons';

export default function MyAccountPage() {
  const user = useUser();
  const [studentData, setStudentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

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

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowImageModal(false);
    };

    if (showImageModal) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showImageModal]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FontAwesomeIcon icon={faSpinner} spin className="w-8 h-8 text-blue-600 mr-3" />
        <span className="text-gray-600">Loading user...</span>
      </div>
    );
  }

  const filteredData = studentData.filter(
    (student) => student.email === user.email
  );

  const student = filteredData[0];

  return (
    <div className="min-h-screen p-2 bg-gray-50">
      {loading && (
        <div className="flex items-center justify-center min-h-screen">
          <FontAwesomeIcon icon={faSpinner} spin className="w-8 h-8 text-blue-600 mr-3" />
          <span className="text-gray-600">Loading student data...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <FontAwesomeIcon icon={faTimesCircle} className="text-5xl text-red-500 mb-3" />
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && filteredData.length === 0 && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <FontAwesomeIcon icon={faUserCircle} className="text-5xl text-gray-300 mb-3" />
            <p className="text-gray-600 font-medium">No student data found</p>
          </div>
        </div>
      )}

      {!loading && !error && filteredData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
          {/* Left Side - Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden sticky top-2">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="relative group">
                    <div 
                      className="w-32 h-32 rounded-full bg-white p-1.5 shadow-lg cursor-pointer transform transition-all duration-300 group-hover:scale-105"
                      onClick={() => setShowImageModal(true)}
                    >
                      <img
                        src={student.studentImage}
                        alt="Profile"
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                    
                    {/* Hover Overlay */}
                    <div 
                      className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={() => setShowImageModal(true)}
                    >
                      <FontAwesomeIcon icon={faExpand} className="text-white text-xl" />
                    </div>
                    
                    {/* Active Status Badge */}
                    <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-2 shadow-lg border-2 border-white">
                      <FontAwesomeIcon icon={faCheckCircle} className="text-white text-sm" />
                    </div>
                  </div>
                </div>
                
                <h2 className="text-xl font-bold text-white mb-1">
                  {student.fName} {student.lName || ''}
                </h2>
                <p className="text-blue-100 text-xs mb-4">{user.email}</p>
                
                <div className="flex flex-col gap-2">
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/30">
                    <p className="text-xs text-blue-100 mb-0.5">Student ID</p>
                    <p className="text-lg font-bold text-white">#{student.id || 'N/A'}</p>
                  </div>
                  
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/30">
                    <p className="text-xs text-blue-100 mb-0.5">Course</p>
                    <p className="text-sm font-bold text-white">{student.courseName}</p>
                  </div>
                  
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/30">
                    <p className="text-xs text-blue-100 mb-0.5">Year</p>
                    <p className="text-sm font-bold text-white">{student.courseYear}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-gray-50">
                <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-green-500" />
                  <span className="font-medium">Account Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Details */}
          <div className="lg:col-span-2">
            {/* Personal Information Section */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-2">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FontAwesomeIcon icon={faUser} className="text-blue-600 text-sm" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Personal Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <DetailRow icon={faUser} label="Full Name" value={`${student.fName} ${student.lName || ''}`} />
                <DetailRow icon={faPhone} label="Mobile" value={student.mobileNumber} />
                <DetailRow icon={faEnvelope} label="Email" value={user.email || 'Not available'} fullWidth />
              </div>
            </div>

            {/* Address Information Section */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-2">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="text-green-600 text-sm" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Address Details</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <DetailRow icon={faMapMarkerAlt} label="Address" value="Noida" />
                <DetailRow icon={faCity} label="City" value="Noida" />
                <DetailRow icon={faMapPin} label="Pincode" value="201301" />
              </div>
            </div>

            {/* Academic Information Section */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <FontAwesomeIcon icon={faGraduationCap} className="text-purple-600 text-sm" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Academic Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <DetailRow icon={faGraduationCap} label="Course Name" value={student.courseName} />
                <DetailRow icon={faCalendar} label="Course Year" value={student.courseYear} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && student && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div 
            className="relative max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Profile Picture</h3>
                <p className="text-sm text-blue-100">{student.fName} {student.lName || ''}</p>
              </div>
              <button
                onClick={() => setShowImageModal(false)}
                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
                aria-label="Close modal"
              >
                <FontAwesomeIcon icon={faTimes} className="text-white text-lg" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 bg-gray-50">
              <div className="flex justify-center">
                <img
                  src={student.studentImage}
                  alt="Profile Full View"
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-100 px-6 py-4 flex justify-between items-center">
              <div className="text-xs text-gray-600">
                Click outside or press <kbd className="px-2 py-1 bg-white rounded border border-gray-300 font-mono">ESC</kbd> to close
              </div>
              <button
                onClick={() => setShowImageModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ icon, label, value, fullWidth = false }) {
  return (
    <div className={`flex items-center gap-3 ${fullWidth ? 'md:col-span-2' : ''}`}>
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
        <FontAwesomeIcon icon={icon} className="text-gray-600 text-xs" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-sm font-bold text-gray-900 break-words">{value}</p>
      </div>
    </div>
  );
}
