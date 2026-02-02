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
  faTimesCircle, 
  faTimes, 
  faToggleOff, 
  faToggleOn, 
  faRotateLeft, 
  faExpand, 
  faEye,
  faChevronLeft,
  faChevronRight,
  faAnglesLeft,
  faAnglesRight,
  faBook,
  faFilter,
  faImage,
  faBarcode,
  faMoneyBill,
  faHashtag,
  faGraduationCap,
  faBookOpen,
  faBuilding,
  faLanguage,
  faCalendar,
  faInfoCircle,
  faUserEdit
} from '@fortawesome/free-solid-svg-icons';
import { Book } from '@/types';

interface Course {
  id: number;
  courseName: string;
  collegeName: string;
  collegeId: number;
}

interface Subject {
  SubId: number;
  Name: string;
}

interface Publication {
  PubId: number;
  Name: string;
}

function getCollegeShortName(collegeName = "") {
  if (collegeName.includes('Pharmacy & Management')) return 'JKIPM';
  if (collegeName.includes('Institute Of Pharmacy')) return 'JKIOP';

  return collegeName
    .replace(/&/g, ' ')
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase();
}

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
  fallback?: React.ReactNode;
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
      <div className={`bg-gray-100 flex items-center justify-center ${className}`}>
        {typeof fallback === 'string' ? (
          <span className="text-2xl">{fallback}</span>
        ) : (
          fallback
        )}
      </div>
    );
  }

  return (
    <div className={`relative bg-white ${className}`} onClick={onClick || undefined}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-500" size="sm" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className="w-full h-full object-contain"
        draggable={false}
      />
    </div>
  );
};

const BooksPage = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [colleges, setColleges] = useState<{id: number, collegeName: string}[]>([]);
const [collegeFilter, setCollegeFilter] = useState('');
const [allColleges, setAllColleges] = useState<{id: number, collegeName: string}[]>([]); // ✅ Store all colleges

const [allCourses, setAllCourses] = useState<Course[]>([]); // ✅ Store all courses

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
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewBook, setViewBook] = useState<Book | null>(null);
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
  const [showFilters, setShowFilters] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const user = useUser();
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmModalRef = useRef<HTMLDivElement>(null);
  const imageModalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, courseFilter, subjectFilter, publicationFilter, availableCopiesFilter, itemsPerPage]);



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

  const handleViewBook = (book: Book) => {
    setViewBook(book);
    setIsViewModalOpen(true);
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setViewBook(null);
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

// ✅ KEEP ONLY THIS ONE - collegeFilter bhi included hai
useEffect(() => {
  fetchBooks();
}, [searchTerm, statusFilter, courseFilter, collegeFilter, subjectFilter, publicationFilter, availableCopiesFilter]);

  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isImageModalOpen) closeImageModal();
        if (isViewModalOpen) closeViewModal();
      }
    };

    if (isImageModalOpen || isViewModalOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'auto';
    };
  }, [isImageModalOpen, isViewModalOpen]);

// ✅ Fetch Initial Data
// ✅ Fetch Initial Data
const fetchInitialData = async () => {
  try {
    const [courseRes, collegeRes, subjectRes, publicationRes] = await Promise.all([
      axios.get('/api/course').catch(() => ({data: []})),
      axios.get('/api/college').catch(() => ({data: []})),
      axios.get('/api/subject').catch(() => ({data: []})),
      axios.get('/api/publication').catch(() => ({data: []})),
    ]);
    
    setAllCourses(courseRes.data);
    setCourses(courseRes.data);
    setAllColleges(collegeRes.data);
    setColleges(collegeRes.data);
    setSubjects(subjectRes.data);
    setPublications(publicationRes.data);
  } catch (error) {
    toast.error('Failed to fetch initial data');
  } finally {
    setInitialLoading(false);
  }
};

// ✅ Handle College Change - Filter courses dynamically
const handleCollegeFilterChange = (selectedCollegeId: string) => {
  setCollegeFilter(selectedCollegeId);
  
  if (selectedCollegeId) {
    // Filter courses that belong to selected college
    const filteredCourses = allCourses.filter(
      course => course.collegeId === parseInt(selectedCollegeId)
    );
    setCourses(filteredCourses);
    
    // Reset course filter if current selected course doesn't belong to this college
    if (courseFilter) {
      const courseExists = filteredCourses.find(c => c.id === parseInt(courseFilter));
      if (!courseExists) {
        setCourseFilter('');
      }
    }
  } else {
    // Reset to all courses
    setCourses(allCourses);
  }
};

