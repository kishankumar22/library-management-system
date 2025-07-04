'use client';
import { useUser } from '@/app/hooks/useUser';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner, faPlus, faSearch, faEdit, faTrash,
  faCalendarDays, faTimes, faTimesCircle, faFileExcel,
  faUndo,
  faRedo,
} from '@fortawesome/free-solid-svg-icons';
import { Book, BookIssue, Student, Publication, Course } from '@/types';
import * as XLSX from 'xlsx';

const BookIssuePage = () => {
  const [bookIssues, setBookIssues] = useState<BookIssue[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    BookId: 0,
    StudentId: 0,
    Days: 7,
    Remarks: '',
    PublicationId: 0,
    CourseId: 0,
  });
  const [selectedIssue, setSelectedIssue] = useState<BookIssue | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [renewDays, setRenewDays] = useState(7);
  const [returnRemarks, setReturnRemarks] = useState('');
  const [fineAmount, setFineAmount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'issued' | 'returned' | 'overdue'>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [courseNameFilter, setCourseNameFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showPublicationInput, setShowPublicationInput] = useState(false);
  const [showStudentInput, setShowStudentInput] = useState(false);
  const [showBookInput, setShowBookInput] = useState(false);
  const [publicationSearch, setPublicationSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [bookSearch, setBookSearch] = useState('');
  const [overdueBooks, setOverdueBooks] = useState<BookIssue[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);
 const user = useUser();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (isModalOpen && modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsModalOpen(false);
        resetFormFields();
      }
    };

    if (isModalOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.body.style.overflow = 'auto';
    };
  }, [isModalOpen]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [issuesRes, booksRes, studentsRes, publicationsRes, coursesRes] = await Promise.all([
        axios.get('/api/book-issue'),
        axios.get('/api/book?availableCopies=1'),
        axios.get('/api/student'),
        axios.get('/api/publication'),
        axios.get('/api/course'),
      ]);

      setBookIssues(issuesRes.data);
      console.log(issuesRes.data);
      setBooks(booksRes.data);
      setStudents(studentsRes.data);
      setFilteredStudents(
        studentsRes.data.filter((student: { id: any; }, index: any, self: any[]) =>
          index === self.findIndex((s: { id: any; }) => s.id === student.id)
        )
      );
      setPublications(publicationsRes.data);
      setCourses(coursesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const uniqueCourseNames = [...new Set(courses.map(course => course.courseName).filter(Boolean))].sort();

  const handlePublicationChange = (pubId: number) => {
    setFormData(prev => ({ ...prev, PublicationId: pubId, BookId: 0 }));
    setFilteredStudents(
      students
        .filter((student, index, self) => index === self.findIndex((s) => s.id === student.id))
        .filter(s => s.courseId === courses.find(c => c.id === pubId)?.id || 0)
    );
    setBooks(books.filter(b => b.PublicationId === pubId));
    setSelectedBook(null);
    setPublicationSearch(publications.find(p => p.PubId === pubId)?.Name || '');
    setShowPublicationInput(false);
  };

  const handleBookChange = (bookId: number) => {
    const book = books.find(b => b.BookId === bookId);
    setSelectedBook(book || null);
    setFormData(prev => ({ ...prev, BookId: bookId }));
    setBookSearch(book?.Title || '');
    setShowBookInput(false);
  };

  const handleCourseChange = (courseId: number) => {
    setFormData(prev => ({ ...prev, CourseId: courseId, StudentId: 0 }));
    setFilteredStudents(
      students
        .filter((student, index, self) => index === self.findIndex((s) => s.id === student.id))
        .filter(s => s.courseId === courseId)
    );
    setStudentSearch('');
  };

  const handleStudentChange = async (studentId: number) => {
    const student = filteredStudents.find(s => s.id === studentId);
    if (!student) return;

    // Check for overdue books without toast
    const overdue = bookIssues.filter(
      issue =>
        issue.StudentId === studentId &&
        issue.Status === 'issued' &&
        new Date(issue.DueDate) < new Date()
    );
    setOverdueBooks(overdue);

    setFormData(prev => ({ ...prev, StudentId: studentId, CourseId: student.courseId || 0 }));
    setStudentSearch(`${student.fName} ${student.lName}` || '');
    setShowStudentInput(false);
  };

  const calculateDueDate = (days: number) => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);
    return dueDate.toISOString().split('T')[0];
  };

