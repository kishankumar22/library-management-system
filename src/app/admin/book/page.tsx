'use client';

import { useUser } from '@/app/hooks/useUser';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner, faPlus, faEdit, faTrash, faSearch, faFilter,faTimesCircle,faTimes,faToggleOff,
  faToggleOn,
  faRotateLeft
} from '@fortawesome/free-solid-svg-icons';
import { Book } from '@/types';

interface Course { id: number; courseName: string; }
interface Subject { SubId: number; Name: string; }
interface Publication { PubId: number; Name: string; }

const BooksPage = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [formData, setFormData] = useState({
    IsbnNumber: '', Title: '', Author: '', Details: '', CourseId: '', Price: '',
    SubjectId: '', PublicationId: '', TotalCopies: '1', Edition: '', Language: '',
    PublishedYear: '', BookPhoto: null as File | null, Barcode: ''
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'delete' | 'toggle' | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<boolean | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [courseFilter, setCourseFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [publicationFilter, setPublicationFilter] = useState('');
  const [availableCopiesFilter, setAvailableCopiesFilter] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showSubjectInput, setShowSubjectInput] = useState(false);
  const [showPublicationInput, setShowPublicationInput] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [publicationSearch, setPublicationSearch] = useState('');
  const user = useUser();
  //  console.log(user?.name, user?.profilePic);

  const modalRef = useRef<HTMLDivElement>(null);
  const confirmModalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resetFilter = () => {
  setSearchTerm('');
  setStatusFilter('all');
  setCourseFilter('');
  setSubjectFilter('');
  setPublicationFilter('');
  setAvailableCopiesFilter('');
};


  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [searchTerm, statusFilter, courseFilter, subjectFilter, publicationFilter, availableCopiesFilter]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (isModalOpen && modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsModalOpen(false);
      }
      if (isConfirmModalOpen && confirmModalRef.current && !confirmModalRef.current.contains(e.target as Node)) {
        setIsConfirmModalOpen(false);
      }
    };

    if (isModalOpen || isConfirmModalOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.body.style.overflow = 'auto';
    };
  }, [isModalOpen, isConfirmModalOpen]);

  const fetchInitialData = async () => {
    try {
      const [courseRes, subjectRes, publicationRes] = await Promise.all([
        axios.get('/api/course').catch(() => ({ data: [] })),
        axios.get('/api/subject').catch(() => ({ data: [] })),
        axios.get('/api/publication').catch(() => ({ data: [] })),
      ]);
      setCourses(courseRes.data);
      setSubjects(subjectRes.data);
      setPublications(publicationRes.data);
    } catch (error) {
      toast.error('Failed to fetch initial data');
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchBooks = async () => {
    setTableLoading(true);
    try {
      const params = {
        search: searchTerm,
        status: statusFilter,
        courseId: courseFilter,
        subjectId: subjectFilter,
        publicationId: publicationFilter,
        availableCopies: availableCopiesFilter,
      };
      const res = await axios.get('/api/book', { params });
      setBooks(res.data);
    } catch (error) {
      toast.error('Failed to fetch books');
    } finally {
      setTableLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.IsbnNumber) newErrors.IsbnNumber = 'ISBN is required';
    else if (!/^\d{10,13}$/.test(formData.IsbnNumber)) newErrors.IsbnNumber = 'Invalid ISBN format';
    if (!formData.Title) newErrors.Title = 'Title is required';
    if (!formData.CourseId) newErrors.CourseId = 'Course is required';
    if (!formData.SubjectId) newErrors.SubjectId = 'Subject is required';
    if (!formData.PublicationId) newErrors.PublicationId = 'Publication is required';
    if (formData.Price && isNaN(parseFloat(formData.Price))) newErrors.Price = 'Invalid price format';
    if (formData.TotalCopies && isNaN(parseInt(formData.TotalCopies))) newErrors.TotalCopies = 'Invalid number';
    if (formData.PublishedYear && isNaN(parseInt(formData.PublishedYear))) newErrors.PublishedYear = 'Invalid year';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!validateForm()) return;

  try {
    const form = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      if (value !== null && value !== '') {
        if (key === 'BookPhoto' && value instanceof File) {
          form.append(key, value);
          console.log(`Appending file for ${editingId ? 'edit' : 'add'}: ${value.name}, size: ${value.size}`);
        } else {
          form.append(key, value as string);
        }
      }
    });

    // ✅ Add CreatedBy/ModifiedBy
    if (!editingId && user?.name) {
      form.append('CreatedBy', user.name);
    } else if (editingId && user?.name) {
      form.append('ModifiedBy', user.name);
    }

    if (editingId) {
      form.append('BookId', editingId.toString());
    }

    console.log('FormData contents:');
    for (const [key, value] of form.entries()) {
      console.log(`${key}: ${value instanceof File ? value.name : value}`);
    }

    const url = '/api/book';
    const method = editingId ? 'put' : 'post';
    const res = await axios({
      method,
      url,
      data: form,
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    toast.success(editingId ? 'Book updated' : 'Book added');
    resetForm();
    fetchBooks();
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || 'An error occurred';
    console.error('Submission error:', errorMsg, error);
    toast.error(errorMsg);
  }
};


  const handleEdit = (book: Book) => {
    setFormData({
      IsbnNumber: book.IsbnNumber,
      Title: book.Title,
      Author: book.Author || '',
      Details: book.Details || '',
      CourseId: book.CourseId?.toString() || '',
      Price: book.Price?.toString() || '',
      SubjectId: book.SubjectId?.toString() || '',
      PublicationId: book.PublicationId?.toString() || '',
      TotalCopies: book.TotalCopies.toString(),
      Edition: book.Edition || '',
      Language: book.Language || '',
      PublishedYear: book.PublishedYear?.toString() || '',
      BookPhoto: null,
      Barcode: book.Barcode || ''
    });
    setEditingId(book.BookId);
    setSubjectSearch(subjects.find(s => s.SubId === book.SubjectId)?.Name || '');
    setPublicationSearch(publications.find(p => p.PubId === book.PublicationId)?.Name || '');
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!confirmId) return;
    try {
      await axios.delete('/api/book', { data: { BookId: confirmId } });
      toast.success('Book deleted');
      setIsConfirmModalOpen(false);
      fetchBooks();
    } catch (error) {
      toast.error('An error occurred');
    }
  };

