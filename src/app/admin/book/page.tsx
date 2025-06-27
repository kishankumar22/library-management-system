'use client';

import { useEffect, useState, useRef } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner, faEye, faEyeSlash, faArrowLeft, faPlus, faEdit, faTrash, faSearch, faFilter
} from '@fortawesome/free-solid-svg-icons';

interface Book {
  BookId: number;
  IsbnNumber: string;
  Title: string;
  Barcode: string | null;
  Author: string | null;
  BookPhoto: string | null;
  Details: string | null;
  CourseId: number | null;
  courseName: string | null;
  Price: number | null;
  SubjectId: number | null;
  SubjectName: string | null;
  PublicationId: number | null;
  PublicationName: string | null;
  IsAvailable: boolean;
  TotalCopies: number;
  AvailableCopies: number;
  Edition: string | null;
  Language: string | null;
  PublishedYear: number | null;
  IsActive: boolean;
  CreatedBy: string;
  CreatedOn: string;
  ModifiedBy: string | null;
  ModifiedOn: string | null;
}

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
    SubjectId: '', PublicationId: '', TotalCopies: '1', Edition: '', Language: 'English',
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

  const modalRef = useRef<HTMLDivElement>(null);
  const confirmModalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const coursePromise = axios.get('/api/course').catch(error => {
        toast.error('Failed to fetch courses');
        return { data: [] };
      });
      const subjectPromise = axios.get('/api/subject').catch(error => {
        toast.error('Failed to fetch subjects');
        return { data: [] };
      });
      const publicationPromise = axios.get('/api/publication').catch(error => {
        toast.error('Failed to fetch publications');
        return { data: [] };
      });

      const [courseRes, subjectRes, publicationRes] = await Promise.all([
        coursePromise,
        subjectPromise,
        publicationPromise,
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
        if (value !== null && value !== '') form.append(key, value as string | Blob);
      });
      if (editingId) form.append('BookId', editingId.toString());

      const res = await axios({
        method: editingId ? 'put' : 'post',
        url: '/api/book',
        data: form,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(editingId ? 'Book updated' : 'Book added');
      resetForm();
      fetchBooks();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'An error occurred';
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
      Language: book.Language || 'English',
      PublishedYear: book.PublishedYear?.toString() || '',
      BookPhoto: null,
      Barcode: book.Barcode || ''
    });
    setEditingId(book.BookId);
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
      SubjectId: '', PublicationId: '', TotalCopies: '1', Edition: '', Language: 'English',
      PublishedYear: '', BookPhoto: null, Barcode: ''
    });
    setEditingId(null);
    setIsModalOpen(false);
    setErrors({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="bg-white w-full rounded-lg shadow-sm px-4 py-1">
        {initialLoading ? (
          <div className="flex items-center justify-center h-screen">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-500 text-4xl" />
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-3 text-gray-800">Manage Books</h2>

            <div className="flex flex-col sm:flex-row justify-between mb-2 gap-2">
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative flex-grow sm:w-56">
                  <FontAwesomeIcon icon={faSearch} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by title or ISBN..."
                    className="pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="relative flex-grow sm:w-36">
                  <FontAwesomeIcon icon={faFilter} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="relative flex-grow sm:w-36">
                  <FontAwesomeIcon icon={faFilter} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={courseFilter}
                    onChange={(e) => setCourseFilter(e.target.value)}
                    className="pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All Courses</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.courseName}</option>
                    ))}
                  </select>
                </div>
                <div className="relative flex-grow sm:w-36">
                  <FontAwesomeIcon icon={faFilter} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    className="pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All Subjects</option>
                    {subjects.map(subject => (
                      <option key={subject.SubId} value={subject.SubId}>{subject.Name}</option>
                    ))}
                  </select>
                </div>
                <div className="relative flex-grow sm:w-36">
                  <FontAwesomeIcon icon={faFilter} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={publicationFilter}
                    onChange={(e) => setPublicationFilter(e.target.value)}
                    className="pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All Publications</option>
                    {publications.map(pub => (
                      <option key={pub.PubId} value={pub.PubId}>{pub.Name}</option>
                    ))}
                  </select>
                </div>
                <div className="relative flex-grow sm:w-36">
                  <FontAwesomeIcon icon={faFilter} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    value={availableCopiesFilter}
                    onChange={(e) => setAvailableCopiesFilter(e.target.value)}
                    placeholder="Min Available Copies"
                    className="pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  resetForm();
                  setIsModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1.5 px-3 rounded flex items-center gap-1"
              >
                <FontAwesomeIcon icon={faPlus} size="xs" /> Add Book
              </button>
            </div>

            {isModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50">
                <div ref={modalRef} className="bg-white rounded-lg shadow-md p-4 w-full max-w-lg">
                  <h3 className="text-lg font-semibold mb-3">{editingId ? 'Edit Book' : 'Add Book'}</h3>
                  <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="isbn" className="block text-sm font-medium text-gray-700">ISBN Number</label>
                      <input
                        id="isbn"
                        type="text"
                        value={formData.IsbnNumber}
                        onChange={(e) => setFormData({ ...formData, IsbnNumber: e.target.value })}
                        placeholder="Enter ISBN Number"
                        className={`p-2 text-sm border rounded w-full ${errors.IsbnNumber ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors.IsbnNumber && <p className="text-red-500 text-xs mt-1">{errors.IsbnNumber}</p>}
                    </div>
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                      <input
                        id="title"
                        type="text"
                        value={formData.Title}
                        onChange={(e) => setFormData({ ...formData, Title: e.target.value })}
                        placeholder="Enter Title"
                        className={`p-2 text-sm border rounded w-full ${errors.Title ? 'border-red-500' : 'border-gray-300'}`}
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
                        className="p-2 text-sm border border-gray-300 rounded w-full"
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
                        className={`p-2 text-sm border rounded w-full ${errors.Price ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors.Price && <p className="text-red-500 text-xs mt-1">{errors.Price}</p>}
                    </div>
                    <div>
                      <label htmlFor="course" className="block text-sm font-medium text-gray-700">Course</label>
                      <select
                        id="course"
                        value={formData.CourseId}
                        onChange={(e) => setFormData({ ...formData, CourseId: e.target.value })}
                        className="p-2 text-sm border border-gray-300 rounded w-full"
                      >
                        <option value="">Select Course</option>
                        {courses.map(course => (
                          <option key={course.id} value={course.id}>{course.courseName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Subject</label>
                      <select
                        id="subject"
                        value={formData.SubjectId}
                        onChange={(e) => setFormData({ ...formData, SubjectId: e.target.value })}
                        className="p-2 text-sm border border-gray-300 rounded w-full"
                      >
                        <option value="">Select Subject</option>
                        {subjects.map(subject => (
                          <option key={subject.SubId} value={subject.SubId}>{subject.Name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="publication" className="block text-sm font-medium text-gray-700">Publication</label>
                      <select
                        id="publication"
                        value={formData.PublicationId}
                        onChange={(e) => setFormData({ ...formData, PublicationId: e.target.value })}
                        className="p-2 text-sm border border-gray-300 rounded w-full"
                      >
                        <option value="">Select Publication</option>
                        {publications.map(pub => (
                          <option key={pub.PubId} value={pub.PubId}>{pub.Name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="copies" className="block text-sm font-medium text-gray-700">Total Copies</label>
                      <input
                        id="copies"
                        type="number"
                        value={formData.TotalCopies}
                        onChange={(e) => setFormData({ ...formData, TotalCopies: e.target.value })}
                        placeholder="Enter Total Copies"
                        className={`p-2 text-sm border rounded w-full ${errors.TotalCopies ? 'border-red-500' : 'border-gray-300'}`}
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
                        className="p-2 text-sm border border-gray-300 rounded w-full"
                      />
                    </div>
                    <div>
                      <label htmlFor="language" className="block text-sm font-medium text-gray-700">Language</label>
                      <select
                        id="language"
                        value={formData.Language}
                        onChange={(e) => setFormData({ ...formData, Language: e.target.value })}
                        className="p-2 text-sm border border-gray-300 rounded w-full"
                      >
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
                        className={`p-2 text-sm border rounded w-full ${errors.PublishedYear ? 'border-red-500' : 'border-gray-300'}`}
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
                        className="p-2 text-sm border border-gray-300 rounded w-full"
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <label htmlFor="photo" className="block text-sm font-medium text-gray-700">Book Photo</label>
                      <input
                        id="photo"
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={(e) => setFormData({ ...formData, BookPhoto: e.target.files?.[0] || null })}
                        className="p-2 text-sm border border-gray-300 rounded w-full"
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <label htmlFor="details" className="block text-sm font-medium text-gray-700">Details</label>
                      <textarea
                        id="details"
                        value={formData.Details}
                        onChange={(e) => setFormData({ ...formData, Details: e.target.value })}
                        placeholder="Enter Details"
                        className="p-2 text-sm border border-gray-300 rounded w-full"
                        rows={4}
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="text-sm bg-gray-200 text-gray-800 py-1.5 px-3 rounded hover:bg-gray-300 flex items-center gap-1"
                      >
                        <FontAwesomeIcon icon={faArrowLeft} size="xs" /> Cancel
                      </button>
                      <button
                        type="submit"
                        className="text-sm bg-blue-600 text-white py-1.5 px-3 rounded hover:bg-blue-700 flex items-center gap-1"
                      >
                        <FontAwesomeIcon icon={editingId ? faEdit : faPlus} size="xs" />
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
                  <h3 className="text-lg font-semibold mb-2">Confirm Action</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {confirmAction === 'delete' ? 'Delete this book?' : confirmStatus ? 'Deactivate this book?' : 'Activate this book?'}
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsConfirmModalOpen(false)}
                      className="text-sm bg-gray-200 text-gray-800 py-1.5 px-3 rounded hover:bg-gray-300 flex items-center gap-1"
                    >
                      <FontAwesomeIcon icon={faArrowLeft} size="xs" /> Cancel
                    </button>
                    <button
                      onClick={confirmAction === 'delete' ? handleDelete : handleToggleActive}
                      className={`text-sm text-white py-1.5 px-3 rounded flex items-center gap-1 ${
                        confirmAction === 'delete' ? 'bg-red-600 hover:bg-red-700' : confirmStatus ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      <FontAwesomeIcon icon={confirmAction === 'delete' ? faTrash : confirmStatus ? faEyeSlash : faEye} size="xs" />
                      {confirmAction === 'delete' ? 'Delete' : confirmStatus ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ISBN</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Publication</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Copies</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableLoading ? (
                    <tr>
                      <td colSpan={12} className="px-3 py-2 text-center text-sm text-gray-600">
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-500" size="sm" /> Loading...
                      </td>
                    </tr>
                  ) : books.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-3 py-2 text-center text-sm text-gray-500">
                        No books found
                      </td>
                    </tr>
                  ) : (
                    books.map(book => (
                      <tr key={book.BookId} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap text-sm">{book.BookId}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          {book.BookPhoto ? (
                            <img src={book.BookPhoto} alt={book.Title} className="h-12 w-12 object-cover rounded" />
                          ) : '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">{book.Title}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">{book.IsbnNumber}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">{book.Author || '-'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">{book.courseName || '-'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">{book.SubjectName || '-'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">{book.PublicationName || '-'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">{book.Price ? `$${book.Price.toFixed(2)}` : '-'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">{book.AvailableCopies}/{book.TotalCopies}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full ${book.IsActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {book.IsActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(book)}
                              className={`text-blue-600 hover:text-blue-800 p-1 ${!book.IsActive ? 'cursor-not-allowed opacity-60' : ''}`}
                              title={book.IsActive ? 'Edit' : 'Please activate to edit'}
                              disabled={!book.IsActive}
                            >
                              <FontAwesomeIcon icon={faEdit} size="sm" />
                            </button>
                            <button
                              onClick={() => openConfirmModal('delete', book.BookId)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Delete"
                            >
                              <FontAwesomeIcon icon={faTrash} size="sm" />
                            </button>
                            <button
                              onClick={() => openConfirmModal('toggle', book.BookId, book.IsActive)}
                              className={`p-1 ${book.IsActive ? 'text-amber-600 hover:text-amber-800' : 'text-green-600 hover:text-green-800'}`}
                              title={book.IsActive ? 'Deactivate' : 'Activate'}
                            >
                              <FontAwesomeIcon icon={book.IsActive ? faEyeSlash : faEye} size="sm" />
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