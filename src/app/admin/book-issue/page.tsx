'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner, faPlus, faBook, faUserGraduate, faCalendarAlt, faSearch, faEdit, faTrash,
  faCalendarDays, faTimes, faTimesCircle
} from '@fortawesome/free-solid-svg-icons';
import { Book, BookIssue, Student, Publication, Course } from '@/types';

const BookIssuePage = () => {
    const [bookIssues, setBookIssues] = useState<BookIssue[]>([]);
    const [books, setBooks] = useState<Book[]>([]);
    const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
    const [publications, setPublications] = useState<Publication[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState<BookIssue | null>(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        BookId: 0,
        StudentId: 0,
        Days: 7,
        Remarks: '',
        PublicationId: 0,
        CourseId: 0
    });
    const [editFormData, setEditFormData] = useState({
        IssueId: 0,
        BookId: 0,
        StudentId: 0,
        Days: 7,
        Remarks: '',
        PublicationId: 0,
        CourseId: 0
    });
    const [selectedBook, setSelectedBook] = useState<Book | null>(null);
    const [renewDays, setRenewDays] = useState(7);
    const [returnRemarks, setReturnRemarks] = useState('');
    const [fineAmount, setFineAmount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'issued' | 'returned' | 'overdue'>('all');
    const [dateRange, setDateRange] = useState({
        start: '',
        end: ''
    });
    const [pubSearch, setPubSearch] = useState('');
    const [bookSearch, setBookSearch] = useState('');
    const [studentSearch, setStudentSearch] = useState('');
    const [courseSearch, setCourseSearch] = useState('');
    const [showPubInput, setShowPubInput] = useState(false);
    const [showBookInput, setShowBookInput] = useState(false);
    const [showStudentInput, setShowStudentInput] = useState(false);
    const [showCourseInput, setShowCourseInput] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [issuesRes, booksRes, studentsRes, publicationsRes, coursesRes] = await Promise.all([
                axios.get('/api/book-issue'),
                axios.get('/api/book?availableCopies=1'),
                axios.get('/api/student'),
                axios.get('/api/publication'),
                axios.get('/api/course')
            ]);

            const uniqueStudents = studentsRes.data.reduce((acc: Student[], current: Student) => {
                const x = acc.find(item => item.id === current.id);
                if (!x) {
                    return acc.concat([current]);
                }
                return acc;
            }, []);

            setBookIssues(issuesRes.data);
            setBooks(booksRes.data);
            setFilteredBooks(booksRes.data);
            setStudents(uniqueStudents);
            setFilteredStudents(uniqueStudents);
            setPublications(publicationsRes.data);
            setCourses(coursesRes.data);
        } catch (error: any) {
            console.error('Error fetching data:', error);
            toast.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredPublications = publications.filter(pub =>
        pub.Name && pub.Name.toLowerCase().includes(pubSearch.toLowerCase())
    );

    const handlePublicationChange = (pubId: number, isEdit: boolean = false) => {
        if (pubId === 0) {
            setFilteredBooks(books.filter(book => 
                book.Title && book.Title.toLowerCase().includes(bookSearch.toLowerCase())
            ));
        } else {
            const filtered = books.filter(book => 
                book.PublicationId === pubId && 
                book.Title && book.Title.toLowerCase().includes(bookSearch.toLowerCase())
            );
            setFilteredBooks(filtered);
        }
        if (isEdit) {
            setEditFormData({ ...editFormData, BookId: 0, PublicationId: pubId });
        } else {
            setFormData({ ...formData, BookId: 0, PublicationId: pubId });
        }
        setSelectedBook(null);
    };

    const handleBookChange = (bookId: number, isEdit: boolean = false) => {
        const book = filteredBooks.find(b => b.BookId === bookId);
        setSelectedBook(book || null);
        if (isEdit) {
            setEditFormData({ ...editFormData, BookId: bookId });
        } else {
            setFormData({ ...formData, BookId: bookId });
        }
    };

    const filteredCourses = courses.filter(course =>
        course.courseName && typeof course.courseName === 'string' && course.courseName.toLowerCase().includes(courseSearch.toLowerCase())
    );

    const handleCourseChange = (courseId: number, isEdit: boolean = false) => {
        if (courseId === 0) {
            setFilteredStudents(students.filter(student =>
                student.fName && student.lName && student.mobileNumber && 
                `${student.fName} ${student.lName} ${student.mobileNumber}`.toLowerCase().includes(studentSearch.toLowerCase())
            ));
        } else {
            const filtered = students.filter(student =>
                student.courseId === courseId &&
                student.fName && student.lName && student.mobileNumber && 
                `${student.fName} ${student.lName} ${student.mobileNumber}`.toLowerCase().includes(studentSearch.toLowerCase())
            );
            setFilteredStudents(filtered);
        }
        if (isEdit) {
            setEditFormData({ ...editFormData, StudentId: 0, CourseId: courseId });
        } else {
            setFormData({ ...formData, StudentId: 0, CourseId: courseId });
        }
    };

    const handleStudentChange = (studentId: number, isEdit: boolean = false) => {
        const student = filteredStudents.find(s => s.id === studentId);
        if (isEdit) {
            setEditFormData({ ...editFormData, StudentId: studentId, CourseId: student?.courseId || 0 });
        } else {
            setFormData({ ...formData, StudentId: studentId, CourseId: student?.courseId || 0 });
        }
    };

    const calculateDueDate = (days: number) => {
        const today = new Date();
        const dueDate = new Date(today);
        dueDate.setDate(today.getDate() + days);
        return dueDate.toISOString().split('T')[0];
    };

    const handleIssueBook = async () => {
        if (!formData.BookId || !formData.StudentId || !formData.Days) {
            toast.error('Please fill all required fields');
            return;
        }
        try {
            const response = await axios.post('/api/book-issue', formData);
            toast.success('Book issued successfully');
            setIsModalOpen(false);
            setFormData({ BookId: 0, StudentId: 0, Days: 7, Remarks: '', PublicationId: 0, CourseId: 0 });
            setSelectedBook(null);
            setPubSearch('');
            setBookSearch('');
            setCourseSearch('');
            setStudentSearch('');
            setShowPubInput(false);
            setShowBookInput(false);
            setShowStudentInput(false);
            setShowCourseInput(false);
            await fetchData();
        } catch (error: any) {
            console.error('Error issuing book:', error);
            toast.error('Failed to issue book');
        }
    };

    const handleEditBook = async () => {
        if (!editFormData.BookId || !editFormData.StudentId || !editFormData.Days) {
            toast.error('Please fill all required fields');
            return;
        }
        try {
            await axios.patch(`/api/book-issue?id=${editFormData.IssueId}`, editFormData);
            toast.success('Book issue updated successfully');
            setIsEditModalOpen(false);
            setEditFormData({ IssueId: 0, BookId: 0, StudentId: 0, Days: 7, Remarks: '', PublicationId: 0, CourseId: 0 });
            setSelectedBook(null);
            setPubSearch('');
            setBookSearch('');
            setCourseSearch('');
            setStudentSearch('');
            setShowPubInput(false);
            setShowBookInput(false);
            setShowStudentInput(false);
            setShowCourseInput(false);
            await fetchData();
        } catch (error: any) {
            console.error('Error updating book issue:', error);
            toast.error('Failed to update book issue');
        }
    };

    const handleReturnBook = async () => {
        if (!selectedIssue) {
            console.error('No issue selected for return');
            toast.error('No issue selected');
            return;
        }
        try {
            const dueDate = new Date(selectedIssue.DueDate);
            const today = new Date();
            const isLate = today > dueDate;

            await axios.put(`/api/book-issue?id=${selectedIssue.IssueId}`, {
                status: 'returned',
                remarks: returnRemarks,
                fineAmount: isLate ? fineAmount : 0 // Only send fineAmount if late
            });
            toast.success('Book returned successfully');
            setIsReturnModalOpen(false);
            setReturnRemarks('');
            setFineAmount(0);
            setSelectedIssue(null);
            await fetchData();
        } catch (error: any) {
            console.error('Error returning book:', error);
            toast.error('Failed to return book');
        }
    };

    const handleRenewBook = async () => {
        if (!selectedIssue || !renewDays) {
            console.error('No issue selected or renew days not specified');
            toast.error('Invalid renewal request');
            return;
        }
        try {
            await axios.put(`/api/book-issue?id=${selectedIssue.IssueId}`, {
                status: 'renewed',
                renewDays,
                isRenewed: true
            });
            toast.success('Book renewed successfully');
            setIsRenewModalOpen(false);
            setRenewDays(7);
            setSelectedIssue(null);
            await fetchData();
        } catch (error: any) {
            console.error('Error renewing book:', error);
            toast.error('Failed to renew book');
        }
    };

    const handleDeleteBook = async () => {
        if (!selectedIssue) {
            console.error('No issue selected for deletion');
            toast.error('No issue selected');
            return;
        }
        try {
            await axios.delete(`/api/book-issue?id=${selectedIssue.IssueId}`);
            toast.success('Book issue deleted successfully');
            setIsDeleteModalOpen(false);
            setSelectedIssue(null);
            await fetchData();
        } catch (error: any) {
            console.error('Error deleting book issue:', error);
            toast.error('Failed to delete book issue');
        }
    };

    const openEditModal = (issue: BookIssue) => {
        const book = books.find(b => b.BookId === issue.BookId);
        const student = students.find(s => s.id === issue.StudentId);
        const days = Math.max(1, Math.ceil((new Date(issue.DueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));

        setSelectedIssue(issue);
        setSelectedBook(book || null);
        setEditFormData({
            IssueId: issue.IssueId,
            BookId: issue.BookId || 0,
            StudentId: issue.StudentId || 0,
            Days: isNaN(days) ? 7 : days,
            Remarks: issue.Remarks || '',
            PublicationId: book?.PublicationId || 0,
            CourseId: student?.courseId || 0
        });

        const publicationId = book ? book.PublicationId : 0;
        if (publicationId) {
            setFilteredBooks(books.filter(b => b.PublicationId === publicationId));
        } else {
            setFilteredBooks(books);
        }

        const courseId = student ? student.courseId : 0;
        if (courseId) {
            setFilteredStudents(students.filter(s => s.courseId === courseId));
        } else {
            setFilteredStudents(students);
        }

        setPubSearch(book?.PublicationName || '');
        setBookSearch(book?.Title || '');
        setCourseSearch(String(courses.find(c => c.id === student?.courseId)?.courseName || ''));
        setStudentSearch(student ? `${student.fName} ${student.lName} (${student.mobileNumber})` : '');
        setShowPubInput(false);
        setShowBookInput(false);
        setShowStudentInput(false);
        setShowCourseInput(false);
        setIsEditModalOpen(true);
    };

    const filteredIssues = bookIssues.filter(issue => {
        const matchesSearch = 
            (issue.BookTitle?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
            (issue.StudentName?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
            (issue.courseName?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
        
        const matchesStatus = statusFilter === 'all' || issue.Status === statusFilter;
        
        const matchesDate = 
            (!dateRange.start || new Date(issue.IssueDate) >= new Date(dateRange.start)) &&
            (!dateRange.end || new Date(issue.IssueDate) <= new Date(dateRange.end));
        
        return matchesSearch && matchesStatus && matchesDate;
    });

    return (
        <div className="container mx-auto sm:p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                <h1 className="text-xl font-bold">Book Issue Manager</h1>
                <button
                    onClick={() => {
                        setIsModalOpen(true);
                        setPubSearch('');
                        setBookSearch('');
                        setCourseSearch('');
                        setStudentSearch('');
                        setShowPubInput(false);
                        setShowBookInput(false);
                        setShowStudentInput(false);
                        setShowCourseInput(false);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm flex items-center gap-1"
                >
                    <FontAwesomeIcon icon={faPlus} size="xs" /> Issue New Book
                </button>
            </div>

            <div className="bg-white rounded shadow p-3 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search by book, student"
                            className="w-full pl-8 pr-2 py-1 border rounded text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <FontAwesomeIcon icon={faSearch} className="absolute left-2 top-2 text-gray-400 text-sm" />
                    </div>
                    <div>
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
                    </div>
                    <div>
                        <input
                            type="date"
                            className="w-full p-1 border rounded text-sm"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                            placeholder="From Date"
                        />
                    </div>
                    <div>
                        <input
                            type="date"
                            className="w-full p-1 border rounded text-sm"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                            placeholder="To Date"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded shadow overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center p-4">
                        <FontAwesomeIcon icon={faSpinner} spin size="lg" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left">Sr.</th>
                                    <th className="px-3 py-2 text-left">📖 Book Title</th>
                                    <th className="px-3 py-2 text-left">👨‍🎓 Student Name</th>
                                    <th className="px-3 py-2 text-left">🎓Course Name</th>
                                    <th className="px-3 py-2 text-left">⏳Days Left</th>
                                    <th className="px-3 py-2 text-left">📅 Issued On</th>
                                    <th className="px-3 py-2 text-left">📌Due On</th>
                                    <th className="px-3 py-2 text-left">🔄 Current Status</th>
                                    <th className="px-3 py-2 text-left">⚙️Manage</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredIssues.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-3 py-2 text-center text-gray-500">
                                            No book issues found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredIssues.map((issue, index) => (
                                        <tr key={issue.IssueId} className="hover:bg-gray-50">
                                            <td className="px-3 py-2">{index + 1}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <div className="font-medium">{issue.BookTitle}</div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <div>{issue.StudentName}</div>
                                                {issue.courseYear && (
                                                    <div className="text-xs text-gray-500">Year {issue.courseYear}</div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">{issue.courseName || 'N/A'}</td>
                                            <td className="px-3 py-2">
                                                <div className="text-xs flex items-center gap-1" title="Total and remaining days before the book must be returned">
                                                    <FontAwesomeIcon icon={faCalendarDays} className="text-blue-500" />
                                                    <span className="text-gray-500">
                                                        {Math.ceil((new Date(issue.DueDate).getTime() - new Date(issue.IssueDate).getTime()) / (1000 * 60 * 60 * 24))} days
                                                    </span>{' '}
                                                    {(() => {
                                                        const today = new Date();
                                                        const dueDate = new Date(issue.DueDate);
                                                        const diffInDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                                        if (diffInDays >= 0) {
                                                            return (
                                                                <span className="text-green-600 font-semibold" title={`${diffInDays} days remaining`}>
                                                                    ({diffInDays} days left)
                                                                </span>
                                                            );
                                                        } else {
                                                            return (
                                                                <span className="text-red-600 font-semibold" title={`Overdue by ${Math.abs(diffInDays)} days`}>
                                                                    (Overdue by {Math.abs(diffInDays)} days)
                                                                </span>
                                                            );
                                                        }
                                                    })()}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">{new Date(issue.IssueDate).toLocaleDateString()}</td>
                                            <td className="px-3 py-2">{new Date(issue.DueDate).toLocaleDateString()}</td>
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
                                                        <button
                                                            onClick={() => {
                                                                setPubSearch('');
                                                                setBookSearch('');
                                                                setCourseSearch('');
                                                                setStudentSearch('');
                                                                openEditModal(issue);
                                                            }}
                                                            className="text-yellow-600 hover:text-yellow-800 text-xs"
                                                        >
                                                            <FontAwesomeIcon icon={faEdit} /> Edit
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedIssue(issue);
                                                                setIsReturnModalOpen(true);
                                                            }}
                                                            className="text-green-600 hover:text-green-800 text-xs"
                                                        >
                                                            Return
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedIssue(issue);
                                                                setIsRenewModalOpen(true);
                                                            }}
                                                            className="text-blue-600 hover:text-blue-800 text-xs"
                                                        >
                                                            Renew
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedIssue(issue);
                                                                setIsDeleteModalOpen(true);
                                                            }}
                                                            className="text-red-600 hover:text-red-800 text-xs"
                                                        >
                                                            <FontAwesomeIcon icon={faTrash} /> Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
                    <div className="bg-white rounded shadow w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
                        <button
                            onClick={() => {
                                setIsModalOpen(false);
                                setSelectedBook(null);
                                setPubSearch('');
                                setBookSearch('');
                                setCourseSearch('');
                                setStudentSearch('');
                                setShowPubInput(false);
                                setShowBookInput(false);
                                setShowStudentInput(false);
                                setShowCourseInput(false);
                            }}
                            className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                        >
                            <FontAwesomeIcon icon={faTimes} size="lg" />
                        </button>
                        <div className="p-4">
                            <h2 className="text-lg font-bold mb-3 p-2 rounded-md">BOOK ISSUE FORM</h2>
                            <div className="space-y-4">
                                <div className="bg-gray-100 p-3 rounded">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium mb-1">Select Publication</label>
                                            <div
                                                onClick={() => setShowPubInput(!showPubInput)}
                                                className="w-full p-1 border rounded text-sm bg-white flex justify-between items-center"
                                            >
                                                <input
                                                    type="text"
                                                    placeholder="---Select Publication--"
                                                    className="w-full p-0 border-0 text-sm focus:outline-none"
                                                    value={pubSearch}
                                                    onChange={(e) => {
                                                        setPubSearch(e.target.value);
                                                        handlePublicationChange(formData.PublicationId ? formData.PublicationId : 0);
                                                    }}
                                                    onBlur={() => setTimeout(() => setShowPubInput(false), 200)}
                                                />
                                                {pubSearch && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPubSearch('');
                                                            handlePublicationChange(0);
                                                        }}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <FontAwesomeIcon icon={faTimesCircle} size="xs" />
                                                    </button>
                                                )}
                                            </div>
                                            {showPubInput && (
                                                <div className="relative">
                                                    <ul className="absolute w-full bg-white border rounded mt-1 max-h-40 overflow-y-auto z-10">
                                                        <li className="p-1 bg-gray-100 font-medium">Select Publication</li>
                                                        {filteredPublications.length > 0 ? (
                                                            filteredPublications.map(pub => (
                                                                <li
                                                                    key={pub.PubId}
                                                                    className="p-1 hover:bg-gray-100 cursor-pointer"
                                                                    onClick={() => {
                                                                        setPubSearch(pub.Name || '');
                                                                        handlePublicationChange(pub.PubId);
                                                                        setShowPubInput(false);
                                                                    }}
                                                                >
                                                                    {pub.Name}
                                                                </li>
                                                            ))
                                                        ) : pubSearch && (
                                                            <li className="p-1 text-center text-gray-500">No record found</li>
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">Select Book</label>
                                            <div
                                                onClick={() => setShowBookInput(!showBookInput)}
                                                className="w-full p-1 border rounded text-sm bg-white flex justify-between items-center"
                                            >
                                                <input
                                                    type="text"
                                                    placeholder="---Select Book---"
                                                    className="w-full p-0 border-0 text-sm focus:outline-none"
                                                    value={bookSearch}
                                                    onChange={(e) => {
                                                        setBookSearch(e.target.value);
                                                        handlePublicationChange(formData.PublicationId);
                                                    }}
                                                    onBlur={() => setTimeout(() => setShowBookInput(false), 200)}
                                                />
                                                {bookSearch && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setBookSearch('');
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
                                                        {filteredBooks.length > 0 ? (
                                                            filteredBooks.map(book => (
                                                                <li
                                                                    key={book.BookId}
                                                                    className="p-1 hover:bg-gray-100 cursor-pointer"
                                                                    onClick={() => {
                                                                        setBookSearch(book.Title || '');
                                                                        handleBookChange(book.BookId);
                                                                        setShowBookInput(false);
                                                                    }}
                                                                >
                                                                    {book.Title}
                                                                </li>
                                                            ))
                                                        ) : bookSearch && (
                                                            <li className="p-1 text-center text-gray-500">No record found</li>
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {selectedBook && (
                                    <div className="bg-gray-50 p-3 rounded">
                                        <h3 className="font-medium text-sm mb-2">View Book Detail</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="col-span-2">
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div><span className="font-medium">Book Name:</span> {selectedBook.Title}</div>
                                                    <div><span className="font-medium">Author:</span> {selectedBook.Author}</div>
                                                    <div><span className="font-medium">Publication:</span> {selectedBook.PublicationName}</div>
                                                    <div><span className="font-medium">Branch:</span> {selectedBook.courseName}</div>
                                                    <div><span className="font-medium">Price:</span> {selectedBook.Price}</div>
                                                    <div><span className="font-medium">Total Quantity:</span> {selectedBook.TotalCopies}</div>
                                                    <div><span className="font-medium">Available Qty:</span> {selectedBook.AvailableCopies}</div>
                                                    <div><span className="font-medium">Rent Qty:</span> {selectedBook.TotalCopies - selectedBook.AvailableCopies}</div>
                                                    <div className="col-span-2"><span className="font-medium">Detail:</span> {selectedBook.Details}</div>
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
                                    <h3 className="font-medium text-sm mb-2">Select Student Detail for Issue Book</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium mb-1">Select Course</label>
                                            <div
                                                onClick={() => setShowCourseInput(!showCourseInput)}
                                                className="w-full p-1 border rounded text-sm bg-white flex justify-between items-center"
                                            >
                                                <input
                                                    type="text"
                                                    placeholder="Select Course"
                                                    className="w-full p-0 border-0 text-sm focus:outline-none"
                                                    value={courseSearch}
                                                    onChange={(e) => {
                                                        setCourseSearch(e.target.value);
                                                        handleCourseChange(formData.CourseId);
                                                    }}
                                                    onBlur={() => setTimeout(() => setShowCourseInput(false), 200)}
                                                />
                                                {courseSearch && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setCourseSearch('');
                                                            handleCourseChange(0);
                                                        }}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <FontAwesomeIcon icon={faTimesCircle} size="xs" />
                                                    </button>
                                                )}
                                            </div>
                                            {showCourseInput && (
                                                <div className="relative">
                                                    <ul className="absolute w-full bg-white border rounded mt-1 max-h-40 overflow-y-auto z-10">
                                                        <li className="p-1 bg-gray-100 font-medium">Select Course</li>
                                                        {filteredCourses.length > 0 ? (
                                                            filteredCourses.map(course => (
                                                                <li
                                                                    key={course.id}
                                                                    className="p-1 hover:bg-gray-100 cursor-pointer"
                                                                    onClick={() => {
                                                                        setCourseSearch(String(course.courseName || ''));
                                                                        handleCourseChange(course.id);
                                                                        setShowCourseInput(false);
                                                                    }}
                                                                >
                                                                    {course.courseName}
                                                                </li>
                                                            ))
                                                        ) : courseSearch && (
                                                            <li className="p-1 text-center text-gray-500">No record found</li>
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">Select Student</label>
                                            <div
                                                onClick={() => setShowStudentInput(!showStudentInput)}
                                                className="w-full p-1 border rounded text-sm bg-white flex justify-between items-center"
                                            >
                                                <input
                                                    type="text"
                                                    placeholder="---Select Student---"
                                                    className="w-full p-0 border-0 text-sm focus:outline-none"
                                                    value={studentSearch}
                                                    onChange={(e) => {
                                                        setStudentSearch(e.target.value);
                                                        handleCourseChange(formData.CourseId);
                                                    }}
                                                    onBlur={() => setTimeout(() => setShowStudentInput(false), 200)}
                                                />
                                                {studentSearch && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setStudentSearch('');
                                                            setFormData({ ...formData, StudentId: 0 });
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
                                                        {filteredStudents.length > 0 ? (
                                                            filteredStudents.map(student => (
                                                                <li
                                                                    key={student.id}
                                                                    className="p-1 hover:bg-gray-100 cursor-pointer"
                                                                    onClick={() => {
                                                                        setStudentSearch(`${student.fName} ${student.lName}`);
                                                                        handleStudentChange(student.id);
                                                                        setShowStudentInput(false);
                                                                    }}
                                                                >
                                                                    {student.fName} {student.lName}
                                                                </li>
                                                            ))
                                                        ) : studentSearch && (
                                                            <li className="p-1 text-center text-gray-500">No record found</li>
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {formData.CourseId > 0 && (
                                        <div className="mt-2 text-sm">
                                            Selected Course: {courses.find(c => c.id === formData.CourseId)?.courseName || 'N/A'}
                                        </div>
                                    )}
                                </div>

                                <div className="bg-gray-50 p-3 rounded">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium mb-1">Days</label>
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-full p-1 border rounded text-sm"
                                                value={formData.Days}
                                                onChange={(e) => setFormData({...formData, Days: Number(e.target.value)})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">Due Date</label>
                                            <div className="p-1 border rounded bg-gray-100 text-sm">
                                                {calculateDueDate(formData.Days)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-2">
                                        <label className="block text-xs font-medium mb-1">Remarks (Optional)</label>
                                        <textarea
                                            className="w-full p-1 border rounded text-sm"
                                            rows={2}
                                            value={formData.Remarks}
                                            onChange={(e) => setFormData({...formData, Remarks: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-3">
                                <button
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setSelectedBook(null);
                                        setPubSearch('');
                                        setBookSearch('');
                                        setCourseSearch('');
                                        setStudentSearch('');
                                        setShowPubInput(false);
                                        setShowBookInput(false);
                                        setShowStudentInput(false);
                                        setShowCourseInput(false);
                                    }}
                                    className="px-3 py-1 border border-gray-300 rounded text-gray-700 text-sm hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleIssueBook}
                                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                >
                                    Book Issue
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
                                setSelectedBook(null);
                                setEditFormData({ IssueId: 0, BookId: 0, StudentId: 0, Days: 7, Remarks: '', PublicationId: 0, CourseId: 0 });
                                setPubSearch('');
                                setBookSearch('');
                                setCourseSearch('');
                                setStudentSearch('');
                                setShowPubInput(false);
                                setShowBookInput(false);
                                setShowStudentInput(false);
                                setShowCourseInput(false);
                            }}
                            className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                        >
                            <FontAwesomeIcon icon={faTimes} size="lg" />
                        </button>
                        <div className="p-4">
                            <h2 className="text-lg font-bold mb-3">EDIT BOOK ISSUE FORM</h2>
                            <div className="space-y-4">
                                <div className="bg-gray-50 p-3 rounded">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-blue-50">
                                        <div>
                                            <label className="block text-xs font-medium mb-1">Select Publication</label>
                                            <div
                                                onClick={() => setShowPubInput(!showPubInput)}
                                                className="w-full p-1 border rounded text-sm bg-white flex justify-between items-center"
                                            >
                                                <input
                                                    type="text"
                                                    placeholder="---Select Publication---"
                                                    className="w-full p-0 border-0 text-sm focus:outline-none"
                                                    value={pubSearch}
                                                    onChange={(e) => {
                                                        setPubSearch(e.target.value);
                                                        handlePublicationChange(editFormData.PublicationId ? editFormData.PublicationId : 0, true);
                                                    }}
                                                    onBlur={() => setTimeout(() => setShowPubInput(false), 200)}
                                                />
                                                {pubSearch && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPubSearch('');
                                                            handlePublicationChange(0, true);
                                                        }}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <FontAwesomeIcon icon={faTimesCircle} size="xs" />
                                                    </button>
                                                )}
                                            </div>
                                            {showPubInput && (
                                                <div className="relative">
                                                    <ul className="absolute w-full bg-white border rounded mt-1 max-h-40 overflow-y-auto z-10">
                                                        <li className="p-1 bg-gray-100 font-medium">Select Publication</li>
                                                        {filteredPublications.length > 0 ? (
                                                            filteredPublications.map(pub => (
                                                                <li
                                                                    key={pub.PubId}
                                                                    className="p-1 hover:bg-gray-100 cursor-pointer"
                                                                    onClick={() => {
                                                                        setPubSearch(pub.Name || '');
                                                                        handlePublicationChange(pub.PubId, true);
                                                                        setShowPubInput(false);
                                                                    }}
                                                                >
                                                                    {pub.Name}
                                                                </li>
                                                            ))
                                                        ) : pubSearch && (
                                                            <li className="p-1 text-center text-gray-500">No record found</li>
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">Select Book</label>
                                            <div
                                                onClick={() => setShowBookInput(!showBookInput)}
                                                className="w-full p-1 border rounded text-sm bg-white flex justify-between items-center"
                                            >
                                                <input
                                                    type="text"
                                                    placeholder="---Select Book---"
                                                    className="w-full p-0 border-0 text-sm focus:outline-none"
                                                    value={bookSearch}
                                                    onChange={(e) => {
                                                        setBookSearch(e.target.value);
                                                        handlePublicationChange(editFormData.PublicationId, true);
                                                    }}
                                                    onBlur={() => setTimeout(() => setShowBookInput(false), 200)}
                                                />
                                                {bookSearch && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setBookSearch('');
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
                                                        {filteredBooks.length > 0 ? (
                                                            filteredBooks.map(book => (
                                                                <li
                                                                    key={book.BookId}
                                                                    className="p-1 hover:bg-gray-100 cursor-pointer"
                                                                    onClick={() => {
                                                                        setBookSearch(book.Title || '');
                                                                        handleBookChange(book.BookId, true);
                                                                        setShowBookInput(false);
                                                                    }}
                                                                >
                                                                    {book.Title}
                                                                </li>
                                                            ))
                                                        ) : bookSearch && (
                                                            <li className="p-1 text-center text-gray-500">No record found</li>
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {selectedBook && (
                                    <div className="bg-gray-50 p-3 rounded">
                                        <h3 className="font-medium text-sm mb-2">View Book Detail</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="col-span-2">
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div><span className="font-medium">Book Name:</span> {selectedBook.Title}</div>
                                                    <div><span className="font-medium">Author:</span> {selectedBook.Author}</div>
                                                    <div><span className="font-medium">Publication:</span> {selectedBook.PublicationName}</div>
                                                    <div><span className="font-medium">Branch:</span> {selectedBook.courseName}</div>
                                                    <div><span className="font-medium">Price:</span> {selectedBook.Price}</div>
                                                    <div><span className="font-medium">Total Quantity:</span> {selectedBook.TotalCopies}</div>
                                                    <div><span className="font-medium">Available Qty:</span> {selectedBook.AvailableCopies}</div>
                                                    <div><span className="font-medium">Rent Qty:</span> {selectedBook.TotalCopies - selectedBook.AvailableCopies}</div>
                                                    <div className="col-span-2"><span className="font-medium">Detail:</span> {selectedBook.Details}</div>
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
                                    <h3 className="font-medium text-sm mb-2">Select Student Detail for Issue Book</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium mb-1">Select Course</label>
                                            <div
                                                onClick={() => setShowCourseInput(!showCourseInput)}
                                                className="w-full p-1 border rounded text-sm bg-white flex justify-between items-center"
                                            >
                                                <input
                                                    type="text"
                                                    placeholder="---Select Course---"
                                                    className="w-full p-0 border-0 text-sm focus:outline-none"
                                                    value={courseSearch}
                                                    onChange={(e) => {
                                                        setCourseSearch(e.target.value);
                                                        handleCourseChange(editFormData.CourseId, true);
                                                    }}
                                                    onBlur={() => setTimeout(() => setShowCourseInput(false), 200)}
                                                />
                                                {courseSearch && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setCourseSearch('');
                                                            handleCourseChange(0, true);
                                                        }}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <FontAwesomeIcon icon={faTimesCircle} size="xs" />
                                                    </button>
                                                )}
                                            </div>
                                            {showCourseInput && (
                                                <div className="relative">
                                                    <ul className="absolute w-full bg-white border rounded mt-1 max-h-40 overflow-y-auto z-10">
                                                        <li className="p-1 bg-gray-100 font-medium">Select Course</li>
                                                        {filteredCourses.length > 0 ? (
                                                            filteredCourses.map(course => (
                                                                <li
                                                                    key={course.id}
                                                                    className="p-1 hover:bg-gray-100 cursor-pointer"
                                                                    onClick={() => {
                                                                        setCourseSearch(String(course.courseName || ''));
                                                                        handleCourseChange(course.id, true);
                                                                        setShowCourseInput(false);
                                                                    }}
                                                                >
                                                                    {course.courseName}
                                                                </li>
                                                            ))
                                                        ) : courseSearch && (
                                                            <li className="p-1 text-center text-gray-500">No record found</li>
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">Select Student</label>
                                            <div
                                                onClick={() => setShowStudentInput(!showStudentInput)}
                                                className="w-full p-1 border rounded text-sm bg-white flex justify-between items-center"
                                            >
                                                <input
                                                    type="text"
                                                    placeholder="Search Student"
                                                    className="w-full p-0 border-0 text-sm focus:outline-none"
                                                    value={studentSearch}
                                                    onChange={(e) => {
                                                        setStudentSearch(e.target.value);
                                                        handleCourseChange(editFormData.CourseId, true);
                                                    }}
                                                    onBlur={() => setTimeout(() => setShowStudentInput(false), 200)}
                                                />
                                                {studentSearch && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setStudentSearch('');
                                                            setEditFormData({ ...editFormData, StudentId: 0 });
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
                                                        {filteredStudents.length > 0 ? (
                                                            filteredStudents.map(student => (
                                                                <li
                                                                    key={student.id}
                                                                    className="p-1 hover:bg-gray-100 cursor-pointer"
                                                                    onClick={() => {
                                                                        setStudentSearch(`${student.fName} ${student.lName}`);
                                                                        handleStudentChange(student.id, true);
                                                                        setShowStudentInput(false);
                                                                    }}
                                                                >
                                                                    {student.fName} {student.lName}
                                                                </li>
                                                            ))
                                                        ) : studentSearch && (
                                                            <li className="p-1 text-center text-gray-500">No record found</li>
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {editFormData.CourseId > 0 && (
                                        <div className="mt-2 text-sm">
                                            Selected Course: {courses.find(c => c.id === editFormData.CourseId)?.courseName || 'N/A'}
                                        </div>
                                    )}
                                </div>

                                <div className="bg-gray-50 p-3 rounded">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium mb-1">Days</label>
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-full p-1 border rounded text-sm"
                                                value={editFormData.Days}
                                                onChange={(e) => setEditFormData({...editFormData, Days: Number(e.target.value)})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1">Due Date</label>
                                            <div className="p-1 border rounded bg-gray-100 text-sm">
                                                {calculateDueDate(editFormData.Days)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-2">
                                        <label className="block text-xs font-medium mb-1">Remarks (Optional)</label>
                                        <textarea
                                            className="w-full p-1 border rounded text-sm"
                                            rows={2}
                                            value={editFormData.Remarks}
                                            onChange={(e) => setEditFormData({...editFormData, Remarks: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-3">
                                <button
                                    onClick={() => {
                                        setIsEditModalOpen(false);
                                        setSelectedBook(null);
                                        setEditFormData({ IssueId: 0, BookId: 0, StudentId: 0, Days: 7, Remarks: '', PublicationId: 0, CourseId: 0 });
                                        setPubSearch('');
                                        setBookSearch('');
                                        setCourseSearch('');
                                        setStudentSearch('');
                                        setShowPubInput(false);
                                        setShowBookInput(false);
                                        setShowStudentInput(false);
                                        setShowCourseInput(false);
                                    }}
                                    className="px-3 py-1 border border-gray-300 rounded text-gray-700 text-sm hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleEditBook}
                                    className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                                >
                                    Update Issue
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
                            onClick={() => {
                                setIsReturnModalOpen(false);
                                setSelectedIssue(null);
                            }}
                            className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                        >
                            <FontAwesomeIcon icon={faTimes} size="lg" />
                        </button>
                        <div className="p-4">
                            <h2 className="text-lg font-bold mb-2">Return Book</h2>
                            <p className="mb-3 text-sm">Return <strong>{selectedIssue.BookTitle}</strong> issued to <strong>{selectedIssue.StudentName}</strong>?</p>
                            <div className="mb-3">
                                <label className="block text-xs font-medium mb-1">Remarks (Optional)</label>
                                <textarea
                                    className="w-full p-1 border rounded text-sm"
                                    rows={2}
                                    value={returnRemarks}
                                    onChange={(e) => setReturnRemarks(e.target.value)}
                                />
                            </div>
                            {(() => {
                                const dueDate = new Date(selectedIssue.DueDate);
                                const today = new Date();
                                const isLate = today > dueDate;
                                return isLate ? (
                                    <div className="mb-3">
                                        <label className="block text-xs font-medium mb-1">Fine Amount (if applicable)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-full p-1 border rounded text-sm"
                                            value={fineAmount}
                                            onChange={(e) => setFineAmount(Number(e.target.value))}
                                            placeholder="Enter fine amount"
                                        />
                                    </div>
                                ) : null;
                            })()}
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => {
                                        setIsReturnModalOpen(false);
                                        setSelectedIssue(null);
                                    }}
                                    className="px-3 py-1 border border-gray-300 rounded text-gray-700 text-sm hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReturnBook}
                                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                >
                                    Return
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isRenewModalOpen && selectedIssue && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
                    <div className="bg-white rounded shadow w-full max-w-xs relative">
                        <button
                            onClick={() => {
                                setIsRenewModalOpen(false);
                                setSelectedIssue(null);
                            }}
                            className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                        >
                            <FontAwesomeIcon icon={faTimes} size="lg" />
                        </button>
                        <div className="p-4">
                            <h2 className="text-lg font-bold mb-2">Renew Book</h2>
                            <p className="mb-3 text-sm">Renew <strong>{selectedIssue.BookTitle}</strong> for <strong>{selectedIssue.StudentName}</strong></p>
                            <div className="mb-2">
                                <label className="block text-xs font-medium mb-1">Current Due Date</label>
                                <div className="p-1 border rounded bg-gray-100 text-sm mb-2">
                                    {new Date(selectedIssue.DueDate).toLocaleDateString()}
                                </div>
                                <label className="block text-xs font-medium mb-1">Additional Days</label>
                                <input
                                    type="number"
                                    min="1"
                                    className="w-full p-1 border rounded text-sm"
                                    value={renewDays}
                                    onChange={(e) => setRenewDays(Number(e.target.value))}
                                />
                                <label className="block text-xs font-medium mb-1 mt-2">New Due Date</label>
                                <div className="p-1 border rounded bg-gray-100 text-sm">
                                    {calculateDueDate(renewDays)}
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => {
                                        setIsRenewModalOpen(false);
                                        setSelectedIssue(null);
                                    }}
                                    className="px-3 py-1 border border-gray-300 rounded text-gray-700 text-sm hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRenewBook}
                                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                >
                                    Renew
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
                            onClick={() => {
                                setIsDeleteModalOpen(false);
                                setSelectedIssue(null);
                            }}
                            className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                        >
                            <FontAwesomeIcon icon={faTimes} size="lg" />
                        </button>
                        <div className="p-4">
                            <h2 className="text-lg font-bold mb-2">Delete Book Issue</h2>
                            <p className="mb-3 text-sm">
                                Are you sure you want to delete the issue of <strong>{selectedIssue.BookTitle}</strong> for <strong>{selectedIssue.StudentName}</strong>?
                            </p>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => {
                                        setIsDeleteModalOpen(false);
                                        setSelectedIssue(null);
                                    }}
                                    className="px-3 py-1 border border-gray-300 rounded text-gray-700 text-sm hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteBook}
                                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                                >
                                    Delete
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