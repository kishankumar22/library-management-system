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
  faBook,
  faBookOpen,
  faCalendar,
  faCalendarCheck,
  faCheckCircle,
  faClock,
  faExclamationCircle,
  faGraduationCap,
  faRotateRight,
  faUser,
  faUserTie,
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
{/* Compact Header - Book Issues */}
<div className="bg-white rounded-lg shadow-sm p-3 mb-2 border border-gray-200">
  <div className="flex flex-wrap items-center gap-2">
    {/* Search */}
    <div className="relative flex-1 min-w-[200px]">
      <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
      <input
        type="text"
        placeholder="Search by book, student..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg w-full focus:outline-none focus:border-blue-500"
      />
    </div>

    {/* Status Filter */}
    <select
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value as any)}
      className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
    >
      <option value="all">All Status</option>
      <option value="issued">Issued</option>
      <option value="returned">Returned</option>
      <option value="overdue">Overdue</option>
    </select>

    {/* Date Range */}
    <input
      type="date"
      value={dateRange.start}
      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
      className="px-2 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 w-32"
      title="From Date"
    />
    <input
      type="date"
      value={dateRange.end}
      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
      className="px-2 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 w-32"
      title="To Date"
    />

    {/* Course */}
    <select
      value={courseNameFilter}
      onChange={(e) => setCourseNameFilter(e.target.value)}
      className="px-2 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 min-w-[100px]"
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
      value={courseYearFilter}
      onChange={(e) => setCourseYearFilter(e.target.value)}
      className="px-2 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
    >
      {courseYears.map((year) => (
        <option key={year} value={year}>
          {year === 'all' ? 'All Years' : year}
        </option>
      ))}
    </select>

    {/* Items Per Page */}
    <select
      value={itemsPerPage}
      onChange={(e) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1);
      }}
      className="px-2 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
      title="Rows per page"
    >
      <option value={25}>25/page</option>
      <option value={50}>50/page</option>
      <option value={75}>75/page</option>
      <option value={100}>100/page</option>
    </select>

    {/* Clear Filter */}
    <button
      onClick={() => {
        setSearchTerm('');
        setStatusFilter('all');
        setDateRange({ start: '', end: '' });
        setCourseNameFilter('');
        setCourseYearFilter('all');
      }}
      className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 text-xs font-medium rounded-lg transition-all"
      title="Clear Filters"
    >
      <FontAwesomeIcon icon={faRotateLeft} />
    </button>

    {/* Issue New Book */}
    <button
      onClick={() => {
        resetFormFields();
        setIsModalOpen(true);
      }}
      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap ml-auto"
    >
      <FontAwesomeIcon icon={faPlus} className="mr-1" />
      Issue Book
    </button>

    {/* Export to Excel */}
    <button
      onClick={exportToExcel}
      className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap"
    >
      <FontAwesomeIcon icon={faFileExcel} className="mr-1" />
      Export
    </button>

    {/* Count Info */}
    <span className="text-xs text-gray-600 font-medium">
      Total: <span className="font-bold text-blue-600">{bookIssues.length}</span>
    </span>
  </div>
