'use client';

import { useEffect, useState, useRef } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner,  faEye,faEyeSlash,faArrowLeft,  faPlus,faEdit, faTrash, faSearch,  faFilter, faTimes }
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
  const [initialLoading, setInitialLoading] = useState(true); // Initial full-page loader
  const [tableLoading, setTableLoading] = useState(false); // Table-specific loader

  const modalRef = useRef<HTMLDivElement>(null);
  const confirmModalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSubjects();
  }, [searchTerm, statusFilter]);

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
      setInitialLoading(false); // Turn off initial loader after first fetch
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
      const payload = {
        Name: formattedName,
        IsActive: true,
        CreatedBy: 'admin',
        CreatedOn: new Date().toISOString(),
        ...(editingId && { SubId: editingId, ModifiedBy: 'admin', ModifiedOn: new Date().toISOString() }),
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
      await axios.delete('/api/subject', { data: { SubId: confirmId } });
      toast.success('Subject deleted');
      setIsConfirmModalOpen(false);
      fetchSubjects();
    } catch (error) {
      toast.error('An error occurred');
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
        ModifiedBy: 'admin',
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

  const filteredSubjects = subjects.filter((subject) => {
    const matchesSearch = subject.Name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && subject.IsActive) ||
      (statusFilter === 'inactive' && !subject.IsActive);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="">
      <div className="bg-white w-full rounded-lg shadow-sm px-4 py-1">
        {initialLoading ? (
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-500 text-4xl mb-2" />
              <p className="text-gray-600 text-lg">Loading...</p>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-3 text-gray-800">Manage Subjects</h2>

            <div className="flex flex-col sm:flex-row justify-between mb-2 gap-2">
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative flex-grow sm:flex-grow-0 sm:w-56">
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <FontAwesomeIcon icon={faSearch} className="text-gray-400 text-sm" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search subjects..."
                    className="pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="relative flex-grow sm:flex-grow-0 sm:w-36">
                  <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                    <FontAwesomeIcon icon={faFilter} className="text-gray-400 text-sm" />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                    className="pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => {
                  setName('');
                  setEditingId(null);
                  setIsModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1.5 px-3 rounded flex items-center gap-1"
              >
                <FontAwesomeIcon icon={faPlus} size="xs" /> Add Subject
              </button>
            </div>

            {isModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50">
                <div
                  ref={modalRef}
                  className="bg-white rounded-lg shadow-md p-4 w-full max-w-sm"
                >
                  <div className='flex justify-between items-center mb-4'>
                    <h3 className="text-lg font-semibold mb-3">{editingId ? 'Edit Subject' : 'Add Subject'}</h3> <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="text-sm  text-red-600  px-2 rounded hover:bg-gray-300 flex items-center gap-1"
                      >
                        <FontAwesomeIcon icon={faTimes} size="2xl" />
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
                        <FontAwesomeIcon icon={faArrowLeft} size="xs" /> Cancel
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

            {isConfirmModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50">
                <div
                  ref={confirmModalRef}
                  className="bg-white rounded-lg shadow-md p-4 w-full max-w-xs"
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
                      <FontAwesomeIcon icon={faArrowLeft} size="xs" /> Cancel
                    </button>
                    <button
                      onClick={confirmAction === 'delete' ? handleDelete : handleToggleActive}
                      className={`text-sm text-white py-1.5 px-3 rounded flex items-center gap-1 ${
                        confirmAction === 'delete' 
                          ? 'bg-red-600 hover:bg-red-700' 
                          : confirmStatus 
                            ? 'bg-amber-600 hover:bg-amber-700' 
                            : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      <FontAwesomeIcon 
                        icon={confirmAction === 'delete' ? faTrash : confirmStatus ? faEyeSlash : faEye} 
                        size="xs" 
                      /> 
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
                      <td colSpan={8} className="px-3 py-2 text-center text-sm text-gray-600">
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
                  ) : filteredSubjects.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-2 text-center text-sm text-gray-500">
                        No subjects found
                      </td>
                    </tr>
                  ) : (
                    filteredSubjects.map((subject) => (
                      <tr key={subject.SubId} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap text-sm">{subject.SubId}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">{subject.Name}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full ${
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
                              className={`text-blue-600 hover:text-blue-800 p-1 ${!subject.IsActive ? 'cursor-not-allowed opacity-60' : ''}`}
                              title={subject.IsActive ? 'Edit' : 'Please activate to edit'}
                              disabled={!subject.IsActive}
                            >
                              <FontAwesomeIcon icon={faEdit} size="sm" />
                            </button>
                            <button
                              onClick={() => openConfirmModal('delete', subject.SubId)}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="Delete"
                            >
                              <FontAwesomeIcon icon={faTrash} size="sm" />
                            </button>
                            <button
                              onClick={() => openConfirmModal('toggle', subject.SubId, subject.IsActive)}
                              className={`p-1 ${
                                subject.IsActive ? 'text-amber-600 hover:text-amber-800' : 'text-green-600 hover:text-green-800'
                              }`}
                              title={subject.IsActive ? 'Deactivate' : 'Activate'}
                            >
                              <FontAwesomeIcon icon={subject.IsActive ? faEyeSlash : faEye} size="sm" />
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

export default SubjectsPage;