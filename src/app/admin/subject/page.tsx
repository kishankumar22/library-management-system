'use client';
import { useUser } from '@/app/hooks/useUser';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faEye, faEyeSlash, faArrowLeft, faPlus, faEdit, faTrash, faSearch, faFilter, faTimes, faToggleOff, faToggleOn, faRefresh, faChevronLeft, faChevronRight, faAnglesLeft, faAnglesRight, faRotateLeft, faExclamationCircle }
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
{/* Compact Header - Subjects */}
{/* Enhanced Compact Header - Subjects */}
<div className="bg-white rounded-lg shadow-sm p-3 mb-2 border border-gray-200">
  <div className="flex flex-wrap items-center gap-2">
    {/* Search */}
    <div className="relative flex-1 min-w-[200px]">
      <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search subjects..."
        className="pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg w-full focus:outline-none focus:border-blue-500"
      />
    </div>

    {/* Status Filter */}
    <select
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
      className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
    >
      <option value="all">All Status</option>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
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

    {/* Clear Filter Button */}
    <button
      onClick={() => {
        setSearchTerm('');
        setStatusFilter('all');
        setCurrentPage(1);
      }}
      className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 text-xs font-medium rounded-lg transition-all"
      title="Clear All Filters"
    >
      <FontAwesomeIcon icon={faRotateLeft} />
    </button>

    {/* Add Button */}
    <button
      onClick={() => {
        setName('');
        setEditingId(null);
        setIsModalOpen(true);
      }}
      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap"
    >
      <FontAwesomeIcon icon={faPlus} className="mr-1" />
      Add Subject
    </button>

    {/* Count Info */}
    <span className="text-xs text-gray-600 font-medium">
      {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems}
    </span>
  </div>