</div>


      <div className="bg-white rounded shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center h-[85vh] items-center p-4">
            <FontAwesomeIcon icon={faSpinner} spin size="lg" className="w-10 h-10 text-blue-600" />
          </div>
        ) : (
<div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-md min-h-[72vh]">
  <table className="min-w-full text-xs">
    <thead className="bg-blue-600 text-white sticky top-0">
      <tr>
        <th className="px-3 py-2 text-left font-bold">#</th>
        <th className="px-3 py-2 text-left font-bold">
          <FontAwesomeIcon icon={faBook} className="mr-1" />
          Book Name
        </th>
        <th className="px-3 py-2 text-left font-bold">
          <FontAwesomeIcon icon={faUser} className="mr-1" />
          Student
        </th>
        <th className="px-3 py-2 text-left font-bold">
          <FontAwesomeIcon icon={faUserTie} className="mr-1" />
          Father
        </th>
        <th className="px-3 py-2 text-left font-bold">
          <FontAwesomeIcon icon={faGraduationCap} className="mr-1" />
          Course
        </th>
        <th className="px-3 py-2 text-center font-bold">Year</th>
        <th className="px-3 py-2 text-center font-bold">Session</th>
        <th className="px-3 py-2 text-center font-bold">
          <FontAwesomeIcon icon={faClock} className="mr-1" />
          Days
        </th>
        <th className="px-3 py-2 text-left font-bold">
          <FontAwesomeIcon icon={faCalendar} className="mr-1" />
          Issued
        </th>
        <th className="px-3 py-2 text-left font-bold">
          <FontAwesomeIcon icon={faCalendarCheck} className="mr-1" />
          Due
        </th>
        <th className="px-3 py-2 text-left font-bold">
          <FontAwesomeIcon icon={faCalendarCheck} className="mr-1" />
          Returned
        </th>
        <th className="px-3 py-2 text-center font-bold">Status</th>
        <th className="px-3 py-2 text-center font-bold">Actions</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-100">
      {currentIssues.length === 0 ? (
        <tr>
          <td colSpan={13} className="px-6 py-12 text-center">
            <FontAwesomeIcon icon={faBook} className="text-5xl mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No book issues found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
          </td>
        </tr>
      ) : (
        currentIssues.map((issue, index) => {
          const dueDate = new Date(issue.DueDate).getTime();
          const issueDate = new Date(issue.IssueDate).getTime();
          const now = new Date().getTime();

          const returnDate =
            Array.isArray(issue.ReturnDate) && issue.ReturnDate[0]
              ? new Date(issue.ReturnDate[0]).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })
              : issue.ReturnDate && !isNaN(new Date(issue.ReturnDate).getTime())
                ? new Date(issue.ReturnDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })
                : '—';

          // Days calculation
          let daysCalculation, daysText, textColor, bgColor;
          
          if (issue.Status === 'returned' && returnDate !== '—') {
            const returnDateMs = Array.isArray(issue.ReturnDate) && issue.ReturnDate[0]
              ? new Date(issue.ReturnDate[0]).getTime()
              : new Date(issue.ReturnDate).getTime();
            
            const daysKept = Math.ceil((returnDateMs - issueDate) / (1000 * 60 * 60 * 24));
            daysCalculation = daysKept;
            daysText = `${daysKept} kept`;
            textColor = 'text-blue-700';
            bgColor = 'bg-blue-100';
          } else {
            const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
            daysCalculation = Math.abs(daysLeft);
            if (daysLeft < 0) {
              daysText = `${Math.abs(daysLeft)} overdue`;
              textColor = 'text-white';
              bgColor = 'bg-red-500';
            } else {
              daysText = `${daysLeft} left`;
              textColor = 'text-white';
              bgColor = 'bg-green-500';
            }
          }

          return (
            <tr key={issue.IssueId} className="hover:bg-blue-50 transition-colors">
              <td className="px-3 py-2 font-medium text-gray-700">
                {(currentPage - 1) * itemsPerPage + index + 1}
              </td>
              <td className="px-3 py-2 font-bold text-gray-900 uppercase max-w-xs truncate" title={issue.BookTitle}>
                <FontAwesomeIcon icon={faBook} className="text-blue-600 mr-1" />
                {issue.BookTitle}
              </td>
              <td className="px-3 py-2 text-gray-700 font-medium">
                {issue.StudentName}
              </td>
              <td className="px-3 py-2 text-gray-700">
                {issue.fatherName}
              </td>
              <td className="px-3 py-2 text-gray-700">
                {issue.courseName || <span className="text-gray-400 italic">—</span>}
              </td>
              <td className="px-3 py-2 text-center text-gray-700">
                {issue.courseYear || <span className="text-gray-400 italic">—</span>}
              </td>
              <td className="px-3 py-2 text-center text-gray-700">
                {issue.sessionYear || <span className="text-gray-400 italic">—</span>}
              </td>
              
              {/* Days Left/Kept */}
              <td className="px-3 py-2">
                <div className="flex justify-center">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-bold text-[10px] ${bgColor} ${textColor}`}>
                    <FontAwesomeIcon icon={faClock} />
                    {daysText}
                  </span>
                </div>
              </td>
              
              <td className="px-3 py-2 text-gray-600">
                <FontAwesomeIcon icon={faCalendar} className="text-blue-600 mr-1" />
                {new Date(issue.IssueDate).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </td>
              <td className="px-3 py-2 text-gray-600">
                <FontAwesomeIcon icon={faCalendarCheck} className="text-orange-600 mr-1" />
                {new Date(issue.DueDate).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </td>
              <td className="px-3 py-2 text-gray-600">
                {returnDate !== '—' && (
                  <FontAwesomeIcon icon={faCalendarCheck} className="text-green-600 mr-1" />
                )}
                {returnDate}
              </td>
              
              {/* Status Badge */}
              <td className="px-3 py-2 text-center">
                {issue.Status === 'issued' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-500 text-white font-bold text-[10px]">
                    <FontAwesomeIcon icon={faBookOpen} />
                    Issued
                  </span>
                )}
                {issue.Status === 'returned' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-500 text-white font-bold text-[10px]">
                    <FontAwesomeIcon icon={faCheckCircle} />
                    Returned
                  </span>
                )}
                {issue.Status === 'overdue' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-500 text-white font-bold text-[10px]">
                    <FontAwesomeIcon icon={faExclamationCircle} />
                    Overdue
                  </span>
                )}
              </td>
              
              {/* Action Buttons */}
              <td className="px-3 py-2">
                <div className="flex gap-1 justify-center flex-wrap">
                  {issue.Status === 'issued' && (
                    <>
                      <button 
                        onClick={() => openEditModal(issue)} 
                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded-lg text-xs font-medium transition-all"
                        title="Edit Issue"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button 
                        onClick={() => { setSelectedIssue(issue); setIsReturnModalOpen(true); }} 
                        className="bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded-lg text-xs font-medium transition-all"
                        title="Return Book"
                      >
                        <FontAwesomeIcon icon={faCheckCircle} />
                      </button>
                      <button 
                        onClick={() => { setSelectedIssue(issue); setIsRenewModalOpen(true); }} 
                        className="bg-orange-100 hover:bg-orange-200 text-orange-700 px-2 py-1 rounded-lg text-xs font-medium transition-all"
                        title="Renew Issue"
                      >
                        <FontAwesomeIcon icon={faRotateRight} />
                      </button>
                    </>
                  )}
                  {issue.Status === 'overdue' && (
                    <button 
                      onClick={() => { setSelectedIssue(issue); setIsReturnModalOpen(true); }} 
                      className="bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded-lg text-xs font-medium transition-all"
                      title="Return Book"
                    >
                      <FontAwesomeIcon icon={faCheckCircle} />
                    </button>
                  )}
                  {issue.Status === 'returned' && (
                    <span className="text-gray-400 text-xs italic">No actions</span>
                  )}
                </div>
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