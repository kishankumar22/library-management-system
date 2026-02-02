'use client';
import { useUser } from '@/app/hooks/useUser';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner, 
  faPlus, 
  faBook, 
  faTimes, 
  faTimesCircle, 
  faSearch, 
  faArrowCircleDown, 
  faArrowCircleUp,
  faSync,
  faChevronLeft,
  faChevronRight,
  faAnglesLeft,
  faAnglesRight,
  faRotateLeft,
  faExclamationCircle
} from '@fortawesome/free-solid-svg-icons';
import { Book, Publication, BookStockHistory } from '@/types';

const BookStockHistoryPage = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [bookStockHistory, setBookStockHistory] = useState<BookStockHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    BookId: 0,
    PublicationId: 0,
    CopiesAdded: 0,
    Remarks: '',
  });
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [publicationFilter, setPublicationFilter] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'Stock In' | 'Stock Out'>('all');
  const [filterPublicationSearch, setFilterPublicationSearch] = useState('');
  const [showFilterPublicationInput, setShowFilterPublicationInput] = useState(false);
  const [modalPublicationSearch, setModalPublicationSearch] = useState('');
  const [showModalPublicationInput, setShowModalPublicationInput] = useState(false);
  const [bookSearch, setBookSearch] = useState('');
  const [showBookInput, setShowBookInput] = useState(false);
  const [actionType, setActionType] = useState<string | null>(null);
  const [totalStock, setTotalStock] = useState(0);
  const [totalStockIn, setTotalStockIn] = useState(0);
  const [totalStockOut, setTotalStockOut] = useState(0);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const user = useUser();
  const modalRef = useRef<HTMLDivElement>(null);
  const filterPublicationInputRef = useRef<HTMLInputElement>(null);
  const modalPublicationInputRef = useRef<HTMLInputElement>(null);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, publicationFilter, searchTerm, itemsPerPage]);

  useEffect(() => {
    fetchData();
  }, [statusFilter, publicationFilter, searchTerm]);

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

  useEffect(() => {
    // Calculate totals
    const stockIn = bookStockHistory
      .filter(history => history.CopiesAdded >= 0)
      .reduce((sum, history) => sum + history.CopiesAdded, 0);
    const stockOut = bookStockHistory
      .filter(history => history.CopiesAdded < 0)
      .reduce((sum, history) => sum + Math.abs(history.CopiesAdded), 0);
    const total = bookStockHistory.reduce((sum, history) => sum + history.CopiesAdded, 0);

    setTotalStockIn(stockIn);
    setTotalStockOut(stockOut);
    setTotalStock(total);
  }, [bookStockHistory]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [booksRes, publicationsRes, historyRes] = await Promise.all([
        axios.get('/api/book'),
        axios.get('/api/publication'),
        axios.get('/api/book-stock-history', {
          params: { searchTerm, publicationId: publicationFilter || undefined },
        }),
      ]);
      setBooks(booksRes.data);
      setAllBooks(booksRes.data);
      setPublications(publicationsRes.data);
      setBookStockHistory(historyRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };


  const handleFilterPublicationChange = (pubId: number) => {
    const selectedPub = publications.find(p => p.PubId === pubId);
    setFilterPublicationSearch(selectedPub?.Name || '');
    setPublicationFilter(pubId);
    setShowFilterPublicationInput(false);
  };

  const handleModalPublicationChange = (pubId: number) => {
    const selectedPub = publications.find(p => p.PubId === pubId);
    setModalPublicationSearch(selectedPub?.Name || '');
    setFormData(prev => ({ ...prev, PublicationId: pubId, BookId: 0 }));
    setBooks(pubId ? allBooks.filter(b => b.PublicationId === pubId) : allBooks);
    setSelectedBook(null);
    setBookSearch('');
    setShowModalPublicationInput(false);
  };

  const handleBookChange = (bookId: number) => {
    const book = books.find(b => b.BookId === bookId);
    setSelectedBook(book || null);
    setFormData(prev => ({ ...prev, BookId: bookId }));
    setBookSearch(book?.Title || '');
    setShowBookInput(false);
  };

  const handleManageBookStock = async () => {
    if (isSubmitting || !formData.BookId || Math.abs(formData.CopiesAdded) <= 0 || !actionType) {
      toast.error('Please fill all required fields and select an action to proceed');
      return;
    }

    if (actionType === 'Out' && selectedBook && selectedBook.AvailableCopies < Math.abs(formData.CopiesAdded)) {
      toast.error('Insufficient available copies to remove');
      return;
    }

    setIsSubmitting(true);
    try {
      const adjustedCopies = actionType === 'In' ? Math.abs(formData.CopiesAdded) : -Math.abs(formData.CopiesAdded);
      await axios.post('/api/book-stock-history', { ...formData, CopiesAdded: adjustedCopies, CreatedBy: user.name });
      toast.success(`Book ${actionType === 'In' ? 'added' : 'removed'} successfully`);
      setIsModalOpen(false);
      resetFormFields();
      await fetchData();
    } catch (error: any) {
      console.error(`Error ${actionType === 'In' ? 'adding' : 'removing'} book copies:`, error);
      toast.error(error.response?.data?.message || `Failed to ${actionType === 'In' ? 'add' : 'remove'} book copies`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFormFields = () => {
    setFormData({
      BookId: 0,
      PublicationId: 0,
      CopiesAdded: 0,
      Remarks: '',
    });
    setSelectedBook(null);
    setModalPublicationSearch('');
    setBookSearch('');
    setActionType(null);
    setShowModalPublicationInput(false);
    setShowBookInput(false);
    setBooks(allBooks);
  };

  // Filter history
  const filteredHistory = bookStockHistory.filter(history => {
    const matchesSearch = history.BookName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPublication = publicationFilter === 0 || history.PublicationName?.toLowerCase() === publications.find(p => p.PubId === publicationFilter)?.Name.toLowerCase();
    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'Stock In' && history.CopiesAdded >= 0) ||
                         (statusFilter === 'Stock Out' && history.CopiesAdded < 0);
    return matchesSearch && matchesPublication && matchesStatus;
  });

  // Pagination calculations
  const totalItems = filteredHistory.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentHistory = filteredHistory.slice(startIndex, endIndex);

  // Pagination handlers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // Generate page numbers for pagination
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
    <div className="container">
      {/* Enhanced Filter Bar with Better Spacing */}
{/* Stats Cards */}
<div className="grid grid-cols-3 gap-2 mb-2">
  {/* Total Stock */}
  <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-blue-600">
    <div className="flex items-center gap-2">
      <FontAwesomeIcon icon={faBook} className="text-blue-600 text-lg" />
      <div className="flex-1">
        <p className="text-xs text-gray-600">Total Stock</p>
        <p className="text-lg font-bold text-blue-700">{totalStock}</p>
      </div>
    </div>
  </div>

  {/* Stock In */}
  <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-green-600">
    <div className="flex items-center gap-2">
      <FontAwesomeIcon icon={faArrowCircleDown} className="text-green-600 text-lg" />
      <div className="flex-1">
        <p className="text-xs text-gray-600">Stock In</p>
        <p className="text-lg font-bold text-green-700">{totalStockIn}</p>
      </div>
    </div>
  </div>

  {/* Stock Out */}
  <div className="bg-white rounded-lg shadow-sm p-3 border-l-4 border-red-600">
    <div className="flex items-center gap-2">
      <FontAwesomeIcon icon={faArrowCircleUp} className="text-red-600 text-lg" />
      <div className="flex-1">
        <p className="text-xs text-gray-600">Stock Out</p>
        <p className="text-lg font-bold text-red-700">{totalStockOut}</p>
      </div>
    </div>
  </div>
</div>

{/* Filters Row */}
<div className="bg-white rounded-lg shadow-sm p-3 mb-2 border border-gray-200">
  <div className="flex flex-wrap items-center gap-2">
    {/* Search */}
    <div className="relative flex-1 min-w-[200px]">
      <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
      <input
        type="text"
        placeholder="Search by book name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg w-full focus:outline-none focus:border-blue-500"
      />
    </div>

    {/* Publication Filter */}
    <div className="relative min-w-[150px]">
      <div
        className="flex items-center border border-gray-300 rounded-lg px-3 py-2 bg-white text-xs cursor-pointer focus-within:border-blue-500"
        onClick={() => {
          setShowFilterPublicationInput(true);
          filterPublicationInputRef.current?.focus();
        }}
      >
        <input
          ref={filterPublicationInputRef}
          type="text"
          placeholder="Publication"
          className="w-full border-none focus:outline-none bg-transparent text-xs"
          value={filterPublicationSearch}
          onChange={(e) => {
            setFilterPublicationSearch(e.target.value);
            setShowFilterPublicationInput(true);
          }}
          onBlur={() => setTimeout(() => setShowFilterPublicationInput(false), 200)}
        />
        {filterPublicationSearch && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFilterPublicationSearch('');
              setPublicationFilter(0);
            }}
            className="text-red-500 hover:text-red-700 ml-1"
          >
            <FontAwesomeIcon icon={faTimesCircle} className="text-xs" />
          </button>
        )}
      </div>
      {showFilterPublicationInput && (
        <ul className="absolute z-10 w-full bg-white border rounded-lg mt-1 max-h-40 overflow-y-auto text-xs shadow-lg">
          <li className="px-3 py-2 font-semibold bg-gray-100">Select Publication</li>
          {publications.filter(pub =>
            pub.Name.toLowerCase().includes(filterPublicationSearch.toLowerCase())
          ).length === 0 ? (
            <li className="px-3 py-2 italic text-gray-400">No publication found</li>
          ) : (
            publications
              .filter(pub =>
                pub.Name.toLowerCase().includes(filterPublicationSearch.toLowerCase())
              )
              .map(pub => (
                <li
                  key={pub.PubId}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleFilterPublicationChange(pub.PubId)}
                >
                  {pub.Name}
                </li>
              ))
          )}
        </ul>
      )}
    </div>

    {/* Status Filter */}
    <select
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value as 'all' | 'Stock In' | 'Stock Out')}
      className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
    >
      <option value="all">All Status</option>
      <option value="Stock In">Stock In</option>
      <option value="Stock Out">Stock Out</option>
    </select>

    {/* Items Per Page */}
    <select
      value={itemsPerPage}
      onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
      className="px-2 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
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
        setFilterPublicationSearch('');
        setPublicationFilter(0);
        setStatusFilter('all');
      }}
      className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 text-xs font-medium rounded-lg transition-all"
      title="Clear Filters"
    >
      <FontAwesomeIcon icon={faRotateLeft} />
    </button>

    {/* Manage Stock */}
    <button
      onClick={() => {
        resetFormFields();
        setIsModalOpen(true);
      }}
      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap ml-auto"
    >
      <FontAwesomeIcon icon={faPlus} className="mr-1" />
      Manage Stock
    </button>
  </div>
