'use client';
import { useUser } from '@/app/hooks/useUser';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'react-toastify';
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
  faToggleOn, 
  faRotateLeft, 
  faExpand, 
  faSync, 
  faTimes as faDelete,
  faChevronLeft,
  faChevronRight,
  faAnglesLeft,
  faAnglesRight
} from '@fortawesome/free-solid-svg-icons';
import { Book } from '@/types';

interface Course {
  id: number;
  courseName: string;
}

interface Subject {
  SubId: number;
  Name: string;
}

interface Publication {
  PubId: number;
  Name: string;
}

// 🔥 New BookImage Component with Error Handling
// 🔥 Updated BookImage Component with proper typing
const BookImage = ({ 
  src, 
  alt, 
  className, 
  fallback = "📚", 
  onClick = null 
}: {
  src?: string;
  alt: string;
  className: string;
  fallback?: React.ReactNode; // ✅ Changed from string to React.ReactNode
  onClick?: (() => void) | null;
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleLoad = () => setIsLoading(false);
  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  if (hasError || !src) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        {typeof fallback === 'string' ? (
          <span className="text-gray-500 text-xs">{fallback}</span>
        ) : (
          fallback
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-gray-400" size="xs" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        onClick={onClick}
        className={`${className} ${isLoading ? 'hidden' : 'block'}`}
      />
    </div>
  );
};

const BooksPage = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [formData, setFormData] = useState({
    IsbnNumber: '',
    Title: '',
    Author: '',
    Details: '',
    CourseId: '',
    Price: '',
    SubjectId: '',
    PublicationId: '',
    TotalCopies: '1',
    Edition: '',
    Language: '',
    PublishedYear: '',
    BookPhoto: null as File | null,
    Barcode: '',
    AccessionNumber: '',
    Source: ''
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isDeleteImageConfirmOpen, setIsDeleteImageConfirmOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{src: string, title: string} | null>(null);
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
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [showSubjectInput, setShowSubjectInput] = useState(false);
  const [showPublicationInput, setShowPublicationInput] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [publicationSearch, setPublicationSearch] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const user = useUser();
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmModalRef = useRef<HTMLDivElement>(null);
  const imageModalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, courseFilter, subjectFilter, publicationFilter, availableCopiesFilter, itemsPerPage]);

  const resetFilter = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCourseFilter('');
    setSubjectFilter('');
    setPublicationFilter('');
    setAvailableCopiesFilter('');
    setCurrentPage(1);
  };

  // 🔥 Enhanced handleImageClick with error checking
  const handleImageClick = (imageSrc: string, bookTitle: string) => {
    const img = new Image();
    img.onload = () => {
      setSelectedImage({src: imageSrc, title: bookTitle});
      setIsImageModalOpen(true);
    };
    img.onerror = () => {
      toast.error(`Image not found for "${bookTitle}"`);
    };
    img.src = imageSrc;
  };

  const closeImageModal = () => {
    setIsImageModalOpen(false);
    setSelectedImage(null);
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [searchTerm, statusFilter, courseFilter, subjectFilter, publicationFilter, availableCopiesFilter]);

  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isImageModalOpen) {
          closeImageModal();
        }
      }
    };

    if (isImageModalOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'auto';
    };
  }, [isImageModalOpen]);

  const fetchInitialData = async () => {
    try {
      const [courseRes, subjectRes, publicationRes] = await Promise.all([
        axios.get('/api/course').catch(() => ({data: []})),
        axios.get('/api/subject').catch(() => ({data: []})),
        axios.get('/api/publication').catch(() => ({data: []})),
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
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.IsbnNumber) {
      newErrors.IsbnNumber = 'ISBN is required';
    }
    
    if (!formData.Title) {
      newErrors.Title = 'Title is required';
    }
    
    if (!formData.CourseId) {
      newErrors.CourseId = 'Course is required';
    }
    
    if (!formData.SubjectId) {
      newErrors.SubjectId = 'Subject is required';
    }
    
    if (!formData.PublicationId) {
      newErrors.PublicationId = 'Publication is required';
    }

    if (formData.Price && isNaN(parseFloat(formData.Price))) {
      newErrors.Price = 'Invalid price format';
    }

    if (formData.TotalCopies && isNaN(parseInt(formData.TotalCopies))) {
      newErrors.TotalCopies = 'Invalid number';
    }

    if (formData.PublishedYear && isNaN(parseInt(formData.PublishedYear))) {
      newErrors.PublishedYear = 'Invalid year';
    }
    
      if (formData.BookPhoto) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(formData.BookPhoto.type)) {
      newErrors.BookPhoto = 'Only JPEG, PNG, and GIF images are allowed';
    } else if (formData.BookPhoto.size > 5 * 1024 * 1024) {
      newErrors.BookPhoto = 'File size must be less than 5MB';
    }
  }

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
          } else {
            form.append(key, value as string);
          }
        }
      });

      if (!editingId && user?.name) {
        form.append('CreatedBy', user.name);
      } else if (editingId && user?.name) {
        form.append('ModifiedBy', user.name);
      }

      if (editingId) {
        form.append('BookId', editingId.toString());
      }

      const url = '/api/book';
      const method = editingId ? 'put' : 'post';
      
      const res = await axios({
        method,
        url,
        data: form,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
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
      Language: book.Language || '',
      PublishedYear: book.PublishedYear?.toString() || '',
      BookPhoto: null,
      Barcode: book.Barcode || '',
      AccessionNumber: book.AccessionNumber || '',
      Source: book.Source || ''
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
        ModifiedBy: user?.name || 'Admin',
      });
      toast.success(`Book ${confirmStatus ? 'deactivated' : 'activated'}`);
      setIsConfirmModalOpen(false);
      fetchBooks();
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleDeleteImage = async () => {
    if (!editingId) return;
    try {
      await axios.patch('/api/book?action=delete-image', {
        BookId: editingId,
        ModifiedBy: user?.name || 'Admin',
      });
      toast.success('Image deleted successfully');
      setIsDeleteImageConfirmOpen(false);
      
      setBooks(books.map(b => 
        b.BookId === editingId ? {...b, BookPhoto: null} : b
      ));
    } catch (error) {
      toast.error('Failed to delete image');
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
      IsbnNumber: '',
      Title: '',
      Author: '',
      Details: '',
      CourseId: '',
      Price: '',
      SubjectId: '',
      PublicationId: '',
      TotalCopies: '1',
      Edition: '',
      Language: '',
      PublishedYear: '',
      BookPhoto: null,
      Barcode: '',
      AccessionNumber: '',
      Source: ''
    });
    setEditingId(null);
    setSubjectSearch('');
    setPublicationSearch('');
    setShowSubjectInput(false);
    setShowPublicationInput(false);
    setIsModalOpen(false);
    setErrors({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  const baseUrl  = 'https://library.jkipm.in';
  // const baseUrl='http://localhost:3001';
  
  const handleSubjectChange = (subId: string) => {
    setFormData({...formData, SubjectId: subId});
    setSubjectSearch(subjects.find(s => s.SubId.toString() === subId)?.Name || '');
    setShowSubjectInput(false);
  };

  const handlePublicationChange = (pubId: string) => {
    setFormData({...formData, PublicationId: pubId});
    setPublicationSearch(publications.find(p => p.PubId.toString() === pubId)?.Name || '');
    setShowPublicationInput(false);
  };

  const filteredBooks = books.filter(book => book.TotalCopies > 0);

  const totalItems = filteredBooks.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBooks = filteredBooks.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let end = Math.min(totalPages, start + maxVisiblePages - 1);
    
    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  return (
    <div className="">
      <div className="bg-white rounded-lg shadow-sm">
        {initialLoading ? (
          <div className="flex items-center justify-center h-[96vh]">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin w-8 h-8 text-blue-500 text-4xl" />
          </div>
        ) : (
          <>
            {/* Filters Section */}
            <div className="flex flex-wrap items-center gap-2 mb-2 bg-gray-50 p-2 rounded-lg shadow-sm">
              <div className="text-blue-700 text-sm   min w- 32 font-medium">
                Total Books: <span className="font-semibold">{totalItems}</span>
              </div>

              <div className="relative flex-1 max-w-xs">
                <FontAwesomeIcon icon={faSearch} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by title, ISBN, or accession number..."
                  className="pl-8 pr-2 py-2 text-sm border border-gray-300 rounded-md w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                  title='Search by title, ISBN, or accession number...'
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Courses</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.courseName}</option>
                ))}
              </select>

              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Subjects</option>
                {subjects.map(subject => (
                  <option key={subject.SubId} value={subject.SubId}>{subject.Name}</option>
                ))}
              </select>

              <select
                value={publicationFilter}
                onChange={(e) => setPublicationFilter(e.target.value)}
                className="px-2 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Publications</option>
                {publications.map(pub => (
                  <option key={pub.PubId} value={pub.PubId}>{pub.Name}</option>
                ))}
              </select>

              <input
                type="number"
                value={availableCopiesFilter}
                onChange={(e) => setAvailableCopiesFilter(e.target.value)}
                placeholder="Min Copies"
                className="px-2 py-2 text-sm border w-20 border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-xs"
                title='Filter by minimum available copies'
              />

              <div className="flex items-center gap-1">
                <span className="text-gray-700 text-sm">Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={75}>75</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={resetFilter}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium py-2 px-3 rounded-md flex items-center gap-1 shadow-sm transition-colors duration-200 whitespace-nowrap"
                >
                  <FontAwesomeIcon icon={faRotateLeft} size="xs" /> Reset Filter
                </button>
                <button
                  onClick={() => {
                    resetForm();
                    setIsModalOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-md flex items-center gap-1 shadow-sm transition-colors duration-200 whitespace-nowrap"
                >
                  <FontAwesomeIcon icon={faPlus} size="xs" /> Add Book
                </button>
              </div>
            </div>

            {/* 🔥 Updated Image Preview Modal */}
            {isImageModalOpen && selectedImage && (
              <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-[9999]" onClick={closeImageModal}>
                <div ref={imageModalRef} className="bg-white rounded-xl shadow-2xl max-w-5xl max-h-[95vh] w-full flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <h3 className="text-lg font-bold text-gray-800 truncate pr-4 flex items-center gap-2">
                      <FontAwesomeIcon icon={faExpand} className="text-blue-600" />
                      {selectedImage.title}
                    </h3>
                    <button
                      onClick={closeImageModal}
                      className="text-gray-500 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-all duration-200 flex-shrink-0"
                      title="Close Preview (Press Esc)"
                    >
                      <FontAwesomeIcon icon={faTimes} size="lg" />
                    </button>
                  </div>
                  <div className="flex-1 p-4 flex items-center justify-center bg-gray-900 overflow-hidden">
                    <BookImage
                      src={selectedImage.src}
                      alt={selectedImage.title}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                      fallback={
                        <div className="text-white text-center">
                          <div className="text-6xl mb-4">📖</div>
                          <div className="text-lg">Image not available</div>
                          <div className="text-sm opacity-75">{selectedImage.title}</div>
                        </div>
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Add/Edit Modal */}
            {isModalOpen && (
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-3 z-50">
                <div ref={modalRef} className="bg-white rounded-lg shadow-md p-4 w-full max-w-4xl max-h-[95vh] overflow-y-auto">
                  <h3 className="text-lg font-semibold bg-blue-600 p-2 rounded text-white mb-3">
                    {editingId ? 'Edit Book' : 'Add Book'}
                  </h3>
                  <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* ISBN Number */}
                    <div>
                      <label htmlFor="isbn" className="block text-sm font-medium text-gray-700">
                        ISBN Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="isbn"
                        type="text"
                        value={formData.IsbnNumber}
                        onChange={(e) => setFormData({...formData, IsbnNumber: e.target.value})}
                        placeholder="Enter ISBN Number"
                        className={`mt-1 p-1.5 text-sm border rounded-lg w-full ${errors.IsbnNumber ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors.IsbnNumber && <p className="text-red-500 text-xs mt-1">{errors.IsbnNumber}</p>}
                    </div>

                    {/* Title */}
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="title"
                        type="text"
                        value={formData.Title}
                        onChange={(e) => setFormData({...formData, Title: e.target.value})}
                        placeholder="Enter Title"
                        className={`mt-1 p-1.5 text-sm uppercase border rounded-lg w-full ${errors.Title ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors.Title && <p className="text-red-500 text-xs mt-1">{errors.Title}</p>}
                    </div>

                    {/* Accession Number */}
                    <div>
                      <label htmlFor="accessionNumber" className="block text-sm font-medium text-gray-700">Accession Number</label>
                      <input
                        id="accessionNumber"
                        type="text"
                        value={formData.AccessionNumber}
                        onChange={(e) => setFormData({...formData, AccessionNumber: e.target.value})}
                        placeholder="Enter Accession Number"
                        className="mt-1 p-1.5 text-sm border border-gray-300 rounded-lg w-full"
                      />
                    </div>

                    {/* Author */}
                    <div>
                      <label htmlFor="author" className="block text-sm font-medium text-gray-700">Author</label>
                      <input
                        id="author"
                        type="text"
                        value={formData.Author}
                        onChange={(e) => setFormData({...formData, Author: e.target.value})}
                        placeholder="Enter Author"
                        className="mt-1 p-1.5 text-sm border border-gray-300 rounded-lg w-full"
                      />
                    </div>

                    {/* Source */}
                    <div>
                      <label htmlFor="source" className="block text-sm font-medium text-gray-700">Source</label>
                      <input
                        id="source"
                        type="text"
                        value={formData.Source}
                        onChange={(e) => setFormData({...formData, Source: e.target.value})}
                        placeholder="Enter Source (e.g., Purchased, Donated)"
                        className="mt-1 p-1.5 text-sm border border-gray-300 rounded-lg w-full"
                      />
                    </div>

                    {/* Price */}
                    <div>
                      <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price</label>
                      <input
                        id="price"
                        type="number"
                        value={formData.Price}
                        onChange={(e) => setFormData({...formData, Price: e.target.value})}
                        placeholder="Enter Price"
                        className={`mt-1 p-1.5 text-sm border rounded-lg w-full ${errors.Price ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors.Price && <p className="text-red-500 text-xs mt-1">{errors.Price}</p>}
                    </div>

                    {/* Course */}
                    <div>
                      <label htmlFor="course" className="block text-sm font-medium text-gray-700">
                        Course <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="course"
                        value={formData.CourseId}
                        onChange={(e) => setFormData({...formData, CourseId: e.target.value})}
                        className={`mt-1 p-1.5 text-sm border rounded-lg w-full ${errors.CourseId ? 'border-red-500' : 'border-gray-300'}`}
                      >
                        <option value="">Select Course</option>
                        {courses.map(course => (
                          <option key={course.id} value={course.id}>{course.courseName}</option>
                        ))}
                      </select>
                      {errors.CourseId && <p className="text-red-500 text-xs mt-1">{errors.CourseId}</p>}
                    </div>

                    {/* Subject */}
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                        Subject <span className="text-red-500">*</span>
                      </label>
                      <div onClick={() => setShowSubjectInput(!showSubjectInput)} className="w-full p-1 border rounded text-sm bg-white flex justify-between items-center cursor-pointer">
                        <input
                          type="text"
                          placeholder="Search Subject"
                          className="w-full p-0 border-0 text-sm focus:outline-none cursor-pointer"
                          value={subjectSearch}
                          onChange={(e) => setSubjectSearch(e.target.value)}
                          onBlur={() => setTimeout(() => setShowSubjectInput, 200)}
                        />
                        {subjectSearch && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSubjectSearch(''); setFormData({...formData, SubjectId: ''}); }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FontAwesomeIcon icon={faTimesCircle} size="xs" />
                          </button>
                        )}
                      </div>
                      {showSubjectInput && (
                        <div className="relative">
                          <ul className="absolute w-full bg-white border rounded mt-1 max-h-40 overflow-y-auto z-10 shadow-lg">
                            <li className="p-1 bg-gray-100 font-medium">Select Subject</li>
                            {subjects
                              .filter(subject => subject.Name.toLowerCase().includes(subjectSearch.toLowerCase()))
                              .map(subject => (
                                <li
                                  key={subject.SubId}
                                  className="p-1 hover:bg-gray-100 cursor-pointer text-sm"
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

                    {/* Publication */}
                    <div>
                      <label htmlFor="publication" className="block text-sm font-medium text-gray-700">
                        Publication <span className="text-red-500">*</span>
                      </label>
                      <div onClick={() => setShowPublicationInput(!showPublicationInput)} className="w-full p-1 border rounded text-sm bg-white flex justify-between items-center cursor-pointer">
                        <input
                          type="text"
                          placeholder="Search Publication"
                          className="w-full p-0 border-0 text-sm focus:outline-none cursor-pointer"
                          value={publicationSearch}
                          onChange={(e) => setPublicationSearch(e.target.value)}
                          onBlur={() => setTimeout(() => setShowPublicationInput(false), 200)}
                        />
                        {publicationSearch && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setPublicationSearch(''); setFormData({...formData, PublicationId: ''}); }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FontAwesomeIcon icon={faTimesCircle} size="xs" />
                          </button>
                        )}
                      </div>
                      {showPublicationInput && (
                        <div className="relative">
                          <ul className="absolute w-full bg-white border rounded mt-1 max-h-40 overflow-y-auto z-10 shadow-lg">
                            <li className="p-1 bg-gray-100 font-medium">Select Publication</li>
                            {publications
                              .filter(pub => pub.Name.toLowerCase().includes(publicationSearch.toLowerCase()))
                              .map(pub => (
                                <li
                                  key={pub.PubId}
                                  className="p-1 hover:bg-gray-100 cursor-pointer text-sm"
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

                    {/* Total Copies */}
                    <div>
                      <label htmlFor="copies" className="block text-sm font-medium text-gray-700">Total Copies</label>
                      <input
                        id="copies"
                        type="number"
                        value={formData.TotalCopies}
                        onChange={(e) => setFormData({...formData, TotalCopies: e.target.value})}
                        placeholder="Enter Total Copies"
                        className={`mt-1 p-1.5 text-sm border rounded-lg w-full ${errors.TotalCopies ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors.TotalCopies && <p className="text-red-500 text-xs mt-1">{errors.TotalCopies}</p>}
                    </div>

                    {/* Edition */}
                    <div>
                      <label htmlFor="edition" className="block text-sm font-medium text-gray-700">Edition</label>
                      <input
                        id="edition"
                        type="text"
                        value={formData.Edition}
                        onChange={(e) => setFormData({...formData, Edition: e.target.value})}
                        placeholder="Enter Edition"
                        className="mt-1 p-1.5 text-sm border border-gray-300 rounded-lg w-full"
                      />
                    </div>

                    {/* Language */}
                    <div>
                      <label htmlFor="language" className="block text-sm font-medium text-gray-700">Language</label>
                      <select
                        id="language"
                        value={formData.Language}
                        onChange={(e) => setFormData({...formData, Language: e.target.value})}
                        className="mt-1 p-1.5 text-sm border border-gray-300 rounded-lg w-full"
                      >
                        <option value="">-- Select Language --</option>
                        <option value="English">English</option>
                        <option value="Hindi">Hindi</option>
                      </select>
                    </div>

                    {/* Published Year */}
                    <div>
                      <label htmlFor="year" className="block text-sm font-medium text-gray-700">Published Year</label>
                      <input
                        id="year"
                        type="number"
                        value={formData.PublishedYear}
                        onChange={(e) => setFormData({...formData, PublishedYear: e.target.value})}
                        placeholder="Enter Published Year"
                        className={`mt-1 p-1.5 text-sm border rounded-lg w-full ${errors.PublishedYear ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {errors.PublishedYear && <p className="text-red-500 text-xs mt-1">{errors.PublishedYear}</p>}
                    </div>

                    {/* Barcode */}
                    <div>
                      <label htmlFor="barcode" className="block text-sm font-medium text-gray-700">Barcode</label>
                      <input
                        id="barcode"
                        type="text"
                        value={formData.Barcode}
                        onChange={(e) => setFormData({...formData, Barcode: e.target.value})}
                        placeholder="Enter Barcode"
                        className="mt-1 p-1.5 text-sm border border-gray-300 rounded-lg w-full"
                      />
                    </div>

                    {/* 🔥 Updated Book Photo Section with Error Handling */}
                    <div className="col-span-1 md:col-span-3">
                      <label htmlFor="photo" className="block text-sm font-medium text-gray-700">
                        Book Photo
                      </label>
          
          {/* Show current photo if editing */}
          {editingId && books.find(b => b.BookId === editingId)?.BookPhoto && (
            <div className="relative mb-2">
              <BookImage
                src={`${baseUrl}${books.find(b => b.BookId === editingId)?.BookPhoto}`}
                alt="Current Book"
                className="h-20 w-20 object-cover rounded-lg mb-1"
                fallback="📖 Current"
              />
              <p className="text-xs text-gray-600">Current Photo</p>
              <button
                type="button"
                onClick={() => setIsDeleteImageConfirmOpen(true)}
                className="absolute -top-3.5 left-16 bg-red-500 text-white rounded-full p-1 text-xs hover:bg-red-600"
                title="Delete Image"
              >
                <FontAwesomeIcon icon={faDelete} size="xs" className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* File Input with Error Styling */}
          <input
            id="photo"
            type="file"
            accept="image/jpeg,image/png,image/gif"
            ref={fileInputRef}
            onChange={(e) => setFormData({...formData, BookPhoto: e.target.files?.[0] || null})}
            className={`mt-1 p-1.5 text-sm border rounded-lg w-full ${
              errors.BookPhoto ? 'border-red-500' : 'border-gray-300'
            }`}
            title="Accepted formats: .jpg, .jpeg, .png, .gif | Max size: 5MB"
          />
          
          {/* Error Message Display */}
          {errors.BookPhoto && (
            <p className="text-red-500 text-xs mt-1">{errors.BookPhoto}</p>
          )}
          
          {/* Helper Text */}
          <p className="text-xs text-gray-500 mt-1">
            Allowed: JPEG, PNG, GIF (Max: 5MB)
          </p>
        </div>

                    {/* Details */}
                    <div className="col-span-1 md:col-span-3">
                      <label htmlFor="details" className="block text-sm font-medium text-gray-700">Details</label>
                      <textarea
                        id="details"
                        value={formData.Details}
                        onChange={(e) => setFormData({...formData, Details: e.target.value})}
                        placeholder="Enter Details"
                        className="mt-1 p-1.5 text-sm border border-gray-300 rounded-lg w-full"
                        rows={3}
                      />
                    </div>

                    {/* Form Actions */}
                    <div className="col-span-1 md:col-span-3 flex justify-end gap-3 mt-3">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="bg-gray-200 text-gray-800 hover:bg-gray-300 text-sm font-medium py-1.5 px-3 rounded-lg flex items-center gap-1"
                      >
                        <FontAwesomeIcon icon={faTimes} size="sm" /> Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1.5 px-3 rounded-lg flex items-center gap-1"
                      >
                        <FontAwesomeIcon icon={editingId ? faEdit : faPlus} size="sm" />
                        {editingId ? 'Update' : 'Add'} Book
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Delete Image Confirmation Modal */}
            {isDeleteImageConfirmOpen && (
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-3 z-50">
                <div className="bg-white rounded-lg shadow-md p-4 w-full max-w-xs">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Confirm Delete Image</h3>
                  <p className="text-sm text-gray-600 mb-3">Are you sure you want to delete this image?</p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsDeleteImageConfirmOpen(false)}
                      className="bg-gray-200 text-gray-800 hover:bg-gray-300 text-sm font-medium py-2 px-4 rounded-lg flex items-center gap-1"
                    >
                      <FontAwesomeIcon icon={faTimes} size="sm" /> Cancel
                    </button>
                    <button
                      onClick={handleDeleteImage}
                      className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-4 rounded-lg flex items-center gap-1"
                    >
                      <FontAwesomeIcon icon={faTrash} size="sm" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Confirm Modal */}
            {isConfirmModalOpen && (
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-3 z-50">
                <div ref={confirmModalRef} className="bg-white rounded-lg shadow-md p-4 w-full max-w-xs">
                  <h3 className="text-lg font-semibold p-2 rounded bg-blue-400 text-gray-800 mb-2">Confirm Action</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {confirmAction === 'delete' ? 'Delete this book?' : confirmStatus ? 'Deactivate this book?' : 'Activate this book?'}
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsConfirmModalOpen(false)}
                      className="bg-gray-200 text-gray-800 hover:bg-gray-300 text-sm font-medium py-2 px-4 rounded-lg flex items-center gap-1"
                    >
                      <FontAwesomeIcon icon={faTimes} size="sm" /> Cancel
                    </button>
                    <button
                      onClick={confirmAction === 'delete' ? handleDelete : handleToggleActive}
                      className={`text-white text-sm font-medium py-2 px-4 rounded-lg flex items-center gap-1 ${
                        confirmAction === 'delete' ? 'bg-red-600 hover:bg-red-700' : confirmStatus ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      <FontAwesomeIcon icon={confirmAction === 'delete' ? faTrash : confirmStatus ? faToggleOff : faToggleOn} size="sm" />
                      {confirmAction === 'delete' ? 'Delete' : confirmStatus ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 🔥 Updated Books Table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200 mt-2">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Accession No.</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ISBN</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Publication</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Copies</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableLoading ? (
                    <tr>
                      <td colSpan={14} className="px-3 py-1.5 text-center text-sm text-gray-600">
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-500" size="sm" /> Loading...
                      </td>
                    </tr>
                  ) : currentBooks.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="px-3 py-1.5 text-center text-sm text-gray-500">
                        No books found
                      </td>
                    </tr>
                  ) : (
                    currentBooks.map((book, index) => (
                      <tr key={book.BookId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-1.5 whitespace-nowrap text-sm">{startIndex + index + 1}</td>
                        
                        {/* 🔥 Updated Photo Column */}
                        <td className="px-3 py-1.5 whitespace-nowrap text-sm">
                          {book.BookPhoto ? (
                            <div className="relative group">
                              <button
                                type="button"
                                onClick={() => handleImageClick(`${baseUrl}${book.BookPhoto}`, book.Title)}
                                className="block focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
                                title="Click to preview image"
                              >
                                <BookImage
                                  src={`${baseUrl}${book.BookPhoto}`}
                                  alt={book.Title}
                                  className="h-10 w-10 object-cover rounded-lg cursor-pointer hover:shadow-md transition-all duration-300 hover:scale-105 border border-transparent hover:border-blue-300"
                                  fallback="📖"
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black bg-opacity-50 rounded-lg">
                                  <FontAwesomeIcon icon={faExpand} className="text-white text-xs drop-shadow-lg" />
                                </div>
                              </button>
                            </div>
                          ) : (
                            <div className="h-10 w-10 bg-gray-200 rounded-lg flex items-center justify-center">
                              <span className="text-gray-400 text-xs">📚</span>
                            </div>
                          )}
                        </td>
                        
                        <td className="px-3 py-1.5 whitespace-nowrap uppercase text-sm font-medium">{book.Title}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap text-sm">{book.AccessionNumber || '-'}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap text-sm">{book.IsbnNumber}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap text-sm">{book.Author || '-'}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap text-sm">{book.courseName || '-'}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap text-sm">{book.SubjectName || '-'}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap text-sm">{book.PublicationName || '-'}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap text-sm">{book.Price ? book.Price.toFixed(2) : '-'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm leading-tight">
                          <div className="text-green-600">Total: {book.TotalCopies}</div>
                          <div className="text-blue-600">Available: {book.AvailableCopies}</div>
                          <div className="text-red-600">Issued: {book.TotalCopies - book.AvailableCopies}</div>
                        </td>
                        <td className="px-3 py-1.5 whitespace-nowrap text-sm">{book.Source || '-'}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap text-sm">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${book.IsActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {book.IsActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 whitespace-nowrap text-sm">
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEdit(book)}
                              className={`text-blue-600 hover:text-blue-800 p-1 rounded ${!book.IsActive ? 'cursor-not-allowed opacity-60' : ''}`}
                              title={book.IsActive ? 'Edit Book' : 'Please activate to edit'}
                              disabled={!book.IsActive}
                            >
                              <FontAwesomeIcon icon={faEdit} size="sm" />
                            </button>
                            <button
                              onClick={() => openConfirmModal('delete', book.BookId)}
                              className="text-red-600 hover:text-red-800 p-1 rounded"
                              title="Delete Book"
                            >
                              <FontAwesomeIcon icon={faTrash} size="sm" />
                            </button>
                            <button
                              onClick={() => openConfirmModal('toggle', book.BookId, book.IsActive)}
                              className={`p-1 rounded ${book.IsActive ? 'text-blue-600 hover:text-blue-800' : 'text-green-600 hover:text-green-800'}`}
                              title={book.IsActive ? 'Deactivate Book' : 'Activate Book'}
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(endIndex, totalItems)}</span> of{' '}
                  <span className="font-medium">{totalItems}</span> books
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="First Page"
                  >
                    <FontAwesomeIcon icon={faAnglesLeft} size="sm" />
                  </button>

                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Previous Page"
                  >
                    <FontAwesomeIcon icon={faChevronLeft} size="sm" />
                  </button>

                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`px-3 py-1 text-sm border rounded ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Next Page"
                  >
                    <FontAwesomeIcon icon={faChevronRight} size="sm" />
                  </button>

                  <button
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Last Page"
                  >
                    <FontAwesomeIcon icon={faAnglesRight} size="sm" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BooksPage;
