'use client';
import { useUser } from '@/app/hooks/useUser';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faEye, faEyeSlash, faArrowLeft, faPlus, faEdit, faTrash, faSearch, faFilter, faTimes, faToggleOff, faToggleOn, faRefresh, faChevronLeft, faChevronRight, faAnglesLeft, faAnglesRight }
 from '@fortawesome/free-solid-svg-icons';
import { Subject } from '@/types';

const SubjectsPage = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
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
    fetchSubjects();
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

  const fetchSubjects = async () => {
    setTableLoading(true);
    try {
      const params = { search: searchTerm, status: statusFilter };
      const res = await axios.get('/api/subject', { params });
      setSubjects(res.data);
    } catch (error) {
      toast.error('Failed to fetch subjects');
    } finally {
      setTableLoading(false);
      setInitialLoading(false);
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
      toast.error('Please enter a valid subject name');
      return;
    }
    if (formattedName.length > 100) {
      toast.error('Subject name cannot exceed 100 characters');
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
          SubId: editingId,
          ModifiedBy: user?.name || 'system',
          ModifiedOn: timestamp,
        }),
      };
      const res = await axios({
        method: editingId ? 'put' : 'post',
        url: '/api/subject',
        data: payload,
      });
      toast.success(editingId ? 'Subject updated' : 'Subject added');
      setName('');
      setEditingId(null);
      setIsModalOpen(false);
      fetchSubjects();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'An error occurred';
      toast.error(errorMsg);
    }
  };

  const handleEdit = (subject: Subject) => {
    setName(subject.Name);
    setEditingId(subject.SubId);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!confirmId) return;
    try {
      await axios.delete('/api/subject', {
        data: { SubId: confirmId },
      });
      toast.success('Subject deleted successfully');
      setIsConfirmModalOpen(false);
      fetchSubjects();
    } catch (error: any) {
      const msg =
        error.response?.status === 409
          ? error.response?.data?.message || 'Subject is linked to books and cannot be deleted.'
          : error.response?.data?.message || 'An error occurred while deleting subject';
      toast.error(msg);
    }
  };

  const handleToggleActive = async () => {
    if (!confirmId || confirmStatus === null) return;
    try {
      const subject = subjects.find(s => s.SubId === confirmId);
      if (!subject) throw new Error('Subject not found');
      await axios.put('/api/subject', {
        SubId: confirmId,
        Name: subject.Name,
        IsActive: !confirmStatus,
        ModifiedBy: user?.name || 'system',
        ModifiedOn: new Date().toISOString(),
      });
      toast.success(`Subject ${confirmStatus ? 'deactivated' : 'activated'}`);
      setIsConfirmModalOpen(false);
      fetchSubjects();
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

  // Filter subjects based on search and status
  const filteredSubjects = subjects.filter((subject) => {
    const matchesSearch = subject.Name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && subject.IsActive) ||
      (statusFilter === 'inactive' && !subject.IsActive);
    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalItems = filteredSubjects.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSubjects = filteredSubjects.slice(startIndex, endIndex);

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
    <div className="">
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
                {/* Total Subjects */}
                <div className="text-sm text-gray-700 whitespace-nowrap">
                  Total Subjects: <span className="font-semibold text-blue-700">{totalItems}</span>
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
                    placeholder="Search subjects..."
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

              {/* Right Side: Items Per Page + Refresh + Add Subject Button */}
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


                {/* Add Subject Button */}
                <button
                  onClick={() => {
                    setName('');
                    setEditingId(null);
                    setIsModalOpen(true);
                  }}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md shadow-sm transition-colors whitespace-nowrap"
                >
                  <FontAwesomeIcon icon={faPlus} size="sm" />
                  Add Subject
                </button>
              </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
              <div className="fixed inset-0  bg-black/30 backdrop-blur-sm flex items-center justify-center p-3 z-50">
                <div
                  ref={modalRef}
                  className="bg-white rounded-lg shadow-lg p-4 w-full max-w-sm"
                >
                  <div className='flex justify-between items-center mb-4'>
                    <h3 className="text-lg font-semibold">{editingId ? 'Edit Subject' : 'Add Subject'}</h3>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="text-sm text-red-600 px-2 rounded hover:bg-gray-100 flex items-center gap-1"
                    >
                      <FontAwesomeIcon icon={faTimes} size="lg" />
                    </button>
                  </div>
                  
                  <form onSubmit={handleSubmit}>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Subject Name"
                      className="p-2 text-sm border border-gray-300 rounded w-full mb-3 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="text-sm bg-gray-200 text-gray-800 py-1.5 px-3 rounded hover:bg-gray-300 flex items-center gap-1"
                      >
                        <FontAwesomeIcon icon={faTimes} size="xs" /> Cancel
                      </button>
                      <button
                        type="submit"
                        className="text-sm bg-blue-600 text-white py-1.5 px-3 rounded hover:bg-blue-700 flex items-center gap-1"
                      >
                        {editingId ? (
                          <>
                            <FontAwesomeIcon icon={faEdit} size="xs" /> Update
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faPlus} size="xs" /> Add
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
              <div className="fixed inset-0  bg-black/30 backdrop-blur-sm flex items-center justify-center p-3 z-50">
                <div
                  ref={confirmModalRef}
                  className="bg-white rounded-lg shadow-lg p-4 w-full max-w-xs"
                >
                  <h3 className="text-lg font-semibold mb-2">Confirm Action</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {confirmAction === 'delete' 
                      ? 'Delete this subject?' 
                      : confirmStatus 
                        ? 'Deactivate this subject?' 
                        : 'Activate this subject?'}
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsConfirmModalOpen(false)}
                      className="text-sm bg-gray-200 text-gray-800 py-1.5 px-3 rounded hover:bg-gray-300 flex items-center gap-1"
                    >
                      <FontAwesomeIcon icon={faTimes} size="xs" /> Cancel
                    </button>
                    <button
                      onClick={confirmAction === 'delete' ? handleDelete : handleToggleActive}
                      className={`text-sm text-white py-1.5 px-3 rounded flex items-center gap-1 ${
                        confirmAction === 'delete' 
                          ? 'bg-red-600 hover:bg-red-700' 
                          : confirmStatus 
                            ? 'bg-blue-600 hover:bg-blue-700' 
                            : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      <FontAwesomeIcon 
                        icon={confirmAction === 'delete' ? faTrash : confirmStatus ? faToggleOff : faToggleOn} 
                        size="xs" 
                      /> 
                      {confirmAction === 'delete' ? 'Delete' : confirmStatus ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto rounded border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created On</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modified By</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modified On</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableLoading ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-sm text-gray-600">
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
                  ) : currentSubjects.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-sm text-gray-500">
                        No subjects found
                      </td>
                    </tr>
                  ) : (
                    currentSubjects.map((subject) => (
                      <tr key={subject.SubId} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap text-sm">{subject.SubId}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">{subject.Name}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            subject.IsActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {subject.IsActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">{subject.CreatedBy}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">{new Date(subject.CreatedOn).toLocaleDateString()}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">{subject.ModifiedBy || '-'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">{subject.ModifiedOn ? new Date(subject.ModifiedOn).toLocaleDateString() : '-'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(subject)}
                              className={`text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 ${!subject.IsActive ? 'cursor-not-allowed opacity-60' : ''}`}
                              title={subject.IsActive ? 'Edit' : 'Please activate to edit'}
                              disabled={!subject.IsActive}
                            >
                              <FontAwesomeIcon icon={faEdit} size="sm" />
                            </button>
                            <button
                              onClick={() => openConfirmModal('delete', subject.SubId)}
                              className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                              title="Delete"
                            >
                              <FontAwesomeIcon icon={faTrash} size="sm" />
                            </button>
                            <button
                              onClick={() => openConfirmModal('toggle', subject.SubId, subject.IsActive)}
                              className={`p-1 rounded ${
                                subject.IsActive 
                                  ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50' 
                                  : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                              }`}
                              title={subject.IsActive ? 'Deactivate' : 'Activate'}
                            >
                              <FontAwesomeIcon icon={subject.IsActive ? faToggleOn : faToggleOff} size="lg" />
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
                  <span className="font-medium">{totalItems}</span> subjects
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

export default SubjectsPage;