</div>


            {/* Modal */}
{/* Enhanced Add/Edit Modal */}
{isModalOpen && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 z-50">
    <div
      ref={modalRef}
      className="bg-white rounded-lg shadow-2xl w-full max-w-md"
    >
      {/* Header */}
      <div className="bg-blue-600 px-4 py-3 rounded-t-lg flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <FontAwesomeIcon icon={editingId ? faEdit : faPlus} />
          {editingId ? 'Edit Subject' : 'Add Subject'}
        </h3>
        <button
          type="button"
          onClick={() => setIsModalOpen(false)}
          className="text-white hover:bg-blue-700 p-2 rounded transition-all"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>
      
      {/* Body */}
      <form onSubmit={handleSubmit} className="p-4">
        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-700 mb-2">
            Subject Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter subject name"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            autoFocus
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t">
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
          >
            <FontAwesomeIcon icon={faTimes} className="mr-1" />
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm"
          >
            {editingId ? (
              <>
                <FontAwesomeIcon icon={faEdit} className="mr-1" />
                Update
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faPlus} className="mr-1" />
                Add
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

{/* Enhanced Confirmation Modal */}
{isConfirmModalOpen && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 z-50">
    <div
      ref={confirmModalRef}
      className="bg-white rounded-lg shadow-2xl w-full max-w-sm"
    >
      {/* Header */}
      <div className={`px-4 py-3 rounded-t-lg ${
        confirmAction === 'delete' 
          ? 'bg-red-600' 
          : confirmStatus 
            ? 'bg-orange-600' 
            : 'bg-green-600'
      }`}>
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <FontAwesomeIcon 
            icon={confirmAction === 'delete' ? faTrash : confirmStatus ? faToggleOff : faToggleOn} 
          />
          Confirm Action
        </h3>
      </div>

      {/* Body */}
      <div className="p-4">
        <p className="text-sm text-gray-700 mb-4">
          {confirmAction === 'delete' 
            ? 'Are you sure you want to delete this subject?' 
            : confirmStatus 
              ? 'Are you sure you want to deactivate this subject?' 
              : 'Are you sure you want to activate this subject?'}
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t">
          <button
            onClick={() => setIsConfirmModalOpen(false)}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
          >
            <FontAwesomeIcon icon={faTimes} className="mr-1" />
            Cancel
          </button>
          <button
            onClick={confirmAction === 'delete' ? handleDelete : handleToggleActive}
            className={`px-4 py-2 text-sm text-white rounded-lg transition-all shadow-sm ${
              confirmAction === 'delete' 
                ? 'bg-red-600 hover:bg-red-700' 
                : confirmStatus 
                  ? 'bg-orange-600 hover:bg-orange-700' 
                  : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            <FontAwesomeIcon 
              icon={confirmAction === 'delete' ? faTrash : confirmStatus ? faToggleOff : faToggleOn} 
              className="mr-1"
            /> 
            {confirmAction === 'delete' ? 'Delete' : confirmStatus ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  </div>
)}


  {/* Enhanced Confirmation Modal */}
{isConfirmModalOpen && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 z-50">
    <div
      ref={confirmModalRef}
      className="bg-white rounded-lg shadow-2xl w-full max-w-sm"
    >
      {/* Header */}
      <div className={`px-4 py-3 rounded-t-lg ${
        confirmAction === 'delete' 
          ? 'bg-red-600' 
          : confirmStatus 
            ? 'bg-orange-600' 
            : 'bg-green-600'
      }`}>
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <FontAwesomeIcon 
            icon={confirmAction === 'delete' ? faTrash : confirmStatus ? faToggleOff : faToggleOn} 
          />
          Confirm Action
        </h3>
      </div>

      {/* Body */}
      <div className="p-4">
        <p className="text-sm text-gray-700 mb-4">
          {confirmAction === 'delete' 
            ? 'Are you sure you want to delete this subject?' 
            : confirmStatus 
              ? 'Are you sure you want to deactivate this subject?' 
              : 'Are you sure you want to activate this subject?'}
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t">
          <button
            onClick={() => setIsConfirmModalOpen(false)}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
          >
            <FontAwesomeIcon icon={faTimes} className="mr-1" />
            Cancel
          </button>
          <button
            onClick={confirmAction === 'delete' ? handleDelete : handleToggleActive}
            className={`px-4 py-2 text-sm text-white rounded-lg transition-all shadow-sm ${
              confirmAction === 'delete' 
                ? 'bg-red-600 hover:bg-red-700' 
                : confirmStatus 
                  ? 'bg-orange-600 hover:bg-orange-700' 
                  : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            <FontAwesomeIcon 
              icon={confirmAction === 'delete' ? faTrash : confirmStatus ? faToggleOff : faToggleOn} 
              className="mr-1"
            /> 
            {confirmAction === 'delete' ? 'Delete' : confirmStatus ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  </div>
)}

            {/* Table */}
   {/* Table */}
<div className="overflow-x-auto rounded-lg border min-h-[72vh] border-gray-200 bg-white shadow-md">
  <table className="min-w-full text-xs">
    <thead className="bg-blue-600 text-white sticky top-0">
      <tr>
        <th className="px-3 py-2 text-left font-bold">ID</th>
        <th className="px-3 py-2 text-left font-bold">📚 Subject Name</th>
        <th className="px-3 py-2 text-center font-bold">Status</th>
        <th className="px-3 py-2 text-left font-bold">Created By</th>
        <th className="px-3 py-2 text-left font-bold">Created On</th>
        <th className="px-3 py-2 text-left font-bold">Modified By</th>
        <th className="px-3 py-2 text-left font-bold">Modified On</th>
        <th className="px-3 py-2 text-center font-bold">Actions</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-100">
      {tableLoading ? (
        <tr>
          <td colSpan={8} className="px-6 py-12 text-center">
            <div className="flex justify-center items-center gap-2">
              <FontAwesomeIcon 
                icon={faSpinner} 
                className="animate-spin text-blue-600" 
                size="lg"
              />
              <span className="text-gray-600">Loading subjects...</span>
            </div>
          </td>
        </tr>
      ) : currentSubjects.length === 0 ? (
        <tr>
          <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
            <FontAwesomeIcon icon={faExclamationCircle} className="text-4xl mb-2 text-gray-300" />
            <p className="font-medium">No subjects found</p>
          </td>
        </tr>
      ) : (
        currentSubjects.map((subject) => (
          <tr key={subject.SubId} className="hover:bg-blue-50 transition-colors">
            <td className="px-3 py-2 font-bold text-gray-700">{subject.SubId}</td>
            <td className="px-3 py-2 font-bold text-gray-900 uppercase">{subject.Name}</td>
            <td className="px-3 py-2 text-center">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-semibold ${
                subject.IsActive 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-500 text-white'
              }`}>
                <FontAwesomeIcon 
                  icon={subject.IsActive ? faToggleOn : faToggleOff} 
                  className="mr-1" 
                />
                {subject.IsActive ? 'Active' : 'Inactive'}
              </span>
            </td>
            <td className="px-3 py-2 text-gray-700">{subject.CreatedBy}</td>
            <td className="px-3 py-2 text-gray-600">
              {new Date(subject.CreatedOn).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </td>
            <td className="px-3 py-2 text-gray-700">
              {subject.ModifiedBy || <span className="text-gray-400 italic">—</span>}
            </td>
            <td className="px-3 py-2 text-gray-600">
              {subject.ModifiedOn 
                ? new Date(subject.ModifiedOn).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })
                : <span className="text-gray-400 italic">—</span>
              }
            </td>
            <td className="px-3 py-2">
              <div className="flex justify-center items-center gap-2">
                <button
                  onClick={() => handleEdit(subject)}
                  className={`p-1.5 rounded-lg transition-all ${
                    subject.IsActive
                      ? 'text-blue-600 hover:bg-blue-100 cursor-pointer'
                      : 'text-gray-400 cursor-not-allowed opacity-50'
                  }`}
                  title={subject.IsActive ? "Edit Subject" : "Activate to edit"}
                  disabled={!subject.IsActive}
                >
                  <FontAwesomeIcon icon={faEdit} />
                </button>
                <button
                  onClick={() => openConfirmModal('delete', subject.SubId)}
                  className="text-red-600 hover:bg-red-100 p-1.5 rounded-lg transition-all"
                  title="Delete Subject"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
                <button
                  onClick={() => openConfirmModal('toggle', subject.SubId, subject.IsActive)}
                  className={`p-1.5 rounded-lg transition-all ${
                    subject.IsActive 
                      ? 'text-orange-600 hover:bg-orange-100' 
                      : 'text-green-600 hover:bg-green-100'
                  }`}
                  title={subject.IsActive ? 'Deactivate' : 'Activate'}
                >
                  <FontAwesomeIcon icon={subject.IsActive ? faToggleOff : faToggleOn} size="lg" />
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