// ✅ Handle Course Change - Filter colleges dynamically
const handleCourseFilterChange = (selectedCourseId: string) => {
  setCourseFilter(selectedCourseId);
  
  if (selectedCourseId) {
    // Find selected course's college
    const selectedCourse = allCourses.find(c => c.id === parseInt(selectedCourseId));
    
    if (selectedCourse) {
      // Filter colleges that have this course
      const courseName = selectedCourse.courseName;
      const filteredColleges = allColleges.filter(college => {
        return allCourses.some(
          course => course.courseName === courseName && course.collegeId === college.id
        );
      });
      setColleges(filteredColleges);
      
      // Reset college filter if current selected college doesn't have this course
      if (collegeFilter) {
        const collegeExists = filteredColleges.find(col => col.id === parseInt(collegeFilter));
        if (!collegeExists) {
          setCollegeFilter('');
        }
      }
    }
  } else {
    // Reset to all colleges
    setColleges(allColleges);
  }
};

// ✅ Reset Filter
// ✅ Reset Filter - Complete Reset
const resetFilter = () => {
  setSearchTerm('');
  setStatusFilter('all');
  setCourseFilter('');
  setCollegeFilter('');
  setSubjectFilter('');
  setPublicationFilter('');
  setAvailableCopiesFilter('');
  setCurrentPage(1);
  
  // Reset to original data
  setCourses(allCourses);
  setColleges(allColleges);
};

