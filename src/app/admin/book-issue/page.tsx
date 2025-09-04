'use client';
import { useUser } from '@/app/hooks/useUser';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner, faPlus, faSearch, faEdit, faTrash,
  faCalendarDays, faTimes, faTimesCircle, faFileExcel,
  faUndo, faRedo, faRotateLeft, faSync,
} from '@fortawesome/free-solid-svg-icons';
import { Book, BookIssue, Student, Publication, Course } from '@/types';
import * as XLSX from 'xlsx';

const BookIssuePage = () => {
  const [bookIssues, setBookIssues] = useState<BookIssue[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'issued' | 'returned' | 'overdue'>('issued');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [courseNameFilter, setCourseNameFilter] = useState('');
  const [courseYearFilter, setCourseYearFilter] = useState<string>('all');
  const [formCourseYearFilter, setFormCourseYearFilter] = useState<string>('all');
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const modalRef = useRef<HTMLDivElement>(null);
  const user = useUser();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateRange, courseNameFilter, courseYearFilter]);

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

      const uniqueStudents = studentsRes.data.filter((student: { id: any }, index: number, self: any[]) =>
        index === self.findIndex((s: { id: any }) => s.id === student.id)
      );

      setBookIssues(issuesRes.data);
      setBooks(booksRes.data);
      setAllBooks(booksRes.data);
      setStudents(uniqueStudents);
      setFilteredStudents(uniqueStudents);
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
  const courseYears = ['all', '1st', '2nd', '3rd', '4th'];

  const handlePublicationChange = (pubId: number) => {
    setFormData(prev => ({ ...prev, PublicationId: pubId, BookId: 0 }));
    setPublicationSearch(publications.find(p => p.PubId === pubId)?.Name || '');
    setShowPublicationInput(false);
    setSelectedBook(null);
    setBookSearch('');

    const filteredBooks = pubId ? allBooks.filter(b => b.PublicationId === pubId) : allBooks;
    setBooks(filteredBooks);
  };

  const handleBookChange = (bookId: number) => {
    const book = books.find(b => b.BookId === bookId);
    setSelectedBook(book || null);
    setFormData(prev => ({ ...prev, BookId: bookId }));
    setBookSearch(book?.Title || '');
    setShowBookInput(false);
  };

  const handleCourseChange = (courseId: number, isEdit: boolean = false) => {
    setFormData(prev => ({ ...prev, CourseId: courseId, StudentId: 0 }));
    const filtered = courseId
      ? students.filter(s => s.courseId === courseId && (formCourseYearFilter === 'all' || s.courseYear === formCourseYearFilter))
      : students.filter(s => formCourseYearFilter === 'all' || s.courseYear === formCourseYearFilter);
    setFilteredStudents(filtered);
    setStudentSearch('');
    if (!isEdit) {
      setFormCourseYearFilter('all');
    }
  };

  const handleCourseYearChange = (year: string, isEdit: boolean = false) => {
    setFormCourseYearFilter(year);
    const filtered = formData.CourseId
      ? students.filter(s => s.courseId === formData.CourseId && (year === 'all' || s.courseYear === year))
      : students.filter(s => year === 'all' || s.courseYear === year);
    setFilteredStudents(filtered);
    setFormData(prev => ({ ...prev, StudentId: 0 }));
    setStudentSearch('');
  };

  const handleStudentChange = async (studentId: number) => {
    const student = filteredStudents.find(s => s.id === studentId);
    if (!student) return;

    const overdue = bookIssues.filter(
      issue =>
        issue.StudentId === student.StudentAcademicDetailsId &&
        issue.Status === 'issued' &&
        new Date(issue.DueDate) < new Date()
    );
    setOverdueBooks(overdue);

    setFormData(prev => ({
      ...prev,
      StudentId: student.StudentAcademicDetailsId,
      CourseId: student.courseId || 0
    }));
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
        ModifiedBy: user?.name || 'system',
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
    const book = allBooks.find(b => b.BookId === issue.BookId);
    const student = students.find(s => s.StudentAcademicDetailsId === issue.StudentId);
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
    setFormCourseYearFilter(issue.courseYear || 'all');
    setFilteredStudents(
      student?.courseId
        ? students.filter(s => s.courseId === student.courseId && (issue.courseYear === 'all' || s.courseYear === issue.courseYear))
        : students
    );
    setBooks(book?.PublicationId ? allBooks.filter(b => b.PublicationId === book.PublicationId) : allBooks);
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
    const matchesCourseYear = courseYearFilter === 'all' || issue.courseYear === courseYearFilter;

    return matchesSearch && matchesStatus && matchesDate && matchesCourseName && matchesCourseYear;
  });

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentIssues = filteredIssues.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredIssues.length / itemsPerPage);

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
    setBooks(allBooks);
    setFormCourseYearFilter('all');
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
    <div className="container mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-2 gap-2 bg-gradient-to-r from-blue-50 to-white p-2 rounded-md">
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
      <div className="bg-white rounded shadow px-3 py-2 mb-4 w-full">
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 w-full">
          <div className="text-sm font-medium text-blue-600 whitespace-nowrap">
            Total Book Issues: {bookIssues.length}
          </div>

          {/* Search */}
          <div className="relative flex items-center">
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search by book, student"
              className="pl-7 pr-2 py-1 border rounded-sm text-sm w-[180px] lg:w-[200px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status */}
          <select
            className="px-2 py-1 border rounded-sm text-sm min-w-[100px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All Status</option>
            <option value="issued">Issued</option>
            <option value="returned">Returned</option>
            <option value="overdue">Overdue</option>
          </select>

          {/* Date Pickers */}
          <input
            type="date"
            className="px-2 py-1 border rounded-sm text-sm min-w-[140px]"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            title="From Date"
          />
          <input
            type="date"
            className="px-2 py-1 border rounded-sm text-sm min-w-[140px]"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            title="To Date"
          />

          {/* Courses */}
          <select
            className="px-2 py-1 border rounded-sm text-sm min-w-[130px]"
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

          {/* Year */}
          <select
            className="px-2 py-1 border rounded-sm text-sm min-w-[110px]"
            value={courseYearFilter}
            onChange={(e) => setCourseYearFilter(e.target.value)}
          >
            {courseYears.map((year) => (
              <option key={year} value={year}>
                {year === 'all' ? 'All Years' : year}
              </option>
            ))}
          </select>

          {/* Reset Button */}
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setDateRange({ start: '', end: '' });
              setCourseNameFilter('');
              setCourseYearFilter('all');
            }}
            className="px-3 py-1 text-sm text-gray-700 bg-red-100 hover:bg-red-200 rounded-sm border border-red-300 transition whitespace-nowrap"
          >
            <FontAwesomeIcon icon={faRotateLeft} size="xs" /> Reset Filters
          </button>

 

          {/* Rows per page */}
          <div>
            {/* <label className="text-sm mr-2">Rows per page:</label> */}
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 w-32 text-center py-1 border rounded-sm text-sm"
              title='Rows per page'
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={75}>75</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center h-[85vh] items-center p-4">
            <FontAwesomeIcon icon={faSpinner} spin size="lg" className="w-10 h-10 text-blue-600" />
          </div>
        ) : (
         <div className="overflow-x-auto bg-white rounded-lg shadow-md">
  <table className="table-auto min-w-[1000px] w-full text-xs text-left">
    <thead className="bg-blue-50 text-blue-800">
      <tr>
        <th className="px-2 py-2">#</th>
        <th className="px-2 py-2">📖 Book Name</th>
        <th className="px-2 py-2">👨‍🎓 Student Name </th>
        <th className="px-2 py-2">👨 Father Name</th>
        <th className="px-2 py-2">🎓 Course Name</th>
        <th className="px-2 py-2">Course Year</th>
        <th className="px-2 py-2">Session</th>
        <th className="px-2 py-2">⏳ Days Left</th>
        <th className="px-2 py-2">📅 Issued On</th>
        <th className="px-2 py-2">📌 Due On</th>
        <th className="px-2 py-2">✔️ Return Date</th>
        <th className="px-2 py-2 text-center">🔄 Status</th>
        <th className="px-2 py-2 text-center">⚙️</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-200">
      {currentIssues.length === 0 ? (
        <tr>
          <td colSpan={13} className="text-center text-gray-500 py-4">No book issues found</td>
        </tr>
      ) : (
        currentIssues.map((issue, index) => {
          const dueDate = new Date(issue.DueDate).getTime();
          const issueDate = new Date(issue.IssueDate).getTime();
          const now = new Date().getTime();

          const returnDate =
            Array.isArray(issue.ReturnDate) && issue.ReturnDate[0]
              ? new Date(issue.ReturnDate[0]).toLocaleDateString()
              : issue.ReturnDate && !isNaN(new Date(issue.ReturnDate).getTime())
                ? new Date(issue.ReturnDate).toLocaleDateString()
                : 'N/A';

          // 🔥 Updated Days Left Logic
          let daysCalculation, daysText, textColor;
          
          if (issue.Status === 'returned' && returnDate !== 'N/A') {
            // If book is returned, calculate days kept (return date - issue date)
            const returnDateMs = Array.isArray(issue.ReturnDate) && issue.ReturnDate[0]
              ? new Date(issue.ReturnDate[0]).getTime()
              : new Date(issue.ReturnDate).getTime();
            
            const daysKept = Math.ceil((returnDateMs - issueDate) / (1000 * 60 * 60 * 24));
            daysCalculation = daysKept;
            daysText = `${daysKept} days kept`;
            textColor = 'text-blue-600'; // Blue for returned books
          } else {
            // If book is NOT returned, calculate days left until due date
            const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
            daysCalculation = Math.abs(daysLeft);
            daysText = `${Math.abs(daysLeft)} days ${daysLeft < 0 ? 'overdue' : 'left'}`;
            textColor = daysLeft < 0 ? 'text-red-600' : 'text-green-600';
          }

          return (
            <tr key={issue.IssueId} className="hover:bg-gray-50 whitespace-nowrap">
              <td className="px-2 py-2">{(currentPage - 1) * itemsPerPage + index + 1}</td>
              <td className="px-2 py-2 font-semibold text-gray-700 uppercase">{issue.BookTitle}</td>
              <td className="px-2 py-2">{issue.StudentName}</td>
              <td className="px-2 py-2">{issue.fatherName}</td>
              <td className="px-2 py-2">{issue.courseName || 'N/A'}</td>
              <td className="px-2 py-2">{issue.courseYear || 'N/A'}</td>
              <td className="px-2 py-2">{issue.sessionYear || 'N/A'}</td>
              
              {/* 🔥 Updated Days Left Display */}
              <td className="px-2 py-2">
                <div className={`text-xs font-medium ${textColor}`}>
                  {daysText}
                </div>
              </td>
              
              <td className="px-2 py-2">{new Date(issue.IssueDate).toLocaleDateString()}</td>
              <td className="px-2 py-2">{new Date(issue.DueDate).toLocaleDateString()}</td>
              <td className="px-2 py-2">{returnDate}</td>
              <td className="px-2 py-2 text-center">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  issue.Status === 'issued' ? 'bg-blue-100 text-blue-700' :
                  issue.Status === 'returned' ? 'bg-green-100 text-green-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {issue.Status}
                </span>
              </td>
              <td className="px-2 py-2 text-center">
                {issue.Status === 'issued' && (
                  <div className="flex gap-1 flex-wrap justify-center">
                    <button onClick={() => openEditModal(issue)} className="bg-yellow-400 hover:bg-yellow-500 text-white px-2 py-1 rounded text-xs">
                      Edit
                    </button>
                    <button onClick={() => { setSelectedIssue(issue); setIsReturnModalOpen(true); }} className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs">
                      Return
                    </button>
                    <button onClick={() => { setSelectedIssue(issue); setIsRenewModalOpen(true); }} className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs">
                      Renew
                    </button>
                  </div>
                )}
                {issue.Status === 'overdue' && (
                  <div className="flex gap-1 justify-center">
                    <button onClick={() => { setSelectedIssue(issue); setIsReturnModalOpen(true); }} className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs">
                      Return
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

      {/* Pagination */}
      {filteredIssues.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center p-2 bg-white border-t border-gray-200">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 text-sm rounded ${page === currentPage ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

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
              <h2 className="text-lg font-bold mb-3 p-2 rounded-md bg-gradient-to-r from-blue-50 to-white text-black">BOOK ISSUE FORM</h2>
              <div className="space-y-4">
                <div className="bg-gray-100 p-3 rounded">
                  <h3 className="font-medium text-xl mb-2 text-blue-800">Select Book Detail</h3>
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
                              setBooks(allBooks);
                              setSelectedBook(null);
                              setBookSearch('');
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
                    <h3 className="font-medium text-xl mb-2 text-blue-800">View Book Detail</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="font-medium text-gray-700">Book Name:</span> {selectedBook.Title}</div>
                          <div><span className="font-medium text-gray-700">Author:</span> {selectedBook.Author}</div>
                          <div><span className="font-medium text-gray-700">Publication:</span> {selectedBook.PublicationName}</div>
                          <div><span className="font-medium text-gray-700">Branch:</span> {selectedBook.courseName}</div>
                          <div><span className="font-medium text-gray-700">Price:</span> {selectedBook.Price}</div>
                          <div><span className="font-bold text-gray-700">Total Quantity:</span> {selectedBook.TotalCopies}</div>
                          <div><span className="font-medium text-red-700">Available Qty:</span> {selectedBook.AvailableCopies}</div>
                          <div><span className="font-medium text-green-700">Rent Qty:</span> {selectedBook.TotalCopies - selectedBook.AvailableCopies}</div>
                          <div><span className="font-medium text-gray-700">Accession Number:</span> {selectedBook.AccessionNumber}</div>
                          <div><span className="font-medium text-gray-700">Source:</span> {selectedBook.Source}</div>
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
                  <h3 className="font-medium text-xl mb-2 text-green-800">Select Student Detail</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                      <label className="block text-xs font-medium mb-1 text-gray-700">Course Year</label>
                      <select
                        className="w-full p-1 border rounded text-sm"
                        value={formCourseYearFilter}
                        onChange={(e) => handleCourseYearChange(e.target.value)}
                      >
                        {courseYears.map(year => (
                          <option key={year} value={year}>{year === 'all' ? 'All Years' : year}</option>
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
                              setBooks(allBooks);
                              setSelectedBook(null);
                              setBookSearch('');
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
                    <h3 className="font-medium text-xl mb-2 text-blue-800">View Book Detail</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="font-medium text-gray-700">Book Name:</span> {selectedBook.Title}</div>
                          <div><span className="font-medium text-gray-700">Author:</span> {selectedBook.Author}</div>
                          <div><span className="font-medium text-gray-700">Publication:</span> {selectedBook.PublicationName}</div>
                          <div><span className="font-medium text-gray-700">Branch:</span> {selectedBook.courseName}</div>
                          <div><span className="font-medium text-gray-700">Price:</span> {selectedBook.Price}</div>
                          <div><span className="font-bold text-gray-700">Total Quantity:</span> {selectedBook.TotalCopies}</div>
                          <div><span className="font-medium text-red-700">Available Qty:</span> {selectedBook.AvailableCopies}</div>
                          <div><span className="font-medium text-green-700">Rent Qty:</span> {selectedBook.TotalCopies - selectedBook.AvailableCopies}</div>
                          <div><span className="font-medium text-gray-700">Accession Number:</span> {selectedBook.AccessionNumber}</div>
                          <div><span className="font-medium text-gray-700">Source:</span> {selectedBook.Source}</div>
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
                  <h3 className="font-medium text-xl mb-2 text-green-800">Select Student Detail</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-700">Select Course</label>
                      <select
                        className="w-full p-1 border rounded text-sm"
                        value={formData.CourseId}
                        onChange={(e) => handleCourseChange(Number(e.target.value), true)}
                      >
                        <option value={0}>---Select Course---</option>
                        {courses.map(course => (
                          <option key={course.id} value={course.id}>{course.courseName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-700">Course Year</label>
                      <select
                        className="w-full p-1 border rounded text-sm"
                        value={formCourseYearFilter}
                        onChange={(e) => handleCourseYearChange(e.target.value, true)}
                      >
                        {courseYears.map(year => (
                          <option key={year} value={year}>{year === 'all' ? 'All Years' : year}</option>
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
              <div className="mb-3">
                <label className="block text-xs font-medium mb-1 text-gray-700">Remarks (Optional)</label>
                <textarea
                  className="w-full p-1 border rounded text-sm"
                  rows={2}
                  value={returnRemarks}
                  onChange={(e) => setReturnRemarks(e.target.value)}
                />
              </div>
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