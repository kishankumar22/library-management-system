'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner, faPlus, faBook, faTimes, faTimesCircle, faSearch, faPlusCircle, faMinusCircle,
  faArrowCircleDown, faArrowCircleUp,
} from '@fortawesome/free-solid-svg-icons';
import { Book, Publication, BookStockHistory } from '@/types';

const BookStockHistoryPage = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [bookStockHistory, setBookStockHistory] = useState<BookStockHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    BookId: 0,
    PublicationId: 0,
    CopiesAdded: 0, // Will be positive for In, negative for Out
    Remarks: '',
  });
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [publicationFilter, setPublicationFilter] = useState(0);
  const [filterPublicationSearch, setFilterPublicationSearch] = useState('');
  const [showFilterPublicationInput, setShowFilterPublicationInput] = useState(false);
  const [modalPublicationSearch, setModalPublicationSearch] = useState('');
  const [showModalPublicationInput, setShowModalPublicationInput] = useState(false);
  const [bookSearch, setBookSearch] = useState('');
  const [showBookInput, setShowBookInput] = useState(false);
  const [actionType, setActionType] = useState<string | null>(null); // No default value

  const modalRef = useRef<HTMLDivElement>(null);
  const filterPublicationInputRef = useRef<HTMLInputElement>(null);
  const modalPublicationInputRef = useRef<HTMLInputElement>(null);

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
      const [booksRes, publicationsRes, historyRes] = await Promise.all([
        axios.get('/api/book'),
        axios.get('/api/publication'),
        axios.get('/api/book-stock-history', {
          params: { searchTerm, publicationId: publicationFilter || undefined },
        }),
      ]);
      setBooks(booksRes.data);
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
    fetchData();
  };

  const handleModalPublicationChange = (pubId: number) => {
    const selectedPub = publications.find(p => p.PubId === pubId);
    setModalPublicationSearch(selectedPub?.Name || '');
    setFormData(prev => ({ ...prev, PublicationId: pubId, BookId: 0 }));
    setBooks(books.filter(b => b.PublicationId === pubId));
    setSelectedBook(null);
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

    // Check available copies for "Out" operation
    if (actionType === 'Out' && selectedBook && selectedBook.AvailableCopies < Math.abs(formData.CopiesAdded)) {
      toast.error('Insufficient available copies to remove');
      return;
    }

    setIsSubmitting(true);
    try {
      const adjustedCopies = actionType === 'In' ? Math.abs(formData.CopiesAdded) : -Math.abs(formData.CopiesAdded);
      await axios.post('/api/book-stock-history', { ...formData, CopiesAdded: adjustedCopies });
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
    setActionType(null); // Reset to no selection
    setShowModalPublicationInput(false);
    setShowBookInput(false);
  };

  const filteredHistory = bookStockHistory.filter(history => {
    const matchesSearch = history.BookName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPublication = publicationFilter === 0 || history.PublicationName?.toLowerCase() === publications.find(p => p.PubId === publicationFilter)?.Name.toLowerCase();
    return matchesSearch && matchesPublication;
  });

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2 bg-gradient-to-r from-blue-50 to-white p-2 rounded-md">
        <h1 className="text-xl font-bold text-blue-800">Book Stock History</h1>
        <button
          onClick={() => {
            resetFormFields();
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-800 text-white py-1 px-3 rounded text-sm flex items-center gap-1 transition duration-200"
        >
          <FontAwesomeIcon icon={faPlus} size="xs" /> Manage Book Quantity
        </button>
      </div>

      <div className="bg-white rounded shadow p-3 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by book name"
              className="w-full pl-8 pr-2 py-1 border rounded text-sm"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                fetchData();
              }}
            />
            <FontAwesomeIcon icon={faSearch} className="absolute left-2 top-2.5 w-3 h-3 text-gray-400" />
          </div>
          <div className="relative">
            <div
              className="w-full p-1 border rounded text-sm bg-white flex justify-between items-center"
              onClick={() => {
                setShowFilterPublicationInput(true);
                if (filterPublicationInputRef.current) {
                  filterPublicationInputRef.current.focus();
                  if (!filterPublicationSearch) {
                    setFilterPublicationSearch('');
                  }
                }
              }}
            >
              <input
                ref={filterPublicationInputRef}
                type="text"
                placeholder="Search Publication"
                className="w-full p-0 border-0 text-sm focus:outline-none"
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
                    fetchData();
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <FontAwesomeIcon icon={faTimesCircle} size="xs" />
                </button>
              )}
            </div>
            {showFilterPublicationInput && (
              <div className="relative">
                <ul className="absolute w-full bg-white border rounded mt-1 max-h-40 overflow-y-auto z-10">
                  <li className="p-1 bg-gray-100 font-medium">Select Publication</li>
                  {publications
                    .filter(pub => pub.Name.toLowerCase().includes(filterPublicationSearch.toLowerCase()))
                    .length === 0 ? (
                    <li className="p-1 text-gray-500 italic">No publication found</li>
                  ) : (
                    publications
                      .filter(pub => pub.Name.toLowerCase().includes(filterPublicationSearch.toLowerCase()))
                      .map(pub => (
                        <li
                          key={pub.PubId}
                          className="p-1 hover:bg-gray-100 cursor-pointer"
                          onClick={() => handleFilterPublicationChange(pub.PubId)}
                        >
                          {pub.Name}
                        </li>
                      ))
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        {loading ? (
          <div className="flex justify-center h-[85vh] items-center p-4">
            <FontAwesomeIcon icon={faSpinner} spin size="lg" className="w-10 h-10 text-blue-600" />
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-blue-800">Sr.</th>
                <th className="px-3 py-2 text-left text-blue-800">Book Name</th>
                <th className="px-3 py-2 text-left text-blue-800">Publication</th>
                <th className="px-3 py-2 text-left text-blue-800">Added/Removed</th>
                <th className="px-3 py-2 text-left text-blue-800">Remarks</th>
                <th className="px-3 py-2 text-left text-blue-800">Created On</th>
                <th className="px-3 py-2 text-left text-blue-800">Created By</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-2 text-center text-gray-500">No history found</td>
                </tr>
              ) : (
                filteredHistory.map((history, index) => (
                  <tr key={history.BookStockHistoryId} className="hover:bg-gray-50">
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2 uppercase">{history.BookName}</td>
                    <td className="px-3 py-2">{history.PublicationName}</td>
                    <td
                      className={`px-3 py-2 font-medium ${history.CopiesAdded >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      title={history.CopiesAdded >= 0 
                        ? `Added ${history.CopiesAdded} book${history.CopiesAdded !== 1 ? 's' : ''}` 
                        : `Removed ${Math.abs(history.CopiesAdded)} book${Math.abs(history.CopiesAdded) !== 1 ? 's' : ''}`}
                    >
                      {history.CopiesAdded >= 0 
                        ? `+${history.CopiesAdded}` 
                        : `${history.CopiesAdded}`}
                    </td>
                    <td className="px-3 py-2">{history.Remarks || 'N/A'}</td>
                    <td className="px-3 py-2">{new Date(history.CreatedOn).toLocaleDateString()}</td>
                    <td className="px-3 py-2">{history.CreatedBy || 'N/A'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
                              setBooks(books);
                              setSelectedBook(null);
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