</div>


      {/* Table */}
      <div className="bg-white rounded shadow min h-[73vh] overflow-x-auto">
        {loading ? (
          <div className="flex justify-center h-[85vh] items-center p-4">
            <FontAwesomeIcon icon={faSpinner} spin size="lg" className="w-10 h-10 text-blue-600" />
          </div>
        ) : (
     <table className="min-w-full text-xs">
  <thead className="bg-blue-600 text-white sticky top-0">
    <tr>
      <th className="px-3 py-2 text-left font-bold">#</th>
      <th className="px-3 py-2 text-left font-bold">📖 Book Name</th>
      <th className="px-3 py-2 text-left font-bold">📚 Publication</th>
      <th className="px-3 py-2 text-center font-bold">📊 Change</th>
      <th className="px-3 py-2 text-left font-bold">📝 Remarks</th>
      <th className="px-3 py-2 text-left font-bold">📅 Date</th>
      <th className="px-3 py-2 text-left font-bold">👤 By</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-gray-100 bg-white">
    {currentHistory.length === 0 ? (
      <tr>
        <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
          <FontAwesomeIcon icon={faExclamationCircle} className="text-4xl mb-2 text-gray-300" />
          <p className="font-medium">No history found</p>
        </td>
      </tr>
    ) : (
      currentHistory.map((history, index) => {
        const isStockIn = history.CopiesAdded >= 0;
        
        return (
          <tr key={history.BookStockHistoryId} className="hover:bg-blue-50 transition-colors">
            <td className="px-3 py-2 font-medium text-gray-700">
              {startIndex + index + 1}
            </td>
            <td className="px-3 py-2 font-bold text-gray-900 uppercase max-w-xs truncate" title={history.BookName}>
              {history.BookName}
            </td>
            <td className="px-3 py-2 text-gray-700">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-medium">
                {history.PublicationName}
              </span>
            </td>
            <td className="px-3 py-2 text-center">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold ${
                isStockIn 
                  ? 'bg-green-500 text-white' 
                  : 'bg-red-500 text-white'
              }`}>
                <FontAwesomeIcon icon={isStockIn ? faArrowCircleDown : faArrowCircleUp} />
                <span>
                  {isStockIn ? `+${history.CopiesAdded}` : history.CopiesAdded}
                </span>
              </div>
            </td>
            <td className="px-3 py-2 text-gray-600 max-w-xs truncate" title={history.Remarks || 'N/A'}>
              {history.Remarks || <span className="text-gray-400 italic">N/A</span>}
            </td>
            <td className="px-3 py-2 text-gray-600">
              {new Date(history.CreatedOn).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </td>
            <td className="px-3 py-2 text-gray-700 font-medium">
              {history.CreatedBy || <span className="text-gray-400 italic">N/A</span>}
            </td>
          </tr>
        );
      })
    )}
  </tbody>
</table>

        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2">
          {/* Pagination Info */}
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
            <span className="font-medium">{Math.min(endIndex, totalItems)}</span> of{' '}
            <span className="font-medium">{totalItems}</span> records
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-2">
            {/* First Page */}
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="First Page"
            >
              <FontAwesomeIcon icon={faAnglesLeft} size="sm" />
            </button>

            {/* Previous Page */}
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous Page"
            >
              <FontAwesomeIcon icon={faChevronLeft} size="sm" />
            </button>

            {/* Page Numbers */}
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

            {/* Next Page */}
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next Page"
            >
              <FontAwesomeIcon icon={faChevronRight} size="sm" />
            </button>

            {/* Last Page */}
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

      {/* Modal remains the same */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-2 z-50">
          <div ref={modalRef} className="bg-white rounded shadow w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => {
                setIsModalOpen(false);
                resetFormFields();
              }}
              className="absolute top-3 right-4 h-10 w-10 text-red-600 hover:text-red-800 transition duration-200"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
            <div className="p-4">
              <h2 className="text-lg font-bold mb-3 p-2 rounded-md bg-gradient-to-r from-blue-50 to-white text-blue-800">Manage Book Quantity</h2>
              <div className="space-y-4">
                <div className="bg-gray-100 p-3 rounded">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-700">Select Publication</label>
                      <div
                        onClick={() => {
                          setShowModalPublicationInput(true);
                          if (modalPublicationInputRef.current) {
                            modalPublicationInputRef.current.focus();
                            if (!modalPublicationSearch) {
                              setModalPublicationSearch('');
                            }
                          }
                        }}
                        className="w-full p-1 border rounded text-sm bg-white flex justify-between items-center"
                      >
                        <input
                          ref={modalPublicationInputRef}
                          type="text"
                          placeholder="Search Publication"
                          className="w-full p-0 border-0 text-sm focus:outline-none"
                          value={modalPublicationSearch}
                          onChange={(e) => {
                            setModalPublicationSearch(e.target.value);
                            setShowModalPublicationInput(true);
                          }}
                          onBlur={() => setTimeout(() => setShowModalPublicationInput(false), 200)}
                          title="Select publication"
                        />
                        {modalPublicationSearch && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setModalPublicationSearch('');
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
                      {showModalPublicationInput && (
                        <div className="relative">
                          <ul className="absolute w-full bg-white border rounded mt-1 max-h-40 overflow-y-auto z-10">
                            <li className="p-1 bg-gray-100 font-medium">Select Publication</li>
                            {publications
                              .filter(pub => pub.Name.toLowerCase().includes(modalPublicationSearch.toLowerCase()))
                              .length === 0 ? (
                              <li className="p-1 text-gray-500 italic">No publication found</li>
                            ) : (
                              publications
                                .filter(pub => pub.Name.toLowerCase().includes(modalPublicationSearch.toLowerCase()))
                                .map(pub => (
                                  <li
                                    key={pub.PubId}
                                    className="p-1 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => handleModalPublicationChange(pub.PubId)}
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
                          title="Select book"
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
                            {books
                              .filter(book => book.Title.toLowerCase().includes(bookSearch.toLowerCase()))
                              .length === 0 ? (
                              <li className="p-1 text-gray-500 italic">No book found</li>
                            ) : (
                              books
                                .filter(book => book.Title.toLowerCase().includes(bookSearch.toLowerCase()))
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
                          <div><span className="font-medium text-gray-700">Price:</span> {selectedBook.Price}</div>
                          <div><span className="font-medium text-gray-700">Total Quantity:</span> {selectedBook.TotalCopies}</div>
                          <div><span className="font-medium text-gray-700">Available Qty:</span> {selectedBook.AvailableCopies}</div>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-gray-700">No Of Copies</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full p-1 border rounded text-sm"
                        value={formData.CopiesAdded}
                        onChange={(e) => setFormData(prev => ({ ...prev, CopiesAdded: Number(e.target.value) }))}
                      />
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
                  {selectedBook && (
                    <div className="mt-4">
                      <p className="text-xl font-bold text-gray-600 mb-2">Please select action to proceed </p>
                      <div className="flex gap-4">
                        <button
                          onClick={() => setActionType('In')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full border transition
                            ${actionType === 'In'
                              ? 'bg-green-100 text-green-700 border-green-300'
                              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}
                          title="Add Book Copies"
                        >
                          <FontAwesomeIcon icon={faArrowCircleDown} className="text-green-600" />
                          <span>Book Stock In</span>
                        </button>
                        <button
                          onClick={() => setActionType('Out')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full border transition
                            ${actionType === 'Out'
                              ? 'bg-red-100 text-red-700 border-red-300'
                              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}
                          title="Remove Book Copies"
                        >
                          <FontAwesomeIcon icon={faArrowCircleUp} className="text-red-600" />
                          <span>Book Stock Out</span>
                        </button>
                      </div>
                    </div>
                  )}
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
                  onClick={handleManageBookStock}
                  className={`px-3 py-1 rounded text-sm transition duration-200 ${actionType === 'In' ? 'bg-green-600 hover:bg-green-800' : actionType === 'Out' ? 'bg-red-600 hover:bg-red-800' : 'bg-gray-400 cursor-not-allowed'} text-white`}
                  disabled={isSubmitting || !actionType}
                >
                  {isSubmitting ? 'Processing...' : `${actionType === 'In' ? 'Add' : actionType === 'Out' ? 'Remove' : ''} Book Copies`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookStockHistoryPage;
