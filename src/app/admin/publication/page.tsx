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
  faTimes
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
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
 const user = useUser();

  const modalRef = useRef<HTMLDivElement>(null);
  const confirmModalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPublications();
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

  const fetchPublications = async () => {
    setTableLoading(true);
    try {
      const params = { search: searchTerm, status: statusFilter };
      const res = await axios.get('/api/publication', { params });
      setPublications(res.data);
    } catch (error) {
      toast.error('Failed to fetch publications');
    } finally {
      setLoading(false);
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
  } catch (error) {
    toast.error('An error occurred');
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
        ? error.response?.data?.message
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

  const filteredPublications = publications.filter((publication) => {
    const matchesSearch = publication.Name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && publication.IsActive) ||
      (statusFilter === 'inactive' && !publication.IsActive);
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="bg-white w-full rounded-lg shadow-sm px-4 py-1">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Manage Publications</h2>

        <div className="flex flex-col sm:flex-row justify-between mb-6 gap-4">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <div className="flex-grow mt-1 text-blue-700 sm:flex-grow-0 sm:w-36">
                  Total Publications: <span className="font-semibold">{filteredPublications.length}</span>
                </div>
              </div>
            
            <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search publications..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="relative flex-grow sm:flex-grow-0 sm:w-40">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faFilter} className="text-gray-400" />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
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
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 flex items-center gap-2 shadow-md hover:shadow-lg"
          >
            <FontAwesomeIcon icon={faPlus} /> Add Publication
          </button>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
            <div
              ref={modalRef}
              className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md transform transition-all duration-300 ease-out scale-95 animate-in fade-in-90 slide-in-from-bottom-10"
            >
              <h3 className="text-xl font-bold text-gray-800 mb-4">{editingId ? 'Edit Publication' : 'Add Publication'}</h3>
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
                    <FontAwesomeIcon icon={faTimes	} /> Cancel
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

        {isConfirmModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
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
                  <FontAwesomeIcon icon={faTimes	} /> Cancel
                </button>
                <button
                  onClick={confirmAction === 'delete' ? handleDelete : handleToggleActive}
                  className={`px-4 py-2 text-white rounded-lg transition duration-200 flex items-center gap-2 shadow-md hover:shadow-lg ${
                    confirmAction === 'delete' 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : confirmStatus 
                        ? 'bg-amber-600 hover:bg-amber-700' 
                        : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  <FontAwesomeIcon icon={confirmAction === 'delete' ? faTrash : confirmStatus ? faEyeSlash : faEye} /> 
                  {confirmAction === 'delete' ? 'Delete' : confirmStatus ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          </div>
        )}

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
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center">
                    <div className="flex justify-center">
                      <FontAwesomeIcon 
                        icon={faSpinner} 
                        className="animate-spin h-8 w-8 text-blue-500" 
                      />
                    </div>
                  </td>
                </tr>
              ) : tableLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <FontAwesomeIcon 
                        icon={faSpinner} 
                        className="animate-spin h-5 w-5 text-blue-500" 
                      />
                      <span className="ml-2 text-gray-600">Loading publications...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPublications.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    No publications found
                  </td>
                </tr>
              ) : (
                filteredPublications.map((publication) => (
                  <tr key={publication.PubId} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{publication.PubId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{publication.Name}</td>
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
                          className={`transition-colors duration-200 ${
                          publication.IsActive
                            ? 'text-blue-600 hover:text-blue-900 cursor-pointer '
                            : 'text-gray-400 cursor-not-allowed'
                          }`}
                          title={publication.IsActive ? "Edit" : "Activate first, then edit"}
                          disabled={!publication.IsActive}
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button
                          onClick={() => openConfirmModal('delete', publication.PubId)}
                          className="text-red-600 hover:text-red-900 transition-colors duration-200"
                          title="Delete"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                        <button
                          onClick={() => openConfirmModal('toggle', publication.PubId, publication.IsActive)}
                          className={`transition-colors duration-200 ${
                            publication.IsActive 
                              ? 'text-amber-600 hover:text-amber-900' 
                              : 'text-green-600 hover:text-green-900'
                          }`}
                          title={publication.IsActive ? 'Deactivate' : 'Activate'}
                        >
                          <FontAwesomeIcon icon={publication.IsActive ? faEyeSlash : faEye} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PublicationsPage;