const handleIssueBook = async () => {
  if (isSubmitting) return;

  const { BookId, StudentId, Days } = formData;

  if (!BookId || !StudentId || !Days) {
    toast.error('Please fill all required fields');
    return;
  }

  setIsSubmitting(true);

  try {
    const payload = {
      ...formData,
      CreatedBy: user?.name || 'system',
      CreatedOn: new Date().toISOString(),
    };

    const response = await axios.post('/api/book-issue', payload);
    toast.success(response.data.message || 'Book issued successfully');

    setIsModalOpen(false);
    resetFormFields();
    await fetchData();
  } catch (error: any) {
    console.error('Issue Book Error:', error);
    toast.error(error.response?.data?.message || 'Failed to issue book');
  } finally {
    setIsSubmitting(false);
  }
};



 const handleEditBook = async () => {
  if (isSubmitting || !selectedIssue?.IssueId || !formData.BookId || !formData.StudentId || !formData.Days) {
    toast.error('Please fill all required fields');
    return;
  }

  setIsSubmitting(true);

  try {
    const payload = {
      ...formData,
      ModifiedBy: user?.name || 'system',
      ModifiedOn: new Date().toISOString(),
    };

    const response = await axios.patch(`/api/book-issue?id=${selectedIssue.IssueId}`, payload);
    toast.success(response.data.message || 'Book issue updated successfully');

    setIsEditModalOpen(false);
    setSelectedIssue(null);
    await fetchData();
  } catch (error: any) {
    console.error('Error updating book issue:', error);
    toast.error(error.response?.data?.message || 'Failed to update book issue');
  } finally {
    setIsSubmitting(false);
  }
};


  const handleReturnBook = async () => {
    if (isSubmitting || !selectedIssue) return;
    setIsSubmitting(true);
    try {
      const dueDate = new Date(selectedIssue.DueDate);
      const today = new Date();
      const isLate = today > dueDate;

    const response = await axios.put(`/api/book-issue?id=${selectedIssue.IssueId}`, {
  status: 'returned',
  remarks: returnRemarks,
  fineAmount: isLate ? fineAmount : 0,
  ModifiedBy: user.name, // <-- add this
});

      toast.success(response.data.message || 'Book returned successfully');
      setIsReturnModalOpen(false);
      setReturnRemarks('');
      setFineAmount(0);
      setSelectedIssue(null);
      await fetchData();
    } catch (error: any) {
      console.error('Error returning book:', error);
      toast.error(error.response?.data?.message || 'Failed to return book');
    } finally {
      setIsSubmitting(false);
    }
  };

