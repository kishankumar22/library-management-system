// library-management-system/src/app/admin/subjects/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import { Subject } from '../../../types/index';

const SubjectsPage = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await fetch('/api/subjects');
      const data = await res.json();
      if (res.ok) {
        setSubjects(data);
      } else {
        // toast.error(data.message);
      }
    } catch (error) {
      // toast.error('Failed to fetch subjects');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/subjects', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, name, isActive: true }),
      });
      if (res.ok) {
        toast.success(editingId ? 'Subject updated' : 'Subject added');
        setName('');
        setEditingId(null);
        // fetchSubjects();
      } else {
        const data = await res.json();
        // toast.error(data.message);
      }
    } catch (error) {
      // toast.error('An error occurred');
    }
  };

  const handleEdit = (subject: Subject) => {
    setName(subject.name);
    setEditingId(subject.id);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch('/api/subjects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success('Subject deleted');
        fetchSubjects();
      } else {
        const data = await res.json();
        // toast.error(data.message);
      }
    } catch (error) {
      // toast.error('An error occurred');
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      const res = await fetch('/api/subjects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !isActive }),
      });
      if (res.ok) {
        toast.success(`Subject ${isActive ? 'deactivated' : 'activated'}`);
        fetchSubjects();
      } else {
        const data = await res.json();
        // toast.error(data.message);
      }
    } catch (error) {
      // toast.error('An error occurred');
    }
  };

  return (
    
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-4">Manage Subjects</h2>
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Subject Name"
              className="p-2 border rounded flex-1"
              required
            />
            <button type="submit" className="bg-blue-600 text-white p-2 rounded">
              {editingId ? 'Update' : 'Add'} Subject
            </button>
          </div>
        </form>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border p-2">ID</th>
              <th className="border p-2">Name</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => (
              <tr key={subject.id}>
                <td className="border p-2">{subject.id}</td>
                <td className="border p-2">{subject.name}</td>
                <td className="border p-2">{subject.isActive ? 'Active' : 'Inactive'}</td>
                <td className="border p-2">
                  <button
                    onClick={() => handleEdit(subject)}
                    className="bg-yellow-500 text-white p-1 rounded mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(subject.id)}
                    className="bg-red-500 text-white p-1 rounded mr-2"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => handleToggleActive(subject.id, subject.isActive)}
                    className="bg-green-500 text-white p-1 rounded"
                  >
                    {subject.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
 
  );
};

export default SubjectsPage;