// ✅ Fetch Books
const fetchBooks = async () => {
  setTableLoading(true);
  try {
    const params = {
      search: searchTerm,
      status: statusFilter,
      courseId: courseFilter,
      collegeId: collegeFilter,
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
    
    if (!formData.IsbnNumber) newErrors.IsbnNumber = 'ISBN is required';
    if (!formData.Title) newErrors.Title = 'Title is required';
    if (!formData.CourseId) newErrors.CourseId = 'Course is required';
    if (!formData.SubjectId) newErrors.SubjectId = 'Subject is required';
    if (!formData.PublicationId) newErrors.PublicationId = 'Publication is required';
    if (formData.Price && isNaN(parseFloat(formData.Price))) newErrors.Price = 'Invalid price';
    if (formData.TotalCopies && isNaN(parseInt(formData.TotalCopies))) newErrors.TotalCopies = 'Invalid number';
    if (formData.PublishedYear && isNaN(parseInt(formData.PublishedYear))) newErrors.PublishedYear = 'Invalid year';
    
    if (formData.BookPhoto) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(formData.BookPhoto.type)) {
        newErrors.BookPhoto = 'Only JPEG, PNG, GIF allowed';
      } else if (formData.BookPhoto.size > 5 * 1024 * 1024) {
        newErrors.BookPhoto = 'Max 5MB';
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
      
      await axios({ method, url, data: form, headers: { 'Content-Type': 'multipart/form-data' } });

      toast.success(editingId ? '✅ Updated!' : '✅ Added!');
      resetForm();
      fetchBooks();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error occurred');
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
      toast.success('✅ Deleted!');
      setIsConfirmModalOpen(false);
      fetchBooks();
    } catch (error) {
      toast.error('Error occurred');
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
      toast.success(`✅ ${confirmStatus ? 'Deactivated' : 'Activated'}!`);
      setIsConfirmModalOpen(false);
      fetchBooks();
    } catch (error) {
      toast.error('Error occurred');
    }
  };

  const handleDeleteImage = async () => {
    if (!editingId) return;
    try {
      await axios.patch('/api/book?action=delete-image', {
        BookId: editingId,
        ModifiedBy: user?.name || 'Admin',
      });
      toast.success('✅ Image deleted!');
      setIsDeleteImageConfirmOpen(false);
      
      setBooks(books.map(b => b.BookId === editingId ? {...b, BookPhoto: null} : b));
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
      IsbnNumber: '', Title: '', Author: '', Details: '', CourseId: '', Price: '',
      SubjectId: '', PublicationId: '', TotalCopies: '1', Edition: '', Language: '',
      PublishedYear: '', BookPhoto: null, Barcode: '', AccessionNumber: '', Source: ''
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

  const baseUrl = 'https://library.jkipm.in';
  
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
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
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
    <div className="min-h-screen bg-gray-50 p-1">
      <div className="max-w-[1600px] mx-auto">
        {/* Compact Header */}
   

        {initialLoading ? (
          <div className="flex flex-col items-center justify-center h-[70vh] bg-white rounded-lg shadow-sm">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-500 text-4xl mb-3" />
            <p className="text-gray-600">Loading...</p>
          </div>
        ) : (
          <>
            {/* Compact Search/Filters */}
{/* Ultra Compact - All in One Row */}
<div className="bg-white rounded-lg shadow-sm p-2 mb-2 border border-gray-200">
  <div className="flex flex-wrap items-center gap-2">
    {/* Search */}
    <div className="relative flex-1 min-w-[200px]">
      <FontAwesomeIcon icon={faSearch} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search books..."
        className="pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded-lg w-full focus:outline-none focus:border-blue-500"
      />
    </div>

    {/* Filters - Collapsible */}
    {showFilters && (
      <>
        {/* College */}
        <select
          value={collegeFilter}
          onChange={(e) => handleCollegeFilterChange(e.target.value)}
          className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 min-w-[100px]"
        >
          <option value="">All Colleges</option>
          {colleges.map(college => (
            <option key={college.id} value={college.id} title={college.collegeName}>
              {getCollegeShortName(college.collegeName)}
            </option>
          ))}
        </select>

        {/* Course */}
        <select
          value={courseFilter}
          onChange={(e) => handleCourseFilterChange(e.target.value)}
          className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 min-w-[120px]"
        >
          <option value="">All Courses</option>
          {courses.map(course => (
            <option key={course.id} value={course.id} title={`${course.courseName} - ${course.collegeName}`}>
              {course.courseName} - {getCollegeShortName(course.collegeName)}
            </option>
          ))}
        </select>

        {/* Subject */}
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 min-w-[100px]"
        >
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s.SubId} value={s.SubId}>{s.Name}</option>)}
        </select>

        {/* Publication */}
        <select
          value={publicationFilter}
          onChange={(e) => setPublicationFilter(e.target.value)}
          className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 min-w-[100px]"
        >
          <option value="">All Publications</option>
          {publications.map(p => <option key={p.PubId} value={p.PubId}>{p.Name}</option>)}
        </select>

        {/* Min Copies */}
        <input
          type="number"
          value={availableCopiesFilter}
          onChange={(e) => setAvailableCopiesFilter(e.target.value)}
          placeholder="Min"
          className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 w-16"
        />
      </>
    )}

    {/* Action Buttons */}
    <div className="flex items-center gap-1 ml-auto">
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={`px-2 py-1.5 text-xs font-medium rounded-lg transition-all ${
          showFilters ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        title="Toggle Filters"
      >
        <FontAwesomeIcon icon={faFilter} />
      </button>
      <button
        onClick={resetFilter}
        className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1.5 text-xs font-medium rounded-lg"
        title="Reset"
      >
        <FontAwesomeIcon icon={faRotateLeft} />
      </button>
      <button
        onClick={() => { resetForm(); setIsModalOpen(true); }}
        className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 text-xs font-medium rounded-lg"
        title="Add Book"
      >
       Add Book <FontAwesomeIcon icon={faPlus} />
      </button>
    </div>

    {/* Info Badge */}
    <div className="w-full flex justify-between items-center text-xs text-gray-600 pt-1 border-t border-gray-100">
      <span>
        <span className="font-bold text-blue-600">{startIndex + 1}-{Math.min(endIndex, totalItems)}</span> of{' '}
        <span className="font-bold text-blue-600">{totalItems}</span>
      </span>
      {(courseFilter || collegeFilter || subjectFilter || publicationFilter || availableCopiesFilter || statusFilter !== 'all') && (
        <span className="text-orange-600 font-medium">
          <FontAwesomeIcon icon={faFilter} className="mr-1" />
          Active
        </span>
      )}
    </div>
  </div>
</div>

            {/* Compact Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-bold text-white uppercase">#</th>
                      <th className="px-2 py-2 text-left text-xs font-bold text-white uppercase">Photo</th>
                      <th className="px-2 py-2 text-left text-xs font-bold text-white uppercase">Title</th>
                      <th className="px-2 py-2 text-left text-xs font-bold text-white uppercase">	Accesssion No</th>
                      <th className="px-2 py-2 text-left text-xs font-bold text-white uppercase">Author</th>
                      <th className="px-2 py-2 text-left text-xs font-bold text-white uppercase">Course</th>
                      <th className="px-2 py-2 text-left text-xs font-bold text-white uppercase">Subject</th>
                      <th className="px-2 py-2 text-left text-xs font-bold text-white uppercase">Copies</th>
                      <th className="px-2 py-2 text-left text-xs font-bold text-white uppercase">Status</th>
                      <th className="px-2 py-2 text-left text-xs font-bold text-white uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {tableLoading ? (
                      <tr>
                        <td colSpan={9} className="px-2 py-8 text-center">
                          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-500 text-2xl" />
                        </td>
                      </tr>
                    ) : currentBooks.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-2 py-8 text-center text-gray-500 text-sm">No books found</td>
                      </tr>
                    ) : (
                      currentBooks.map((book, index) => (
                        <tr key={book.BookId} className="hover:bg-blue-50 transition-colors">
                          <td className="px-2 py-2 text-xs font-medium text-gray-900">{startIndex + index + 1}</td>
                          
                          <td className="px-2 py-2">
                            {book.BookPhoto ? (
                              <button
                                type="button"
                                onClick={() => handleImageClick(`${baseUrl}${book.BookPhoto}`, book.Title)}
                                className="relative group"
                              >
                                <BookImage
                                  src={`${baseUrl}${book.BookPhoto}`}
                                  alt={book.Title}
                                  className="h-12 w-12 rounded border border-gray-200"
                                  fallback="📚"
                                />
                              </button>
                            ) : (
                              <div className="h-12 w-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                                <FontAwesomeIcon icon={faImage} className="text-gray-400" />
                              </div>
                            )}
                          </td>

                          <td className="px-2 py-2 text-xs font-semibold text-gray-900 uppercase max-w-xs truncate" title={book.Title}>
                   
                            {book.Title}
                          </td>
                          <td className="px-2 py-2 text-xs text-gray-700">{book.AccessionNumber || '-'}</td>
                          <td className="px-2 py-2 text-xs text-gray-700">{book.Author || '-'}</td>
                          <td className="px-2 py-2 text-xs text-gray-700">{book.courseName || '-'}</td>
                          <td className="px-2 py-2 text-xs text-gray-700">{book.SubjectName || '-'}</td>
                 {/* Table Column - Copies Section */}
<td className="px-2 py-2">
  <div className="text-xs space-y-0.5">
    <div className="text-green-600 font-medium">
      Total: {book.TotalCopies}
    </div>
    <div className="text-blue-600 font-medium">
      Available: {book.AvailableCopies}
    </div>
    <div className="text-red-600 font-medium">
      Issued: {book.TotalCopies - book.AvailableCopies}
    </div>
  </div>
</td>

                          <td className="px-2 py-2">
                            <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                              book.IsActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {book.IsActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleViewBook(book)}
                                className="p-1.5 rounded text-purple-600 bg-purple-50 hover:bg-purple-100 transition-all"
                                title="View Details"
                              >
                                <FontAwesomeIcon icon={faEye} className="text-xs" />
                              </button>
                              <button
                                onClick={() => handleEdit(book)}
                                disabled={!book.IsActive}
                                className={`p-1.5 rounded transition-all ${
                                  book.IsActive 
                                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                                    : 'text-gray-400 bg-gray-50 cursor-not-allowed'
                                }`}
                                title="Edit"
                              >
                                <FontAwesomeIcon icon={faEdit} className="text-xs" />
                              </button>
                              <button
                                onClick={() => openConfirmModal('delete', book.BookId)}
                                className="p-1.5 rounded text-red-600 bg-red-50 hover:bg-red-100 transition-all"
                                title="Delete"
                              >
                                <FontAwesomeIcon icon={faTrash} className="text-xs" />
                              </button>
                              <button
                                onClick={() => openConfirmModal('toggle', book.BookId, book.IsActive)}
                                className={`p-1.5 rounded transition-all ${
                                  book.IsActive 
                                    ? 'text-orange-600 bg-orange-50 hover:bg-orange-100' 
                                    : 'text-green-600 bg-green-50 hover:bg-green-100'
                                }`}
                                title={book.IsActive ? 'Deactivate' : 'Activate'}
                              >
                                <FontAwesomeIcon icon={book.IsActive ? faToggleOff : faToggleOn} className="text-xs" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Compact Pagination */}
              {totalPages > 1 && (
                <div className="bg-gray-50 px-3 py-2 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-700">
                      {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => goToPage(1)}
                        disabled={currentPage === 1}
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-blue-50 disabled:opacity-50"
                      >
                        <FontAwesomeIcon icon={faAnglesLeft} />
                      </button>

                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-blue-50 disabled:opacity-50"
                      >
                        <FontAwesomeIcon icon={faChevronLeft} />
                      </button>

                      {getPageNumbers().map((pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => goToPage(pageNum)}
                          className={`px-2.5 py-1 text-xs font-medium border rounded transition-all ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-300 hover:bg-blue-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}

                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-blue-50 disabled:opacity-50"
                      >
                        <FontAwesomeIcon icon={faChevronRight} />
                      </button>

                      <button
                        onClick={() => goToPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-blue-50 disabled:opacity-50"
                      >
                        <FontAwesomeIcon icon={faAnglesRight} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* View Modal - Detailed Information */}
            {isViewModalOpen && viewBook && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 z-50 overflow-y-auto">
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl my-4">
                  <div className="bg-blue-600 p-4 rounded-t-lg flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <FontAwesomeIcon icon={faEye} />
                      Book Details
                    </h3>
                    <button onClick={closeViewModal} className="text-white hover:bg-blue-700 p-2 rounded">
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>

                  <div className="p-4 max-h-[80vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Book Image */}
                      <div className="col-span-1">
                        {viewBook.BookPhoto ? (
                          <div className="relative group">
                            <BookImage
                              src={`${baseUrl}${viewBook.BookPhoto}`}
                              alt={viewBook.Title}
                              className="w-full h-80 rounded-lg border-2 border-gray-200 shadow-lg"
                              fallback="📚"
                            />
                            <button
                              onClick={() => handleImageClick(`${baseUrl}${viewBook.BookPhoto}`, viewBook.Title)}
                              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                            >
                              <FontAwesomeIcon icon={faExpand} className="text-white text-2xl" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-full h-80 bg-gray-100 rounded-lg border-2 border-gray-200 flex items-center justify-center">
                            <FontAwesomeIcon icon={faImage} className="text-gray-400 text-6xl" />
                          </div>
                        )}
                        
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-600">Status</span>
                            <span className={`px-3 py-1 text-xs font-bold rounded ${
                              viewBook.IsActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {viewBook.IsActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total Copies:</span>
                              <span className="font-bold text-green-700">{viewBook.TotalCopies}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Available:</span>
                              <span className="font-bold text-blue-700">{viewBook.AvailableCopies}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Issued:</span>
                              <span className="font-bold text-red-700">{viewBook.TotalCopies - viewBook.AvailableCopies}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Book Information */}
                      <div className="col-span-1 md:col-span-2 space-y-4">
                        {/* Title Section */}
                        <div className="border-b pb-3">
                          <h2 className="text-xl font-bold text-gray-900 uppercase mb-1">{viewBook.Title}</h2>
                          <p className="text-sm text-gray-600">
                            by <span className="font-semibold">{viewBook.Author || 'Unknown'}</span>
                          </p>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <InfoItem icon={faHashtag} label="ISBN Number" value={viewBook.IsbnNumber} />
                          <InfoItem icon={faHashtag} label="Accession No" value={viewBook.AccessionNumber} />
                          <InfoItem icon={faGraduationCap} label="Course" value={viewBook.courseName} />
                          <InfoItem icon={faBookOpen} label="Subject" value={viewBook.SubjectName} />
                          <InfoItem icon={faBuilding} label="Publication" value={viewBook.PublicationName} />
                          <InfoItem icon={faMoneyBill} label="Price" value={viewBook.Price ? `₹${viewBook.Price.toFixed(2)}` : null} />
                          <InfoItem icon={faHashtag} label="Edition" value={viewBook.Edition} />
                          <InfoItem icon={faLanguage} label="Language" value={viewBook.Language} />
                          <InfoItem icon={faCalendar} label="Published Year" value={viewBook.PublishedYear} />
                          <InfoItem icon={faBarcode} label="Barcode" value={viewBook.Barcode} />
                          <InfoItem icon={faInfoCircle} label="Source" value={viewBook.Source} />
                        </div>

                        {/* Details Section */}
                        {viewBook.Details && (
                          <div className="mt-4">
                            <div className="flex items-center gap-2 mb-2">
                              <FontAwesomeIcon icon={faInfoCircle} className="text-blue-600" />
                              <h4 className="text-sm font-bold text-gray-800">Additional Details</h4>
                            </div>
                            <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">
                              {viewBook.Details}
                            </p>
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex items-center gap-2 mb-2">
                            <FontAwesomeIcon icon={faUserEdit} className="text-gray-600" />
                            <h4 className="text-sm font-bold text-gray-800">Record Information</h4>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-600">Created By:</span>
                              <span className="ml-2 font-medium">{viewBook.CreatedBy || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Modified By:</span>
                              <span className="ml-2 font-medium">{viewBook.ModifiedBy || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-b-lg border-t flex justify-end gap-2">
                    <button
                      onClick={() => {
                        closeViewModal();
                        handleEdit(viewBook);
                      }}
                      disabled={!viewBook.IsActive}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        viewBook.IsActive
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <FontAwesomeIcon icon={faEdit} className="mr-2" />
                      Edit Book
                    </button>
                    <button
                      onClick={closeViewModal}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 text-sm font-medium rounded-lg"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Image Preview Modal */}
{/* Image Preview Modal - Fixed */}
{isImageModalOpen && selectedImage && (
  <div 
    className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999] p-4"
    onClick={closeImageModal}
  >
    <div 
      className="relative bg-white rounded-lg max-w-6xl w-full max-h-[95vh] flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b bg-blue-600 rounded-t-lg flex-shrink-0">
        <h3 className="font-bold text-white uppercase text-lg truncate pr-4">
          {selectedImage.title}
        </h3>
        <button 
          onClick={closeImageModal}
          className="text-white hover:bg-blue-700 p-2 rounded-lg transition-colors flex-shrink-0"
        >
          <FontAwesomeIcon icon={faTimes} className="text-xl" />
        </button>
      </div>

      {/* Image Container with Scroll */}
      <div className="flex-1 overflow-auto bg-gray-900 p-4">
        <div className="flex items-center justify-center min-h-full">
          <img
            src={selectedImage.src}
            alt={selectedImage.title}
            className="max-w-full h-auto object-contain rounded-lg"
            style={{ maxHeight: 'calc(95vh - 80px)' }}
          />
        </div>
      </div>

      {/* Optional: Footer with actions */}
      <div className="p-3 bg-gray-50 border-t rounded-b-lg flex justify-between items-center flex-shrink-0">
        <span className="text-xs text-gray-600">Click outside to close or press ESC</span>
        <button
          onClick={closeImageModal}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 text-sm font-medium rounded-lg"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

            {/* Add/Edit Modal */}
            {isModalOpen && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 z-50 overflow-y-auto">
                <div ref={modalRef} className="bg-white rounded-lg shadow-2xl w-full max-w-5xl my-4">
                  <div className="bg-blue-600 p-3 rounded-t-lg">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <FontAwesomeIcon icon={editingId ? faEdit : faPlus} />
                      {editingId ? 'Edit Book' : 'Add Book'}
                    </h3>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* ISBN */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          ISBN <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.IsbnNumber}
                          onChange={(e) => setFormData({...formData, IsbnNumber: e.target.value})}
                          className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none ${
                            errors.IsbnNumber ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                          }`}
                        />
                        {errors.IsbnNumber && <p className="text-red-500 text-xs mt-1">{errors.IsbnNumber}</p>}
                      </div>

                      {/* Title */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.Title}
                          onChange={(e) => setFormData({...formData, Title: e.target.value})}
                          className={`w-full px-3 py-2 text-xs uppercase border rounded-lg focus:outline-none ${
                            errors.Title ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                          }`}
                        />
                        {errors.Title && <p className="text-red-500 text-xs mt-1">{errors.Title}</p>}
                      </div>

                      {/* Accession */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Accession No</label>
                        <input
                          type="text"
                          value={formData.AccessionNumber}
                          onChange={(e) => setFormData({...formData, AccessionNumber: e.target.value})}
                          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Author */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Author</label>
                        <input
                          type="text"
                          value={formData.Author}
                          onChange={(e) => setFormData({...formData, Author: e.target.value})}
                          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Source */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Source</label>
                        <input
                          type="text"
                          value={formData.Source}
                          onChange={(e) => setFormData({...formData, Source: e.target.value})}
                          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Price */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Price (₹)</label>
                        <input
                          type="number"
                          value={formData.Price}
                          onChange={(e) => setFormData({...formData, Price: e.target.value})}
                          className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none ${
                            errors.Price ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                          }`}
                        />
                        {errors.Price && <p className="text-red-500 text-xs mt-1">{errors.Price}</p>}
                      </div>

                      {/* Course */}
{/* ✅ Course Dropdown in Form - Use allCourses */}
<div>
  <label className="block text-xs font-bold text-gray-700 mb-1">
    Course <span className="text-red-500">*</span>
  </label>
  <select
    value={formData.CourseId}
    onChange={(e) => setFormData({ ...formData, CourseId: e.target.value })}
    className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none ${
      errors.CourseId ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
    }`}
  >
    <option value="">Select Course</option>
    {allCourses.map(c => ( // ✅ Use allCourses instead of courses
      <option key={c.id} value={c.id} title={`${c.courseName} - ${c.collegeName}`}>
        {c.courseName} - {getCollegeShortName(c.collegeName)}
      </option>
    ))}
  </select>
  {errors.CourseId && <p className="text-red-500 text-xs mt-1">{errors.CourseId}</p>}
</div>


                      {/* Subject */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Subject <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div 
                            onClick={() => setShowSubjectInput(!showSubjectInput)} 
                            className={`w-full px-3 py-2 border rounded-lg bg-white flex justify-between items-center cursor-pointer ${
                              errors.SubjectId ? 'border-red-500' : 'border-gray-300'
                            }`}
                          >
                            <input
                              type="text"
                              placeholder="Search..."
                              className="w-full text-xs focus:outline-none cursor-pointer bg-transparent"
                              value={subjectSearch}
                              onChange={(e) => setSubjectSearch(e.target.value)}
                              onBlur={() => setTimeout(() => setShowSubjectInput(false), 200)}
                            />
                            {subjectSearch && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSubjectSearch(''); setFormData({...formData, SubjectId: ''}); }}
                                className="text-red-500 hover:text-red-700"
                              >
                                <FontAwesomeIcon icon={faTimesCircle} className="text-xs" />
                              </button>
                            )}
                          </div>
                          {showSubjectInput && (
                            <div className="absolute w-full bg-white border border-blue-500 rounded-lg mt-1 max-h-48 overflow-y-auto z-10 shadow-lg">
                              {subjects.filter(s => s.Name.toLowerCase().includes(subjectSearch.toLowerCase())).map(s => (
                                <div
                                  key={s.SubId}
                                  className="p-2 hover:bg-blue-50 cursor-pointer text-xs border-b last:border-0"
                                  onClick={() => handleSubjectChange(s.SubId.toString())}
                                >
                                  {s.Name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {errors.SubjectId && <p className="text-red-500 text-xs mt-1">{errors.SubjectId}</p>}
                      </div>

                      {/* Publication */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Publication <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div 
                            onClick={() => setShowPublicationInput(!showPublicationInput)} 
                            className={`w-full px-3 py-2 border rounded-lg bg-white flex justify-between items-center cursor-pointer ${
                              errors.PublicationId ? 'border-red-500' : 'border-gray-300'
                            }`}
                          >
                            <input
                              type="text"
                              placeholder="Search..."
                              className="w-full text-xs focus:outline-none cursor-pointer bg-transparent"
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
                                <FontAwesomeIcon icon={faTimesCircle} className="text-xs" />
                              </button>
                            )}
                          </div>
                          {showPublicationInput && (
                            <div className="absolute w-full bg-white border border-blue-500 rounded-lg mt-1 max-h-48 overflow-y-auto z-10 shadow-lg">
                              {publications.filter(p => p.Name.toLowerCase().includes(publicationSearch.toLowerCase())).map(p => (
                                <div
                                  key={p.PubId}
                                  className="p-2 hover:bg-blue-50 cursor-pointer text-xs border-b last:border-0"
                                  onClick={() => handlePublicationChange(p.PubId.toString())}
                                >
                                  {p.Name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {errors.PublicationId && <p className="text-red-500 text-xs mt-1">{errors.PublicationId}</p>}
                      </div>

                      {/* Total Copies */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Total Copies</label>
                        <input
                          type="number"
                          value={formData.TotalCopies}
                          onChange={(e) => setFormData({...formData, TotalCopies: e.target.value})}
                          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Edition */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Edition</label>
                        <input
                          type="text"
                          value={formData.Edition}
                          onChange={(e) => setFormData({...formData, Edition: e.target.value})}
                          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Language */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Language</label>
                        <select
                          value={formData.Language}
                          onChange={(e) => setFormData({...formData, Language: e.target.value})}
                          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        >
                          <option value="">Select</option>
                          <option value="English">English</option>
                          <option value="Hindi">Hindi</option>
                        </select>
                      </div>

                      {/* Year */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Published Year</label>
                        <input
                          type="number"
                          value={formData.PublishedYear}
                          onChange={(e) => setFormData({...formData, PublishedYear: e.target.value})}
                          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Barcode */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Barcode</label>
                        <input
                          type="text"
                          value={formData.Barcode}
                          onChange={(e) => setFormData({...formData, Barcode: e.target.value})}
                          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Photo */}
                      <div className="col-span-1 md:col-span-2 lg:col-span-3">
                        <label className="block text-xs font-bold text-gray-700 mb-1">Book Photo</label>
                        
                        {editingId && books.find(b => b.BookId === editingId)?.BookPhoto && (
                          <div className="relative inline-block mb-2">
                            <BookImage
                              src={`${baseUrl}${books.find(b => b.BookId === editingId)?.BookPhoto}`}
                              alt="Current"
                              className="h-20 w-20 rounded border-2"
                              fallback="📖"
                            />
                            <button
                              type="button"
                              onClick={() => setIsDeleteImageConfirmOpen(true)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <FontAwesomeIcon icon={faTimes} className="text-xs" />
                            </button>
                          </div>
                        )}

                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif"
                          ref={fileInputRef}
                          onChange={(e) => setFormData({...formData, BookPhoto: e.target.files?.[0] || null})}
                          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700"
                        />
                        {errors.BookPhoto && <p className="text-red-500 text-xs mt-1">{errors.BookPhoto}</p>}
                      </div>

                      {/* Details */}
                      <div className="col-span-1 md:col-span-2 lg:col-span-3">
                        <label className="block text-xs font-bold text-gray-700 mb-1">Details</label>
                        <textarea
                          value={formData.Details}
                          onChange={(e) => setFormData({...formData, Details: e.target.value})}
                          rows={2}
                          className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="bg-gray-200 text-gray-700 hover:bg-gray-300 px-4 py-2 text-xs font-medium rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-medium rounded-lg"
                      >
                        {editingId ? 'Update' : 'Add'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Delete Image Confirm */}
            {isDeleteImageConfirmOpen && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 z-50">
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
                  <div className="bg-red-600 p-3 rounded-t-lg">
                    <h3 className="text-lg font-bold text-white">Delete Image</h3>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-700 mb-4">Delete this image?</p>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setIsDeleteImageConfirmOpen(false)}
                        className="bg-gray-200 text-gray-700 px-4 py-2 text-xs rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteImage}
                        className="bg-red-600 text-white px-4 py-2 text-xs rounded-lg"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Confirm Modal */}
            {isConfirmModalOpen && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 z-50">
                <div ref={confirmModalRef} className="bg-white rounded-lg shadow-2xl w-full max-w-md">
                  <div className={`p-3 rounded-t-lg ${
                    confirmAction === 'delete' ? 'bg-red-600' : confirmStatus ? 'bg-orange-600' : 'bg-green-600'
                  }`}>
                    <h3 className="text-lg font-bold text-white">Confirm</h3>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-700 mb-4">
                      {confirmAction === 'delete' 
                        ? 'Delete this book?' 
                        : confirmStatus ? 'Deactivate this book?' : 'Activate this book?'}
                    </p>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setIsConfirmModalOpen(false)}
                        className="bg-gray-200 text-gray-700 px-4 py-2 text-xs rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={confirmAction === 'delete' ? handleDelete : handleToggleActive}
                        className={`text-white px-4 py-2 text-xs rounded-lg ${
                          confirmAction === 'delete' ? 'bg-red-600' : confirmStatus ? 'bg-orange-600' : 'bg-green-600'
                        }`}
                      >
                        {confirmAction === 'delete' ? 'Delete' : confirmStatus ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Info Item Component for View Modal
const InfoItem = ({ icon, label, value }: { icon: any, label: string, value: any }) => {
  if (!value) return null;
  
  return (
    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-1">
        <FontAwesomeIcon icon={icon} className="text-blue-600 text-xs" />
        <span className="text-xs font-bold text-gray-600">{label}</span>
      </div>
      <p className="text-xs font-semibold text-gray-900 ml-5">{value}</p>
    </div>
  );
};

export default BooksPage;