const handleRenewBook = async () => {
  if (isSubmitting || !selectedIssue || !renewDays) return;
  setIsSubmitting(true);

  try {
    const response = await axios.put(`/api/book-issue?id=${selectedIssue.IssueId}`, {
      status: 'renewed',
      renewDays,
      ModifiedBy: user?.name || 'system',
      ModifiedOn: new Date().toISOString(),
    });

    toast.success(response.data.message || 'Book renewed successfully');
    setIsRenewModalOpen(false);
    setRenewDays(7);
    setSelectedIssue(null);
    await fetchData();
  } catch (error: any) {
    console.error('Error renewing book:', error);
    toast.error(error.response?.data?.message || 'Failed to renew book');
  } finally {
    setIsSubmitting(false);
  }
};



  const handleDeleteBook = async () => {
    if (isSubmitting || !selectedIssue) return;
    setIsSubmitting(true);
    try {
      const response = await axios.delete(`/api/book-issue?id=${selectedIssue.IssueId}`);
      toast.success(response.data.message || 'Book issue deleted successfully');
      setIsDeleteModalOpen(false);
      setSelectedIssue(null);
      await fetchData();
    } catch (error: any) {
      console.error('Error deleting book issue:', error);
      toast.error(error.response?.data?.message || 'Failed to delete book issue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (issue: BookIssue) => {
    const book = books.find(b => b.BookId === issue.BookId);
    const student = students.find(s => s.id === issue.StudentId);
    const days = Math.max(1, Math.ceil((new Date(issue.DueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));

    setSelectedIssue(issue);
    setSelectedBook(book || null);
    setFormData({
      BookId: issue.BookId || 0,
      StudentId: issue.StudentId || 0,
      Days: isNaN(days) ? 7 : days,
      Remarks: issue.Remarks || '',
      PublicationId: book?.PublicationId || 0,
      CourseId: student?.courseId || 0,
    });
    setFilteredStudents(
      students
        .filter((student, index, self) => index === self.findIndex((s) => s.id === student.id))
        .filter(s => s.courseId === student?.courseId || 0)
    );
    setBooks(books.filter(b => b.PublicationId === book?.PublicationId || 0)); // Reset books based on current publication
    setPublicationSearch(publications.find(p => p.PubId === book?.PublicationId)?.Name || '');
    setStudentSearch(`${student?.fName} ${student?.lName}` || '');
    setBookSearch(book?.Title || '');
    setIsEditModalOpen(true);
  };

  const filteredIssues = bookIssues.filter(issue => {
    const matchesSearch = [
      issue.BookTitle?.toLowerCase(),
      issue.StudentName?.toLowerCase(),
      issue.courseName?.toLowerCase(),
    ].some(val => val?.includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || issue.Status === statusFilter;
    const matchesDate = (!dateRange.start || new Date(issue.IssueDate) >= new Date(dateRange.start)) &&
                       (!dateRange.end || new Date(issue.IssueDate) <= new Date(dateRange.end));
    const matchesCourseName = !courseNameFilter || (issue.courseName?.toLowerCase() === courseNameFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesDate && matchesCourseName;
  });

  const resetFormFields = () => {
    setFormData({
      BookId: 0,
      StudentId: 0,
      Days: 7,
      Remarks: '',
      PublicationId: 0,
      CourseId: 0,
    });
    setSelectedBook(null);
    setPublicationSearch('');
    setStudentSearch('');
    setBookSearch('');
    setShowPublicationInput(false);
    setShowStudentInput(false);
    setShowBookInput(false);
    setOverdueBooks([]);
    setBooks(books); // Reset to all books
  };

  const exportToExcel = () => {
    if (filteredIssues.length === 0) {
      toast.error('No data available for export');
      return;
    }
    const wsData = filteredIssues.map((issue, index) => ({
      'Sr. No': index + 1,
      'Book Title': issue.BookTitle,
      'Student Name': issue.StudentName,
      'Course Name': issue.courseName || 'N/A',
      'Days Left': `${Math.ceil((new Date(issue.DueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days ${Math.ceil((new Date(issue.DueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) < 0 ? 'overdue' : 'left'}`,
      'Issued On': new Date(issue.IssueDate).toLocaleDateString(),
      'Due On': new Date(issue.DueDate).toLocaleDateString(),
      'Return Date': issue.ReturnDate ? new Date(issue.ReturnDate).toLocaleDateString() : 'N/A',
      'Status': issue.Status,
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Book Issues');
    const currentDate = new Date().toLocaleDateString().replace(/\//g, '-');
    XLSX.writeFile(wb, `Book_Issues_${currentDate}.xlsx`);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2 bg-gradient-to-r from-blue-50 to-white p-2 rounded-md">
        <h1 className="text-xl font-bold text-blue-800">Book Issue Manager</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              resetFormFields();
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-800 text-white py-1 px-3 rounded text-sm flex items-center gap-1 transition duration-200"
          >
            <FontAwesomeIcon icon={faPlus} size="xs" className='w-4 h-4' /> Issue New Book
          </button>
          <button
            onClick={exportToExcel}
            className="bg-green-600 hover:bg-green-800 text-white py-1 px-3 rounded text-sm flex items-center gap-1 transition duration-200"
          >
            <FontAwesomeIcon icon={faFileExcel} size="xs" className='w-4 h-4' /> Export to Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded shadow p-3 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-center">
          <div className="text-sm font-medium text-blue-600">Total Book Issues: {bookIssues.length}</div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by book, student"
              className="w-full pl-8 pr-2 py-1 border rounded text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <FontAwesomeIcon icon={faSearch} className="absolute left-2 top-2.5 w-3 h-3 text-gray-400" />
          </div>
          <select
            className="w-full p-1 border rounded text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All Status</option>
            <option value="issued">Issued</option>
            <option value="returned">Returned</option>
            <option value="overdue">Overdue</option>
          </select>
          <input
            type="date"
            className="w-full p-1 border rounded text-sm"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
          />
          <input
            type="date"
            className="w-full p-1 border rounded text-sm"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
          />
          <select
            className="w-full p-1 border rounded text-sm"
            value={courseNameFilter}
            onChange={(e) => setCourseNameFilter(e.target.value)}
          >
            <option value="">All Courses</option>
            {uniqueCourseNames.map((name, idx) => (
              <option key={String(name || idx)} value={String(name || '')}>
                {name || ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center h-[85vh] items-center p-4">
            <FontAwesomeIcon icon={faSpinner} spin size="lg" className="w-10 h-10 text-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-blue-800">Sr.</th>
                  <th className="px-3 py-2 text-left text-blue-800">📖 Book Title</th>
                  <th className="px-3 py-2 text-left text-blue-800">👨‍🎓 Student Name</th>
                  <th className="px-3 py-2 text-left text-blue-800">🎓 Course Name</th>
                  <th className="px-3 py-2 text-left text-blue-800">⏳ Days Left</th>
                  <th className="px-3 py-2 text-left text-blue-800">📅 Issued On</th>
                  <th className="px-3 py-2 text-left text-blue-800">📌 Due On</th>
                  <th className="px-3 py-2 text-left text-blue-800">✔️ Return Date</th>
                  <th className="px-3 py-2 text-left text-blue-800">🔄 Current Status</th>
                  <th className="px-3 py-2 text-left text-blue-800">⚙️ Manage</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredIssues.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-2 text-center text-gray-500">No book issues found</td>
                  </tr>
                ) : (
                  filteredIssues.map((issue, index) => {
                    const daysLeft = Math.ceil((new Date(issue.DueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
   const returnDate =
  Array.isArray(issue.ReturnDate) && issue.ReturnDate[0]
    ? new Date(issue.ReturnDate[0]).toLocaleDateString()
    : issue.ReturnDate && !isNaN(new Date(issue.ReturnDate).getTime())
      ? new Date(issue.ReturnDate).toLocaleDateString()
      : 'N/A';



                    return (
                      <tr key={issue.IssueId} className="hover:bg-gray-50">
                        <td className="px-3 py-2">{index + 1}</td>
                        <td className="px-3 py-2 uppercase">{issue.BookTitle}</td>
                        <td className="px-3 py-2">{issue.StudentName}</td>
                        <td className="px-3 py-2">{issue.courseName || 'N/A'}</td>
                        <td className="px-3 py-2">
                          <div className="text-xs flex items-center gap-1">
                            <FontAwesomeIcon icon={faCalendarDays} className="text-blue-500" />
                            <span className={daysLeft < 0 ? 'text-red-600' : 'text-green-600'}>{daysLeft} days {daysLeft < 0 ? 'overdue' : 'left'}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">{new Date(issue.IssueDate).toLocaleDateString()}</td>
                        <td className="px-3 py-2">{new Date(issue.DueDate).toLocaleDateString()}</td>
                        <td className="px-3 py-2">{returnDate}</td>


                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            issue.Status === 'issued' ? 'bg-blue-100 text-blue-800' :
                            issue.Status === 'returned' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {issue.Status}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {issue.Status === 'issued' && (
                            <div className="flex gap-2">
                              <button onClick={() => openEditModal(issue)} className="text-white bg-yellow-500 p-1 rounded hover:text-yellow-800 text-xs transition duration-200">
                                <FontAwesomeIcon icon={faEdit} /> Edit
                              </button>
                              <button onClick={() => { setSelectedIssue(issue); setIsReturnModalOpen(true); }} className="text-white bg-green-500 p-1 rounded hover:text-green-800 text-xs transition duration-200">
                                <FontAwesomeIcon icon={faUndo} /> Return
                              </button>
                              <button onClick={() => { setSelectedIssue(issue); setIsRenewModalOpen(true); }} className="text-white bg-blue-500 p-1 rounded hover:text-blue-800 text-xs transition duration-200">
                                <FontAwesomeIcon icon={faRedo} /> Renew
                              </button>
                              <button onClick={() => { setSelectedIssue(issue); setIsDeleteModalOpen(true); }} className="text-red-600 hidden hover:text-red-800 text-xs transition duration-200">
                                <FontAwesomeIcon icon={faTrash} /> Delete
                              </button>
                            </div>
                          )}
                          {issue.Status === 'overdue' && (
                            <div className="flex gap-2">
                              <button onClick={() => { setSelectedIssue(issue); setIsReturnModalOpen(true); }} className="text-white bg-green-500 p-1 rounded hover:text-green-800 text-xs transition duration-200">
                                <FontAwesomeIcon icon={faUndo} /> Return
                              </button>
                              <button onClick={() => { setSelectedIssue(issue); setIsDeleteModalOpen(true); }} className="text-red-600 hidden hover:text-red-800 text-xs transition duration-200">
                                <FontAwesomeIcon icon={faTrash} /> Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
          <div ref={modalRef} className="bg-white rounded shadow w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => {
                setIsModalOpen(false);
                resetFormFields();
              }}
              className="absolute top-2 right-2 text-red-600 hover:text-red-800 transition duration-200"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
            <div className="p-4">
              <h2 className="text-lg font-bold mb-3 p-2 rounded-md bg-gradient-to-r from-blue-50 to-white text-blue-800">BOOK ISSUE FORM</h2>
              <div className="space-y-4">
                <div className="bg-gray-100 p-3 rounded">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-700">Select Publication</label>
                      <div
                        onClick={() => setShowPublicationInput(!showPublicationInput)}
                        className="w-full p-1 border rounded text-sm bg-white flex justify-between items-center"
                      >
                        <input
                          type="text"
                          placeholder="Search Publication"
                          className="w-full p-0 border-0 text-sm focus:outline-none"
                          value={publicationSearch}
                          onChange={(e) => setPublicationSearch(e.target.value)}
                          onBlur={() => setTimeout(() => setShowPublicationInput(false), 200)}
                        />
                        {publicationSearch && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPublicationSearch('');
                              setFormData(prev => ({ ...prev, PublicationId: 0 }));
                              setBooks(books); // Reset to all books
                              setSelectedBook(null);
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FontAwesomeIcon icon={faTimesCircle} size="xs" />
                          </button>
                        )}
                      </div>
                      {showPublicationInput && (
                        <div className="relative">
                          <ul className="absolute w-full bg-white border rounded mt-1 max-h-40 overflow-y-auto z-10">
                            <li className="p-1 bg-gray-100 font-medium">Select Publication</li>
                            {publications.filter(pub =>
                              pub.Name.toLowerCase().includes(publicationSearch.toLowerCase())
                            ).length === 0 ? (
                              <li className="p-1 text-gray-500 italic">No publication found</li>
                            ) : (
                              publications
                                .filter(pub =>
                                  pub.Name.toLowerCase().includes(publicationSearch.toLowerCase())
                                )
                                .map(pub => (
                                  <li
                                    key={pub.PubId}
                                    className="p-1 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => handlePublicationChange(pub.PubId)}
                                  >
                                    {pub.Name}
                                  </li>
                                ))
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-700">Select Book</label>
                      <div
                        onClick={() => setShowBookInput(!showBookInput)}
                        className="w-full p-1 border rounded text-sm bg-white flex justify-between items-center"
                      >
                        <input
                          type="text"
                          placeholder="Search Book"
                          className="w-full p-0 border-0 text-sm focus:outline-none"
                          value={bookSearch}
                          onChange={(e) => setBookSearch(e.target.value)}
                          onBlur={() => setTimeout(() => setShowBookInput(false), 200)}
                        />
                        {bookSearch && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setBookSearch('');
                              setFormData(prev => ({ ...prev, BookId: 0 }));
                              setSelectedBook(null);
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FontAwesomeIcon icon={faTimesCircle} size="xs" />
                          </button>
                        )}
                      </div>
                      {showBookInput && (
                        <div className="relative">
                          <ul className="absolute w-full bg-white border rounded mt-1 max-h-40 overflow-y-auto z-10">
                            <li className="p-1 bg-gray-100 font-medium">Select Book</li>
                            {books.filter(book =>
                              book.Title.toLowerCase().includes(bookSearch.toLowerCase())
                            ).length === 0 ? (
                              <li className="p-1 text-gray-500 italic">No book found</li>
                            ) : (
                              books
                                .filter(book =>
                                  book.Title.toLowerCase().includes(bookSearch.toLowerCase())
                                )
                                .map(book => (
                                  <li
                                    key={book.BookId}
                                    className="p-1 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => handleBookChange(book.BookId)}
                                  >
                                    {book.Title}
                                  </li>
                                ))
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedBook && (
                  <div className="bg-gray-50 p-3 rounded">
                    <h3 className="font-medium text-sm mb-2 text-gray-800">View Book Detail</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="font-medium text-gray-700">Book Name:</span> {selectedBook.Title}</div>
                          <div><span className="font-medium text-gray-700">Author:</span> {selectedBook.Author}</div>
                          <div><span className="font-medium text-gray-700">Publication:</span> {selectedBook.PublicationName}</div>
                          <div><span className="font-medium text-gray-700">Branch:</span> {selectedBook.courseName}</div>
                          <div><span className="font-medium text-gray-700">Price:</span> {selectedBook.Price}</div>
                          <div><span className="font-medium text-gray-700">Total Quantity:</span> {selectedBook.TotalCopies}</div>
                          <div><span className="font-medium text-gray-700">Available Qty:</span> {selectedBook.AvailableCopies}</div>
                          <div><span className="font-medium text-gray-700">Rent Qty:</span> {selectedBook.TotalCopies - selectedBook.AvailableCopies}</div>
                          <div className="col-span-2"><span className="font-medium text-gray-700">Detail:</span> {selectedBook.Details}</div>
                        </div>
                      </div>
                      {selectedBook.BookPhoto && (
                        <div className="flex justify-center">
                          <img src={selectedBook.BookPhoto} alt={selectedBook.Title} className="h-32 w-auto object-contain" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 p-3 rounded">
                  <h3 className="font-medium text-sm mb-2 text-gray-800">Select Student Detail</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-700">Select Course</label>
                      <select
                        className="w-full p-1 border rounded text-sm"
                        value={formData.CourseId}
                        onChange={(e) => handleCourseChange(Number(e.target.value))}
                      >
                        <option value={0}>---Select Course---</option>
                        {courses.map(course => (
                          <option key={course.id} value={course.id}>{course.courseName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-700">Select Student</label>
                      <div
                        onClick={() => setShowStudentInput(!showStudentInput)}
                        className="w-full p-1 border rounded text-sm bg-white flex justify-between items-center"
                      >
                        <input
                          type="text"
                          placeholder="Search Student"
                          className="w-full p-0 border-0 text-sm focus:outline-none"
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          onBlur={() => setTimeout(() => setShowStudentInput(false), 200)}
                        />
                        {studentSearch && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setStudentSearch('');
                              setFormData(prev => ({ ...prev, StudentId: 0 }));
                              setOverdueBooks([]);
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FontAwesomeIcon icon={faTimesCircle} size="xs" />
                          </button>
                        )}
                      </div>
                      {showStudentInput && (
                        <div className="relative">
                          <ul className="absolute w-full bg-white border rounded mt-1 max-h-40 overflow-y-auto z-10">
                            <li className="p-1 bg-gray-100 font-medium">Select Student</li>
                            {filteredStudents.filter(student =>
                              `${student.fName} ${student.lName}`.toLowerCase().includes(studentSearch.toLowerCase())
                            ).length === 0 ? (
                              <li className="p-1 text-gray-500 italic">No student found</li>
                            ) : (
                              filteredStudents
                                .filter(student =>
                                  `${student.fName} ${student.lName}`.toLowerCase().includes(studentSearch.toLowerCase())
                                )
                                .map(student => (
                                  <li
                                    key={student.id}
                                    className="p-1 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => handleStudentChange(student.id)}
                                  >
                                    {`${student.fName} ${student.lName}`}
                                  </li>
                                ))
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                  {overdueBooks.length > 0 && (
                    <div className="mt-2 p-2 bg-yellow-100 border border-yellow-400 rounded text-sm text-yellow-800">
                      <strong>Warning:</strong> This student has overdue books: {overdueBooks.map(issue => issue.BookTitle).join(', ')}
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 p-3 rounded">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-700">Days</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full p-1 border rounded text-sm"
                        value={formData.Days}
                        onChange={(e) => setFormData(prev => ({ ...prev, Days: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-700">Due Date</label>
                      <div className="p-1 border rounded bg-gray-100 text-sm">
                        {calculateDueDate(formData.Days)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs font-medium mb-1 text-gray-700">Remarks (Optional)</label>
                    <textarea
                      className="w-full p-1 border rounded text-sm"
                      rows={2}
                      value={formData.Remarks}
                      onChange={(e) => setFormData(prev => ({ ...prev, Remarks: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    resetFormFields();
                  }}
                  className="px-3 py-1 border border-gray-300 rounded text-gray-700 text-sm hover:bg-gray-100 transition duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleIssueBook}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-800 transition duration-200"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Issuing...' : 'Book Issue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && selectedIssue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
          <div className="bg-white rounded shadow w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedIssue(null);
              }}
              className="absolute top-2 right-2 text-red-600 hover:text-red-800 transition duration-200"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
            <div className="p-4">
              <h2 className="text-lg font-bold mb-3 p-2 rounded-md bg-gradient-to-r from-yellow-50 to-white text-yellow-800">EDIT BOOK ISSUE FORM</h2>
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-700">Select Publication</label>
                      <div
                        onClick={() => setShowPublicationInput(!showPublicationInput)}
                        className="w-full p-1 border rounded text-sm bg-white flex justify-between items-center"
                      >
                        <input
                          type="text"
                          placeholder="Search Publication"
                          className="w-full p-0 border-0 text-sm focus:outline-none"
                          value={publicationSearch}
                          onChange={(e) => setPublicationSearch(e.target.value)}
                          onBlur={() => setTimeout(() => setShowPublicationInput(false), 200)}
                        />
                        {publicationSearch && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPublicationSearch('');
                              setFormData(prev => ({ ...prev, PublicationId: 0 }));
                              setBooks(books); // Reset to all books
                              setSelectedBook(null);
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FontAwesomeIcon icon={faTimesCircle} size="xs" />
                          </button>
                        )}
                      </div>
                      {showPublicationInput && (
                        <div className="relative">
                          <ul className="absolute w-full bg-white border rounded mt-1 max-h-40 overflow-y-auto z-10">
                            <li className="p-1 bg-gray-100 font-medium">Select Publication</li>
                            {publications.filter(pub =>
                              pub.Name.toLowerCase().includes(publicationSearch.toLowerCase())
                            ).length === 0 ? (
                              <li className="p-1 text-gray-500 italic">No publication found</li>
                            ) : (
                              publications
                                .filter(pub =>
                                  pub.Name.toLowerCase().includes(publicationSearch.toLowerCase())
                                )
                                .map(pub => (
                                  <li
                                    key={pub.PubId}
                                    className="p-1 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => handlePublicationChange(pub.PubId)}
                                  >
                                    {pub.Name}
                                  </li>
                                ))
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-700">Select Book</label>
                      <div
                        onClick={() => setShowBookInput(!showBookInput)}
                        className="w-full p-1 border rounded text-sm bg-white flex justify-between items-center"
                      >
                        <input
                          type="text"
                          placeholder="Search Book"
                          className="w-full p-0 border-0 text-sm focus:outline-none"
                          value={bookSearch}
                          onChange={(e) => setBookSearch(e.target.value)}
                          onBlur={() => setTimeout(() => setShowBookInput(false), 200)}
                        />
                        {bookSearch && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setBookSearch('');
                              setFormData(prev => ({ ...prev, BookId: 0 }));
                              setSelectedBook(null);
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FontAwesomeIcon icon={faTimesCircle} size="xs" />
                          </button>
                        )}
                      </div>
                      {showBookInput && (
                        <div className="relative">
                          <ul className="absolute w-full bg-white border rounded mt-1 max-h-40 overflow-y-auto z-10">
                            <li className="p-1 bg-gray-100 font-medium">Select Book</li>
                            {books.filter(book =>
                              book.Title.toLowerCase().includes(bookSearch.toLowerCase())
                            ).length === 0 ? (
                              <li className="p-1 text-gray-500 italic">No book found</li>
                            ) : (
                              books
                                .filter(book =>
                                  book.Title.toLowerCase().includes(bookSearch.toLowerCase())
                                )
                                .map(book => (
                                  <li
                                    key={book.BookId}
                                    className="p-1 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => handleBookChange(book.BookId)}
                                  >
                                    {book.Title}
                                  </li>
                                ))
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedBook && (
                  <div className="bg-gray-50 p-3 rounded">
                    <h3 className="font-medium text-sm mb-2 text-gray-800">View Book Detail</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="font-medium text-gray-700">Book Name:</span> {selectedBook.Title}</div>
                          <div><span className="font-medium text-gray-700">Author:</span> {selectedBook.Author}</div>
                          <div><span className="font-medium text-gray-700">Publication:</span> {selectedBook.PublicationName}</div>
                          <div><span className="font-medium text-gray-700">Branch:</span> {selectedBook.courseName}</div>
                          <div><span className="font-medium text-gray-700">Price:</span> {selectedBook.Price}</div>
                          <div><span className="font-medium text-gray-700">Total Quantity:</span> {selectedBook.TotalCopies}</div>
                          <div><span className="font-medium text-gray-700">Available Qty:</span> {selectedBook.AvailableCopies}</div>
                          <div><span className="font-medium text-gray-700">Rent Qty:</span> {selectedBook.TotalCopies - selectedBook.AvailableCopies}</div>
                          <div className="col-span-2"><span className="font-medium text-gray-700">Detail:</span> {selectedBook.Details}</div>
                        </div>
                      </div>
                      {selectedBook.BookPhoto && (
                        <div className="flex justify-center">
                          <img src={selectedBook.BookPhoto} alt={selectedBook.Title} className="h-32 w-auto object-contain" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 p-3 rounded">
                  <h3 className="font-medium text-sm mb-2 text-gray-800">Select Student Detail</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-700">Select Course</label>
                      <select
                        className="w-full p-1 border rounded text-sm"
                        value={formData.CourseId}
                        onChange={(e) => handleCourseChange(Number(e.target.value))}
                      >
                        <option value={0}>---Select Course---</option>
                        {courses.map(course => (
                          <option key={course.id} value={course.id}>{course.courseName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-700">Select Student</label>
                      <div
                        onClick={() => setShowStudentInput(!showStudentInput)}
                        className="w-full p-1 border rounded text-sm bg-white flex justify-between items-center"
                      >
                        <input
                          type="text"
                          placeholder="Search Student"
                          className="w-full p-0 border-0 text-sm focus:outline-none"
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          onBlur={() => setTimeout(() => setShowStudentInput(false), 200)}
                        />
                        {studentSearch && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setStudentSearch('');
                              setFormData(prev => ({ ...prev, StudentId: 0 }));
                              setOverdueBooks([]);
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FontAwesomeIcon icon={faTimesCircle} size="xs" />
                          </button>
                        )}
                      </div>
                      {showStudentInput && (
                        <div className="relative">
                          <ul className="absolute w-full bg-white border rounded mt-1 max-h-40 overflow-y-auto z-10">
                            <li className="p-1 bg-gray-100 font-medium">Select Student</li>
                            {filteredStudents.filter(student =>
                              `${student.fName} ${student.lName}`.toLowerCase().includes(studentSearch.toLowerCase())
                            ).length === 0 ? (
                              <li className="p-1 text-gray-500 italic">No student found</li>
                            ) : (
                              filteredStudents
                                .filter(student =>
                                  `${student.fName} ${student.lName}`.toLowerCase().includes(studentSearch.toLowerCase())
                                )
                                .map(student => (
                                  <li
                                    key={student.id}
                                    className="p-1 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => handleStudentChange(student.id)}
                                  >
                                    {`${student.fName} ${student.lName}`}
                                  </li>
                                ))
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                  {overdueBooks.length > 0 && (
                    <div className="mt-2 p-2 bg-yellow-100 border border-yellow-400 rounded text-sm text-yellow-800">
                      <strong>Warning:</strong> This student has overdue books: {overdueBooks.map(issue => issue.BookTitle).join(', ')}
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 p-3 rounded">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-700">Days</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full p-1 border rounded text-sm"
                        value={formData.Days}
                        onChange={(e) => setFormData(prev => ({ ...prev, Days: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-700">Due Date</label>
                      <div className="p-1 border rounded bg-gray-100 text-sm">
                        {calculateDueDate(formData.Days)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="block text-xs font-medium mb-1 text-gray-700">Remarks (Optional)</label>
                    <textarea
                      className="w-full p-1 border rounded text-sm"
                      rows={2}
                      value={formData.Remarks}
                      onChange={(e) => setFormData(prev => ({ ...prev, Remarks: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedIssue(null);
                  }}
                  className="px-3 py-1 border border-gray-300 rounded text-gray-700 text-sm hover:bg-gray-100 transition duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditBook}
                  className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-800 transition duration-200"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Updating...' : 'Update Issue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

 {isReturnModalOpen && selectedIssue && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
    <div className="bg-white rounded shadow w-full max-w-xs relative">
      <button
        onClick={() => { setIsReturnModalOpen(false); setSelectedIssue(null); }}
        className="absolute top-2 right-2 text-red-600 hover:text-red-800 transition duration-200"
      >
        <FontAwesomeIcon icon={faTimes} size="lg" />
      </button>
      <div className="p-4">
        <h2 className="text-lg font-bold mb-2 text-green-800">Return Book</h2>
        <p className="mb-3 text-sm">
          Return <strong>{selectedIssue.BookTitle}</strong> issued to <strong>{selectedIssue.StudentName}</strong>?
        </p>

        {/* Remarks */}
        <div className="mb-3">
          <label className="block text-xs font-medium mb-1 text-gray-700">Remarks (Optional)</label>
          <textarea
            className="w-full p-1 border rounded text-sm"
            rows={2}
            value={returnRemarks}
            onChange={(e) => setReturnRemarks(e.target.value)}
          />
        </div>

        {/* Fine Field for Overdue */}
        {new Date() > new Date(selectedIssue.DueDate) && (
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1 text-gray-700">Fine Amount</label>
            <input
              type="number"
              className="w-full p-1 border rounded text-sm"
              value={fineAmount}
              onChange={(e) => setFineAmount(Number(e.target.value))}
              placeholder="Enter fine amount"
              min={0}
            />
            {fineAmount <= 1 && (
              <p className="text-xs text-red-600 mt-1">Fine must be greater than 1 to return overdue book</p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={() => { setIsReturnModalOpen(false); setSelectedIssue(null); }}
            className="px-3 py-1 border border-gray-300 rounded text-gray-700 text-sm hover:bg-gray-100 transition duration-200"
          >
            Cancel
          </button>

          {/* ✅ Conditionally show "Return" button */}
          {!(new Date() > new Date(selectedIssue.DueDate)) || fineAmount > 1 ? (
            <button
              onClick={handleReturnBook}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-800 transition duration-200"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Returning...' : 'Return'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  </div>
)}


      {isRenewModalOpen && selectedIssue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
          <div className="bg-white rounded shadow w-full max-w-xs relative">
            <button
              onClick={() => { setIsRenewModalOpen(false); setSelectedIssue(null); }}
              className="absolute top-2 right-2 text-red-600 hover:text-red-800 transition duration-200"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
            <div className="p-4">
              <h2 className="text-lg font-bold mb-2 text-blue-800">Renew Book</h2>
              <p className="mb-3 text-sm">Renew <strong>{selectedIssue.BookTitle}</strong> for <strong>{selectedIssue.StudentName}</strong></p>
              <div className="mb-2">
                <label className="block text-xs font-medium mb-1 text-gray-700">Current Due Date</label>
                <div className="p-1 border rounded bg-gray-100 text-sm mb-2">
                  {new Date(selectedIssue.DueDate).toLocaleDateString()}
                </div>
                <label className="block text-xs font-medium mb-1 text-gray-700">Additional Days</label>
                <input
                  type="number"
                  min="1"
                  className="w-full p-1 border rounded text-sm"
                  value={renewDays}
                  onChange={(e) => setRenewDays(Number(e.target.value))}
                />
                <label className="block text-xs font-medium mb-1 mt-2 text-gray-700">New Due Date</label>
                <div className="p-1 border rounded bg-gray-100 text-sm">
                  {calculateDueDate(renewDays)}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setIsRenewModalOpen(false); setSelectedIssue(null); }}
                  className="px-3 py-1 border border-gray-300 rounded text-gray-700 text-sm hover:bg-gray-100 transition duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRenewBook}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-800 transition duration-200"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Renewing...' : 'Renew'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && selectedIssue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
          <div className="bg-white rounded shadow w-full max-w-xs relative">
            <button
              onClick={() => { setIsDeleteModalOpen(false); setSelectedIssue(null); }}
              className="absolute top-2 right-2 text-red-600 hover:text-red-800 transition duration-200"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
            <div className="p-4">
              <h2 className="text-lg font-bold mb-2 text-red-800">Delete Book Issue</h2>
              <p className="mb-3 text-sm">
                Are you sure you want to delete the issue of <strong>{selectedIssue.BookTitle}</strong> for <strong>{selectedIssue.StudentName}</strong>?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setIsDeleteModalOpen(false); setSelectedIssue(null); }}
                  className="px-3 py-1 border border-gray-300 rounded text-gray-700 text-sm hover:bg-gray-100 transition duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteBook}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-800 transition duration-200"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookIssuePage;