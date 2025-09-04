'use client';
import { useUser } from '@/app/hooks/useUser';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSpinner, 
  faEye, 
  faEyeSlash,
  faPlus, 
  faEdit, 
  faTrash, 
  faSearch, 
  faFilter, 
  faTimes,
  faToggleOff,
  faToggleOn,
  faRefresh,
  faChevronLeft,
  faChevronRight,
  faAnglesLeft,
  faAnglesRight
} from '@fortawesome/free-solid-svg-icons';
import { Publication } from '@/types';

const PublicationsPage = () => {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'delete' | 'toggle' | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<boolean | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [initialLoading, setInitialLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  const user = useUser();
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmModalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPublications();
  }, [searchTerm, statusFilter]);

  // Reset to first page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, itemsPerPage]);

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

  const fetchPublications = async () => {
    setTableLoading(true);
    try {
      const params = { search: searchTerm, status: statusFilter };
      const res = await axios.get('/api/publication', { params });
      setPublications(res.data);
    } catch (error) {
      toast.error('Failed to fetch publications');
    } finally {
      setInitialLoading(false);
      setTableLoading(false);
    }
  };

  const sanitizeAndFormatName = (input: string) => {
    return input
      .split(/\s+/)
      .filter(word => word.length > 0)
      .map(word => word.replace(/[^A-Z&]/gi, ''))
      .join(' ')
      .trim()
      .toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formattedName = sanitizeAndFormatName(name);
    if (!formattedName) {
      toast.error('Please enter a valid publication name');
      return;
    }
    if (formattedName.length > 100) {
      toast.error('Publication name cannot exceed 100 characters');
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      const payload = {
        Name: formattedName,
        IsActive: true,
        CreatedBy: user?.name || 'system',
        CreatedOn: timestamp,
        ...(editingId && {
          PubId: editingId,
          ModifiedBy: user?.name || 'system',
          ModifiedOn: timestamp,
        }),
      };

      const res = await axios({
        method: editingId ? 'put' : 'post',
        url: '/api/publication',
        data: payload,
      });

      toast.success(editingId ? 'Publication updated' : 'Publication added');
      setName('');
      setEditingId(null);
      setIsModalOpen(false);
      fetchPublications();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'An error occurred';
      toast.error(errorMsg);
    }
  };

  const handleEdit = (publication: Publication) => {
    setName(publication.Name);
    setEditingId(publication.PubId);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!confirmId) return;
    try {
      await axios.delete('/api/publication', { data: { PubId: confirmId } });
      toast.success('Publication deleted successfully');
      setIsConfirmModalOpen(false);
      fetchPublications();
    } catch (error: any) {
      const status = error.response?.status;
      const message =
        status === 409
          ? error.response?.data?.message || 'Publication is linked to books and cannot be deleted.'
          : error.response?.data?.message || 'Failed to delete publication';
      toast.error(message);
    }
  };

  const handleToggleActive = async () => {
    if (!confirmId || confirmStatus === null) return;

    try {
      const publication = publications.find(p => p.PubId === confirmId);
      if (!publication) throw new Error('Publication not found');

      await axios.put('/api/publication', {
        PubId: confirmId,
        Name: publication.Name,
        IsActive: !confirmStatus,
        ModifiedBy: user?.name || 'system',
        ModifiedOn: new Date().toISOString(),
      });

      toast.success(`Publication ${confirmStatus ? 'deactivated' : 'activated'}`);
      setIsConfirmModalOpen(false);
      fetchPublications();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'An error occurred';
      toast.error(errorMsg);
    }
  };

  const openConfirmModal = (action: 'delete' | 'toggle', id: number, status?: boolean) => {
    setConfirmAction(action);
    setConfirmId(id);
    setConfirmStatus(status ?? null);
    setIsConfirmModalOpen(true);
  };

  // Filter publications based on search and status
  const filteredPublications = publications.filter((publication) => {
    const matchesSearch = publication.Name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && publication.IsActive) ||
      (statusFilter === 'inactive' && !publication.IsActive);
    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalItems = filteredPublications.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPublications = filteredPublications.slice(startIndex, endIndex);

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
    <div>
      <div className="w-full rounded-lg shadow-sm px-4 py-1">
        {initialLoading ? (
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-500 text-4xl mb-2" />
              <p className="text-gray-600 text-lg">Loading...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col lg:flex-row items-center justify-between gap-3 mb-4">
              {/* Left Side: Total + Search + Filter */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                {/* Total Publications */}
                <div className="text-sm text-gray-700 whitespace-nowrap">
                  Total Publications: <span className="font-semibold text-blue-700">{totalItems}</span>
                </div>
                
                {/* Search Box */}
                <div className="relative w-full sm:w-56">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-400">
                    <FontAwesomeIcon icon={faSearch} className="text-sm" />
                  </span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search publications..."
                    className="pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                
                {/* Status Filter */}
                <div className="relative w-full sm:w-36">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-400">
                    <FontAwesomeIcon icon={faFilter} className="text-sm" />
                  </span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                    className="pl-8 pr-2 py-2 text-sm border border-gray-300 rounded-md w-full shadow-sm focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Right Side: Items Per Page + Refresh + Add Publication Button */}
              <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                {/* Items Per Page */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-700 whitespace-nowrap">Show:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                    className="px-2 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={75}>75</option>
                    <option value={100}>100</option>
                  </select>
                </div>

         

                {/* Add Publication Button */}
                <button
                  onClick={() => {
                    setName('');
                    setEditingId(null);
                    setIsModalOpen(true);
                  }}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md shadow-sm transition-colors whitespace-nowrap"
                >
                  <FontAwesomeIcon icon={faPlus} size="sm" />
                  Add Publication
                </button>
              </div>
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
                <div
                  ref={modalRef}
                  className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md transform transition-all duration-300 ease-out scale-95 animate-in fade-in-90 slide-in-from-bottom-10"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800">{editingId ? 'Edit Publication' : 'Add Publication'}</h3>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="text-red-600 hover:bg-gray-100 p-1 rounded flex items-center gap-1"
                    >
                      <FontAwesomeIcon icon={faTimes} size="lg" />
                    </button>
                  </div>
                  
                  <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                      <label htmlFor="publicationName" className="block text-sm font-medium text-gray-700 mb-1">
                        Publication Name
                      </label>
                      <input
                        id="publicationName"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter publication name"
                        className="p-3 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-200 flex items-center gap-2"
                      >
                        <FontAwesomeIcon icon={faTimes} /> Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
                      >
                        {editingId ? (
                          <>
                            <FontAwesomeIcon icon={faEdit} /> Update
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faPlus} /> Add
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Confirmation Modal */}
            {isConfirmModalOpen && (
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
                <div
                  ref={confirmModalRef}
                  className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm transform transition-all duration-300 ease-out scale-95 animate-in fade-in-90 slide-in-from-bottom-10"
                >
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Confirm Action</h3>
                  <p className="text-gray-600 mb-6">
                    Are you sure you want to {confirmAction === 'delete' 
                      ? 'delete this publication' 
                      : confirmStatus 
                        ? 'deactivate this publication' 
                        : 'activate this publication'}?
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setIsConfirmModalOpen(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-200 flex items-center gap-2"
                    >
                      <FontAwesomeIcon icon={faTimes} /> Cancel
                    </button>
                    <button
                      onClick={confirmAction === 'delete' ? handleDelete : handleToggleActive}
                      className={`px-4 py-2 text-white rounded-lg transition duration-200 flex items-center gap-2 shadow-md hover:shadow-lg ${
                        confirmAction === 'delete' 
                          ? 'bg-red-600 hover:bg-red-700' 
                          : confirmStatus 
                            ? 'bg-blue-600 hover:bg-blue-700' 
                            : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      <FontAwesomeIcon icon={confirmAction === 'delete' ? faTrash : confirmStatus ? faToggleOff : faToggleOn} /> 
                      {confirmAction === 'delete' ? 'Delete' : confirmStatus ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created On</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modified By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modified On</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableLoading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <FontAwesomeIcon 
                            icon={faSpinner} 
                            className="animate-spin text-blue-500" 
                            size="sm"
                          />
                          Loading...
                        </div>
                      </td>
                    </tr>
                  ) : currentPublications.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                        No publications found
                      </td>
                    </tr>
                  ) : (
                    currentPublications.map((publication) => (
                      <tr key={publication.PubId} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{publication.PubId}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{publication.Name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            publication.IsActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {publication.IsActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{publication.CreatedBy}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{new Date(publication.CreatedOn).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{publication.ModifiedBy || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{publication.ModifiedOn ? new Date(publication.ModifiedOn).toLocaleDateString() : '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(publication)}
                              className={`p-1 rounded transition-colors duration-200 ${
                              publication.IsActive
                                ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 cursor-pointer'
                                : 'text-gray-400 cursor-not-allowed opacity-60'
                              }`}
                              title={publication.IsActive ? "Edit" : "Please activate to edit"}
                              disabled={!publication.IsActive}
                            >
                              <FontAwesomeIcon icon={faEdit} />
                            </button>
                            <button
                              onClick={() => openConfirmModal('delete', publication.PubId)}
                              className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors duration-200"
                              title="Delete"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                            <button
                              onClick={() => openConfirmModal('toggle', publication.PubId, publication.IsActive)}
                              className={`p-1 rounded transition-colors duration-200 ${
                                publication.IsActive 
                                  ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50' 
                                  : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                              }`}
                              title={publication.IsActive ? 'Deactivate' : 'Activate'}
                            >
                              <FontAwesomeIcon icon={publication.IsActive ? faToggleOn : faToggleOff} size="lg" />
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
                {/* Pagination Info */}
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(endIndex, totalItems)}</span> of{' '}
                  <span className="font-medium">{totalItems}</span> publications
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
          </>
        )}
      </div>
    </div>
  );
};

export default PublicationsPage;
