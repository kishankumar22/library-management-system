'use client';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faSpinner, 
  faCopy, 
  faTrash, 
  faSync, 
  faEraser, 
  faFileCode, 
  faSort,
  faDownload,
  faFilter
} from '@fortawesome/free-solid-svg-icons';
import { format } from 'date-fns';

interface LogEntry {
  level?: string;
  message?: string;
  timestamp?: string;
  raw?: string;
  stack?: string;
  meta?: any;
}

export default function ViewLogs() {
  const [activeTab, setActiveTab] = useState('error');
  const [logContent, setLogContent] = useState<LogEntry[]>([]);
  const [filteredContent, setFilteredContent] = useState<LogEntry[]>([]);
  const [rawContent, setRawContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRaw, setShowRaw] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const logTypes = [
    { label: 'Error', value: 'error', color: 'bg-red-500 text-white hover:bg-red-600' },
    { label: 'Info', value: 'info', color: 'bg-blue-500 text-white hover:bg-blue-600' },
    { label: 'Combined', value: 'combined', color: 'bg-yellow-500 text-white hover:bg-yellow-600' },
    { label: 'Exceptions', value: 'exceptions', color: 'bg-purple-500 text-white hover:bg-purple-600' },
    { label: 'Rejections', value: 'rejections', color: 'bg-gray-600 text-white hover:bg-gray-700' },
  ];

  const fetchLogs = async (raw: boolean = false) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/logs?type=${activeTab}&raw=${raw}`);
      if (!response.ok) throw new Error('Failed to fetch logs');
      
      const data = await response.json();
      
      if (raw) {
        setRawContent(data.raw || '');
      } else {
        const sortedData = Array.isArray(data)
          ? data.sort((a, b) => {
              const timeA = new Date(a.timestamp || 0).getTime();
              const timeB = new Date(b.timestamp || 0).getTime();
              return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
            })
          : [];
        setLogContent(sortedData);
        setFilteredContent(sortedData);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      setError('Error loading logs. Please try again.');
      setLogContent([]);
      setRawContent('');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(showRaw);
  }, [activeTab, showRaw, sortOrder]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = logContent.filter(log =>
        (log.message?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.level?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.raw?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredContent(filtered);
    } else {
      setFilteredContent(logContent);
    }
    setCurrentPage(1);
  }, [searchTerm, logContent]);

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDelete = async (index: number) => {
    if (window.confirm('Are you sure you want to delete this log entry?')) {
      try {
        const response = await fetch(`/api/logs?type=${activeTab}&index=${index}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          await fetchLogs(showRaw);
        } else {
          const data = await response.json();
          setError(data.error || 'Failed to delete log');
        }
      } catch (err) {
        setError('Error deleting log. Please try again.');
      }
    }
  };

  const handleClearAllLogs = async () => {
    if (window.confirm(`Are you sure you want to clear all ${activeTab.toUpperCase()} logs? This action cannot be undone.`)) {
      try {
        const response = await fetch(`/api/logs?type=${activeTab}&clearAll=true`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          setLogContent([]);
          setFilteredContent([]);
          setRawContent('');
          alert(`${activeTab.toUpperCase()} logs cleared successfully!`);
        } else {
          const data = await response.json();
          setError(data.error || `Failed to clear ${activeTab} logs`);
        }
      } catch (err) {
        setError(`Error clearing ${activeTab} logs. Please try again.`);
      }
    }
  };

  const handleFormatLogs = async () => {
    try {
      const response = await fetch(`/api/logs?type=${activeTab}`, {
        method: 'POST',
      });
      
      if (response.ok) {
        await fetchLogs(showRaw);
        alert('Logs formatted successfully!');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to format logs');
      }
    } catch (err) {
      setError('Error formatting logs. Please try again.');
    }
  };

  const downloadLogs = () => {
    const content = showRaw ? rawContent : JSON.stringify(filteredContent, null, 2);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}-logs-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.${showRaw ? 'txt' : 'json'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'error':
        return 'bg-red-500 text-white';
      case 'info':
        return 'bg-blue-500 text-white';
      case 'warn':
      case 'warning':
        return 'bg-yellow-500 text-white';
      case 'debug':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredContent.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLogs = filteredContent.slice(startIndex, endIndex);

  return (
    <div className="p-2 bg-gray-50 min-h-screen">
      {/* Compact Controls */}
      <div className="bg-white rounded-lg shadow-sm p-3 mb-2 border border-gray-200">
        {/* Log Type Tabs + Controls in Same Row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Log Tabs */}
          {logTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setActiveTab(type.value)}
              className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all shadow-sm ${
                activeTab === type.value ? 'ring-2 ring-blue-300' : ''
              } ${type.color}`}
            >
              {type.label}
            </button>
          ))}

          <div className="h-6 w-px bg-gray-300 mx-1"></div>

          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <FontAwesomeIcon
              icon={faFilter}
              className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs"
            />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg w-full focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Per Page */}
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>

          {/* Stats */}
          <div className="flex items-center gap-0 rounded-lg border-2 border-gray-200 overflow-hidden shadow-sm">
            <div className="px-2 py-1 bg-blue-100 border-r border-gray-200" title="Total">
              <span className="text-[10px] text-blue-700 font-bold">{filteredContent.length}</span>
            </div>
            <div className="px-2 py-1 bg-red-100 border-r border-gray-200" title="Errors">
              <span className="text-[10px] text-red-700 font-bold">
                {filteredContent.filter(log => log.level?.toLowerCase() === 'error').length}
              </span>
            </div>
            <div className="px-2 py-1 bg-yellow-100 border-r border-gray-200" title="Warnings">
              <span className="text-[10px] text-yellow-700 font-bold">
                {filteredContent.filter(log => log.level?.toLowerCase() === 'warn').length}
              </span>
            </div>
            <div className="px-2 py-1 bg-green-100" title="Info">
              <span className="text-[10px] text-green-700 font-bold">
                {filteredContent.filter(log => log.level?.toLowerCase() === 'info').length}
              </span>
            </div>
          </div>

          {/* Actions */}
          <button onClick={() => fetchLogs(showRaw)} className="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg" title="Refresh">
            <FontAwesomeIcon icon={faSync} className="w-3 h-3" />
          </button>

          <button onClick={toggleSortOrder} className="px-2 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs rounded-lg" title="Sort">
            <FontAwesomeIcon icon={faSort} className="w-3 h-3" />
          </button>

          <button onClick={() => setShowRaw(!showRaw)} className="px-2 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg" title={showRaw ? 'Parsed' : 'Raw'}>
            <FontAwesomeIcon icon={faFileCode} className="w-3 h-3" />
          </button>

          <button onClick={downloadLogs} className="px-2 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg" title="Download">
            <FontAwesomeIcon icon={faDownload} className="w-3 h-3" />
          </button>

          <button onClick={handleFormatLogs} className="px-2 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg" title="Format">
            <FontAwesomeIcon icon={faFileCode} className="w-3 h-3" />
          </button>

          <button onClick={handleClearAllLogs} className="px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg" title="Clear">
            <FontAwesomeIcon icon={faEraser} className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden min-h-[75vh]">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <FontAwesomeIcon icon={faSpinner} spin className="w-6 h-6 text-blue-600 mr-2" />
            <span className="text-gray-600 text-sm">Loading logs...</span>
          </div>
        ) : showRaw ? (
          <div className="p-3">
            <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded-lg overflow-auto max-h-[70vh] font-mono whitespace-pre-wrap">
              {rawContent || 'No raw content available'}
            </pre>
          </div>
        ) : currentLogs.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-blue-600 text-white sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold">Level</th>
                    <th className="px-3 py-2 text-left font-bold">Message</th>
                    <th className="px-3 py-2 text-left font-bold">Timestamp</th>
                    <th className="px-3 py-2 text-center font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentLogs.map((log, index) => (
                    <tr key={startIndex + index} className="hover:bg-blue-50 transition-colors">
                      <td className="px-3 py-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${getLevelColor(log.level || 'unknown')}`}>
                          {log.level?.toUpperCase() || 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="max-w-2xl">
                          <div className="text-gray-900 truncate" title={log.message || log.raw}>
                            {log.message || log.raw || 'No message'}
                          </div>
                          {log.stack && (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-800">
                                View stack trace
                              </summary>
                              <pre className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded-lg overflow-x-auto max-h-40">
                                {log.stack}
                              </pre>
                            </details>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                        {log.timestamp
                          ? format(new Date(log.timestamp), 'dd MMM, HH:mm:ss')
                          : 'N/A'
                        }
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => copyToClipboard(log.message || log.raw || '')}
                            className="text-blue-600 hover:bg-blue-100 p-1.5 rounded-lg transition-all"
                            title="Copy"
                          >
                            <FontAwesomeIcon icon={faCopy} className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(startIndex + index)}
                            className="text-red-600 hover:bg-red-100 p-1.5 rounded-lg transition-all"
                            title="Delete"
                          >
                            <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Compact Pagination */}
            {totalPages > 1 && (
              <div className="bg-gray-50 px-3 py-2 flex items-center justify-between border-t border-gray-200">
                <div className="text-xs text-gray-700">
                  {startIndex + 1}-{Math.min(endIndex, filteredContent.length)} of {filteredContent.length}
                </div>
                <div className="flex gap-1 items-center">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="px-2 py-1 text-xs bg-blue-600 text-white rounded font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">No logs available for the selected type.</p>
          </div>
        )}
      </div>
    </div>
  );
}