const handleToggleActive = async () => {
  if (!confirmId || confirmStatus === null) return;

  try {
    await axios.patch('/api/book', {
      BookId: confirmId,
      IsActive: !confirmStatus,
      ModifiedBy: user?.name || 'Admin', // ✅ Add ModifiedBy
    });

    toast.success(`Book ${confirmStatus ? 'deactivated' : 'activated'}`);
    setIsConfirmModalOpen(false);
    fetchBooks();
  } catch (error) {
    toast.error('An error occurred');
  }
};

  const openConfirmModal = (action: 'delete' | 'toggle', id: number, status?: boolean) => {
    setConfirmAction(action);
    setConfirmId(id);
    setConfirmStatus(status ?? null);
    setIsConfirmModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      IsbnNumber: '', Title: '', Author: '', Details: '', CourseId: '', Price: '',
      SubjectId: '', PublicationId: '', TotalCopies: '1', Edition: '', Language: '',
      PublishedYear: '', BookPhoto: null, Barcode: ''
    });
    setEditingId(null);
    setSubjectSearch('');
    setPublicationSearch('');
    setShowSubjectInput(false);
    setShowPublicationInput(false);
    setIsModalOpen(false);
    setErrors({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // const baseUrl = 'https://library.jkipm.in';
  const baseUrl = 'https://localhost:3003';

  const handleSubjectChange = (subId: string) => {
    setFormData({ ...formData, SubjectId: subId });
    setSubjectSearch(subjects.find(s => s.SubId.toString() === subId)?.Name || '');
    setShowSubjectInput(false);
  };

  const handlePublicationChange = (pubId: string) => {
    setFormData({ ...formData, PublicationId: pubId });
    setPublicationSearch(publications.find(p => p.PubId.toString() === pubId)?.Name || '');
    setShowPublicationInput(false);
  };

  return (
    <div className="">
      <div className="bg-white rounded-lg shadow-sm">
        {initialLoading ? (
          <div className="flex items-center justify-center h-[96vh]">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin w-16 h-16 text-blue-500 text-4xl" />
          </div>
        ) : (
          <>
<div className="flex flex-wrap gap-2 mb-4 bg-gray-50 p-3 rounded-lg shadow-sm items-center">
  {/* Total Books */}
  <div className="text-blue-700 text-sm font-medium mr-auto">
    Total Books: <span className="font-semibold">{books.length}</span>
  </div>

  {/* Search */}
  <div className="relative flex-grow min-w-[180px] max-w-xs">
    <FontAwesomeIcon icon={faSearch} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search by title or ISBN..."
      className="pl-8 pr-2 py-1 text-xs border border-gray-300 rounded-md w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
  </div>

  {/* Status Filter */}
  <div className="relative flex-grow min-w-[120px] max-w-xs">
    <FontAwesomeIcon icon={faFilter} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
    <select
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value as any)}
      className="pl-8 pr-2 py-1 text-xs border border-gray-300 rounded-md w-full focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
    >
      <option value="all">All Status</option>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>
  </div>

  {/* Course Filter */}
  <div className="relative flex-grow min-w-[150px] max-w-xs">
    <FontAwesomeIcon icon={faFilter} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
    <select
      value={courseFilter}
      onChange={(e) => setCourseFilter(e.target.value)}
      className="pl-8 pr-2 py-1 text-xs border border-gray-300 rounded-md w-full focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
    >
      <option value="">All Courses</option>
      {courses.map(course => (
        <option key={course.id} value={course.id}>{course.courseName}</option>
      ))}
    </select>
  </div>

  {/* Subject Filter */}
  <div className="relative flex-grow min-w-[150px] max-w-xs">
    <FontAwesomeIcon icon={faFilter} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
    <select
      value={subjectFilter}
      onChange={(e) => setSubjectFilter(e.target.value)}
      className="pl-8 pr-2 py-1 text-xs border border-gray-300 rounded-md w-full focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
    >
      <option value="">All Subjects</option>
      {subjects.map(subject => (
        <option key={subject.SubId} value={subject.SubId}>{subject.Name}</option>
      ))}
    </select>
  </div>

  {/* Publication Filter */}
  <div className="relative flex-grow min-w-[150px] max-w-xs">
    <FontAwesomeIcon icon={faFilter} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
    <select
      value={publicationFilter}
      onChange={(e) => setPublicationFilter(e.target.value)}
      className="pl-8 pr-2 py-1 text-xs border border-gray-300 rounded-md w-full focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
    >
      <option value="">All Publications</option>
      {publications.map(pub => (
        <option key={pub.PubId} value={pub.PubId}>{pub.Name}</option>
      ))}
    </select>
  </div>

  {/* Available Copies */}
  <div className="relative flex-grow min-w-[120px] max-w-xs">
    <FontAwesomeIcon icon={faFilter} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
    <input
      type="number"
      value={availableCopiesFilter}
      onChange={(e) => setAvailableCopiesFilter(e.target.value)}
      placeholder="Min Copies"
      className="pl-8 pr-2 py-1 text-xs border border-gray-300 rounded-md w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
  </div>

  {/* Buttons Group */}
  <div className="flex gap-2 flex-wrap justify-end w-full sm:w-auto">
    {/* Reset Filter */}
    <button
      onClick={resetFilter}
      className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-medium py-1.5 px-3 rounded-md flex items-center gap-1 shadow-sm transition-colors duration-200"
    >
      <FontAwesomeIcon icon={faRotateLeft} size="xs" /> Reset Filter
    </button>

    {/* Add Book */}
    <button
      onClick={() => {
        resetForm();
        setIsModalOpen(true);
      }}
      className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-1.5 px-3 rounded-md flex items-center gap-1 shadow-sm transition-colors duration-200"
    >
      <FontAwesomeIcon icon={faPlus} size="xs" /> Add Book
    </button>
  </div>
</div>


            {isModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50">
                <div ref={modalRef} className="bg-white rounded-lg shadow-md p-6 w-full max-w-2xl">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">{editingId ? 'Edit Book' : 'Add Book'}</h3>
                  <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="isbn" className="block text-sm font-medium text-gray-700">
                        ISBN Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="isbn"
                        type="text"
                        value={formData.IsbnNumber}
                        onChange={(e) => setFormData({ ...formData, IsbnNumber: e.target.value })}
                        placeholder="Enter ISBN Number"
                        className={`mt-1 p-2 text-sm border rounded-lg w-full ${errors.IsbnNumber ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors.IsbnNumber && <p className="text-red-500 text-xs mt-1">{errors.IsbnNumber}</p>}
                    </div>
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="title"
                        type="text"
                        value={formData.Title}
                        onChange={(e) => setFormData({ ...formData, Title: e.target.value })}
                        placeholder="Enter Title"
                        className={`mt-1 p-2 text-sm uppercase border rounded-lg w-full ${errors.Title ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors.Title && <p className="text-red-500 text-xs mt-1">{errors.Title}</p>}
                    </div>
                    <div>
                      <label htmlFor="author" className="block text-sm font-medium text-gray-700">Author</label>
                      <input
                        id="author"
                        type="text"
                        value={formData.Author}
                        onChange={(e) => setFormData({ ...formData, Author: e.target.value })}
                        placeholder="Enter Author"
                        className="mt-1 p-2 text-sm border border-gray-300 rounded-lg w-full"
                      />
                    </div>
                    <div>
                      <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price</label>
                      <input
                        id="price"
                        type="number"
                        value={formData.Price}
                        onChange={(e) => setFormData({ ...formData, Price: e.target.value })}
                        placeholder="Enter Price"
                        className={`mt-1 p-2 text-sm border rounded-lg w-full ${errors.Price ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors.Price && <p className="text-red-500 text-xs mt-1">{errors.Price}</p>}
                    </div>
                    <div>
                      <label htmlFor="course" className="block text-sm font-medium text-gray-700">
                        Course <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="course"
                        value={formData.CourseId}
                        onChange={(e) => setFormData({ ...formData, CourseId: e.target.value })}
                        className={`mt-1 p-2 text-sm border rounded-lg w-full ${errors.CourseId ? 'border-red-500' : 'border-gray-300'}`}
                      >
                        <option value="">Select Course</option>
                        {courses.map(course => (
                          <option key={course.id} value={course.id}>{course.courseName}</option>
                        ))}
                      </select>
                      {errors.CourseId && <p className="text-red-500 text-xs mt-1">{errors.CourseId}</p>}
                    </div>
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                        Subject <span className="text-red-500">*</span>
                      </label>
                      <div
                        onClick={() => setShowSubjectInput(!showSubjectInput)}
                        className="w-full p-1 border rounded text-sm bg-white flex justify-between items-center"
                      >
                        <input
                          type="text"
                          placeholder="Search Subject"
                          className="w-full p-0 border-0 text-sm focus:outline-none"
                          value={subjectSearch}
                          onChange={(e) => {
                            setSubjectSearch(e.target.value);
                            // No filtering here, just update search term
                          }}
                          onBlur={() => setTimeout(() => setShowSubjectInput(false), 200)}
                        />
                        {subjectSearch && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSubjectSearch('');
                              setFormData({ ...formData, SubjectId: '' });
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FontAwesomeIcon icon={faTimesCircle} size="xs" />
                          </button>
                        )}
                      </div>
                      {showSubjectInput && (
                        <div className="relative">
                          <ul className="absolute w-full bg-white border rounded mt-1 max-h-40 overflow-y-auto z-10">
                            <li className="p-1 bg-gray-100 font-medium">Select Subject</li>
                            {subjects
                              .filter(subject => subject.Name.toLowerCase().includes(subjectSearch.toLowerCase()))
                              .map(subject => (
                                <li
                                  key={subject.SubId}
                                  className="p-1 hover:bg-gray-100 cursor-pointer"
                                  onClick={() => handleSubjectChange(subject.SubId.toString())}
                                >
                                  {subject.Name}
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                      {errors.SubjectId && <p className="text-red-500 text-xs mt-1">{errors.SubjectId}</p>}
                    </div>
                    <div>
                      <label htmlFor="publication" className="block text-sm font-medium text-gray-700">
                        Publication <span className="text-red-500">*</span>
                      </label>
                      <div
                        onClick={() => setShowPublicationInput(!showPublicationInput)}
                        className="w-full p-1 border rounded text-sm bg-white flex justify-between items-center"
                      >
                        <input
                          type="text"
                          placeholder="Search Publication"
                          className="w-full p-0 border-0 text-sm focus:outline-none"
                          value={publicationSearch}
                          onChange={(e) => {
                            setPublicationSearch(e.target.value);
                            // No filtering here, just update search term
                          }}
                          onBlur={() => setTimeout(() => setShowPublicationInput(false), 200)}
                        />
                        {publicationSearch && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPublicationSearch('');
                              setFormData({ ...formData, PublicationId: '' });
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
                            {publications
                              .filter(pub => pub.Name.toLowerCase().includes(publicationSearch.toLowerCase()))
                              .map(pub => (
                                <li
                                  key={pub.PubId}
                                  className="p-1 hover:bg-gray-100 cursor-pointer"
                                  onClick={() => handlePublicationChange(pub.PubId.toString())}
                                >
                                  {pub.Name}
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                      {errors.PublicationId && <p className="text-red-500 text-xs mt-1">{errors.PublicationId}</p>}
                    </div>
                    <div>
                      <label htmlFor="copies" className="block text-sm font-medium text-gray-700">Total Copies</label>
                      <input
                        id="copies"
                        type="number"
                        value={formData.TotalCopies}
                        onChange={(e) => setFormData({ ...formData, TotalCopies: e.target.value })}
                        placeholder="Enter Total Copies"
                        className={`mt-1 p-2 text-sm border rounded-lg w-full ${errors.TotalCopies ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors.TotalCopies && <p className="text-red-500 text-xs mt-1">{errors.TotalCopies}</p>}
                    </div>
                    <div>
                      <label htmlFor="edition" className="block text-sm font-medium text-gray-700">Edition</label>
                      <input
                        id="edition"
                        type="text"
                        value={formData.Edition}
                        onChange={(e) => setFormData({ ...formData, Edition: e.target.value })}
                        placeholder="Enter Edition"
                        className="mt-1 p-2 text-sm border border-gray-300 rounded-lg w-full"
                      />
                    </div>
                    <div>
                      <label htmlFor="language" className="block text-sm font-medium text-gray-700">Language</label>
                      <select
                        id="language"
                        value={formData.Language}
                        onChange={(e) => setFormData({ ...formData, Language: e.target.value })}
                        className="mt-1 p-2 text-sm border border-gray-300 rounded-lg w-full"
                      >
                        <option value="">-- Select Language --</option>
                        <option value="English">English</option>
                        <option value="Hindi">Hindi</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="year" className="block text-sm font-medium text-gray-700">Published Year</label>
                      <input
                        id="year"
                        type="number"
                        value={formData.PublishedYear}
                        onChange={(e) => setFormData({ ...formData, PublishedYear: e.target.value })}
                        placeholder="Enter Published Year"
                        className={`mt-1 p-2 text-sm border rounded-lg w-full ${errors.PublishedYear ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors.PublishedYear && <p className="text-red-500 text-xs mt-1">{errors.PublishedYear}</p>}
                    </div>
                    <div>
                      <label htmlFor="barcode" className="block text-sm font-medium text-gray-700">Barcode</label>
                      <input
                        id="barcode"
                        type="text"
                        value={formData.Barcode}
                        onChange={(e) => setFormData({ ...formData, Barcode: e.target.value })}
                        placeholder="Enter Barcode"
                        className="mt-1 p-2 text-sm border border-gray-300 rounded-lg w-full"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">Book Photo</label>
                      {editingId && books.find(b => b.BookId === editingId)?.BookPhoto && (
                        <div className="mb-2">
                          <img
                            src={`${baseUrl}${books.find(b => b.BookId === editingId)?.BookPhoto}`}
                            alt="Current Book"
                            className="h-24 w-24 object-cover rounded-lg mb-2"
                          />
                          <p className="text-sm text-gray-600">Current Photo</p>
                        </div>
                      )}
                      <input
                        id="photo"
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={(e) => setFormData({ ...formData, BookPhoto: e.target.files?.[0] || null })}
                        className="mt-1 p-2 text-sm border border-gray-300 rounded-lg w-full"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-3">
                      <label htmlFor="details" className="block text-sm font-medium text-gray-700">Details</label>
                      <textarea
                        id="details"
                        value={formData.Details}
                        onChange={(e) => setFormData({ ...formData, Details: e.target.value })}
                        placeholder="Enter Details"
                        className="mt-1 p-2 text-sm border border-gray-300 rounded-lg w-full"
                        rows={3}
                      />
                    </div>
                    <div className="col-span-1 md:col-span-3 flex justify-end gap-4 mt-4">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="bg-gray-200 text-gray-800 hover:bg-gray-300 text-sm font-medium py-2 px-4 rounded-lg flex items-center gap-1"
                      >
                        <FontAwesomeIcon icon={faTimes	} size="sm" /> Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg flex items-center gap-1"
                      >
                        <FontAwesomeIcon icon={editingId ? faEdit : faPlus} size="sm" />
                        {editingId ? 'Update' : 'Add'} Book
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {isConfirmModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50">
                <div ref={confirmModalRef} className="bg-white rounded-lg shadow-md p-4 w-full max-w-xs">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Confirm Action</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {confirmAction === 'delete' ? 'Delete this book?' : confirmStatus ? 'Deactivate this book?' : 'Activate this book?'}
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsConfirmModalOpen(false)}
                      className="bg-gray-200 text-gray-800 hover:bg-gray-300 text-sm font-medium py-2 px-4 rounded-lg flex items-center gap-1"
                    >
                      <FontAwesomeIcon icon={faTimes	} size="sm" /> Cancel
                    </button>
                    <button
                      onClick={confirmAction === 'delete' ? handleDelete : handleToggleActive}
                      className={`text-white text-sm font-medium py-2 px-4 rounded-lg flex items-center gap-1 ${
                        confirmAction === 'delete' ? 'bg-red-600 hover:bg-red-700' : confirmStatus ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      <FontAwesomeIcon icon={confirmAction === 'delete' ? faTrash : confirmStatus ? faToggleOff : faToggleOn} size="sm" />
                      {confirmAction === 'delete' ? 'Delete' : confirmStatus ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-gray-200 mt-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ISBN</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Publication</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Copies</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableLoading ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-2 text-center text-sm text-gray-600">
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-500" size="sm" /> Loading...
                      </td>
                    </tr>
                  ) : books.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-2 text-center text-sm text-gray-500">
                        No books found
                      </td>
                    </tr>
                  ) : (
                   books
      .filter(book => book.TotalCopies > 0)
      .map((book, index) => (
        <tr key={book.BookId} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{index+1}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          {book.BookPhoto ? (
                            <img
                              src={`${baseUrl}${book.BookPhoto}`}
                              alt={book.Title}
                              className="h-12 w-12 object-cover rounded-lg"
                            />
                          ) : '-'}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap uppercase text-sm">{book.Title}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{book.IsbnNumber}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{book.Author || '-'}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{book.courseName || '-'}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{book.SubjectName || '-'}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{book.PublicationName || '-'}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{book.Price ? `₹ ${book.Price.toFixed(2)}` : '-'}</td>
 <td className="px-4 py-2 whitespace-nowrap text-sm leading-tight">
  <div>📚 Total: {book.TotalCopies}</div>
  <div>📗 Available: {book.AvailableCopies}</div>
  <div>📕 Issued: {book.TotalCopies - book.AvailableCopies}</div>
</td>


                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full ${book.IsActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {book.IsActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(book)}
                              className={`text-blue-600 hover:text-blue-800 p-2 rounded ${!book.IsActive ? 'cursor-not-allowed opacity-60' : ''}`}
                              title={book.IsActive ? 'Edit' : 'Please activate to edit'}
                              disabled={!book.IsActive}
                            >
                              <FontAwesomeIcon icon={faEdit} size="sm" />
                            </button>
                            <button
                              onClick={() => openConfirmModal('delete', book.BookId)}
                              className="text-red-600 hover:text-red-800 p-2 rounded"
                              title="Delete"
                            >
                              <FontAwesomeIcon icon={faTrash} size="sm" />
                            </button>
                            <button
                              onClick={() => openConfirmModal('toggle', book.BookId, book.IsActive)}
                              className={`p-2 rounded ${book.IsActive ? 'text-amber-600 hover:text-amber-800' : 'text-green-600 hover:text-green-800'}`}
                              title={book.IsActive ? 'Deactivate' : 'Activate'}
                            >
                              <FontAwesomeIcon icon={book.IsActive ? faToggleOff : faToggleOn} size="sm" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BooksPage;