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
    { label: 'Error', value: 'error', color: 'bg-red-100 text-red-700 hover:bg-red-200' },
    { label: 'Info', value: 'info', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
    { label: 'Combined', value: 'combined', color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
    { label: 'Exceptions', value: 'exceptions', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
    { label: 'Rejections', value: 'rejections', color: 'bg-gray-200 text-gray-700 hover:bg-gray-300' },
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
        return 'text-red-600 bg-red-50 border-red-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'warn':
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'debug':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTabStyle = (type: any, isActive: boolean) => {
    const base = `px-3 py-1.5 rounded-md font-medium text-sm transition-all duration-200 ${
      isActive ? 'ring-2 ring-blue-300 shadow-md' : 'hover:shadow-sm'
    }`;
    return `${base} ${type.color}`;
  };

  // Pagination
  const totalPages = Math.ceil(filteredContent.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLogs = filteredContent.slice(startIndex, endIndex);

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      {/* Compact Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">System Logs Dashboard</h1>
        <p className="text-sm text-gray-600">Monitor and manage application logs</p>
      </div>

      {/* Compact Controls */}
      <div className="bg-white rounded-lg shadow-sm p-3 mb-4">
        {/* Log Type Tabs */}
        <div className="flex flex-wrap gap-2 mb-3">
          {logTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setActiveTab(type.value)}
              className={getTabStyle(type, activeTab === type.value)}
              title={`Switch to ${type.label} logs`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Inline Controls */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          {/* Left side - Search and Per Page */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48"
                title="Search through log messages and levels"
              />
              <FontAwesomeIcon
                icon={faFilter}
                className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3"
              />
            </div>

            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              title="Select number of entries per page"
            >
              <option value={25}>25/page</option>
              <option value={50}>50/page</option>
              <option value={100}>100/page</option>
              <option value={200}>200/page</option>
            </select>

            {/* Stats inline */}
            <div className="flex gap-3 text-xs">
              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded" title="Total entries">
                Total: {filteredContent.length}
              </span>
              <span className="px-2 py-1 bg-red-50 text-red-700 rounded" title="Error entries">
                Errors: {filteredContent.filter(log => log.level?.toLowerCase() === 'error').length}
              </span>
              <span className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded" title="Warning entries">
                Warns: {filteredContent.filter(log => log.level?.toLowerCase() === 'warn').length}
              </span>
              <span className="px-2 py-1 bg-green-50 text-green-700 rounded" title="Info entries">
                Info: {filteredContent.filter(log => log.level?.toLowerCase() === 'info').length}
              </span>
            </div>
          </div>

          {/* Right side - Action buttons */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => fetchLogs(showRaw)}
              className="px-2 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-md flex items-center gap-1 transition-colors"
              title="Refresh logs from server"
            >
              <FontAwesomeIcon icon={faSync} className="w-3 h-3" />
              Refresh
            </button>

            <button
              onClick={toggleSortOrder}
              className="px-2 py-1.5 bg-teal-500 hover:bg-teal-600 text-white text-xs rounded-md flex items-center gap-1 transition-colors"
              title="Toggle between latest first and oldest first"
            >
              <FontAwesomeIcon icon={faSort} className="w-3 h-3" />
              {sortOrder === 'desc' ? 'Latest' : 'Oldest'}
            </button>

            <button
              onClick={() => setShowRaw(!showRaw)}
              className="px-2 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs rounded-md flex items-center gap-1 transition-colors"
              title="Switch between raw text view and parsed JSON view"
            >
              <FontAwesomeIcon icon={faFileCode} className="w-3 h-3" />
              {showRaw ? 'Parsed' : 'Raw'}
            </button>

            <button
              onClick={downloadLogs}
              className="px-2 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs rounded-md flex items-center gap-1 transition-colors"
              title="Download current logs as file"
            >
              <FontAwesomeIcon icon={faDownload} className="w-3 h-3" />
              Download
            </button>

            <button
              onClick={handleFormatLogs}
              className="px-2 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs rounded-md flex items-center gap-1 transition-colors"
              title="Format and prettify log file structure"
            >
              <FontAwesomeIcon icon={faFileCode} className="w-3 h-3" />
              Format
            </button>

       <button
  onClick={handleClearAllLogs}
  className="px-2 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded-md flex items-center gap-1 transition-colors"
  title={`Clear all ${activeTab} logs permanently (cannot be undone)`}
>
  <FontAwesomeIcon icon={faEraser} className="w-3 h-3" />
  Clear {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
</button>

          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <FontAwesomeIcon icon={faSpinner} spin className="w-6 h-6 text-blue-500 mr-2" />
            <span className="text-gray-600 text-sm">Loading logs...</span>
          </div>
        ) : showRaw ? (
          <div className="p-3">
            <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded-md overflow-auto max-h-80 font-mono whitespace-pre-wrap">
              {rawContent || 'No raw content available'}
            </pre>
          </div>
        ) : currentLogs.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Message
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentLogs.map((log, index) => (
                    <tr key={startIndex + index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border ${getLevelColor(log.level || 'unknown')}`}>
                          {log.level || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="text-xs text-gray-900 max-w-md">
                          <div className="truncate" title={log.message || log.raw}>
                            {log.message || log.raw || 'No message'}
                          </div>
                          {log.stack && (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
                                Stack trace
                              </summary>
                              <pre className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded overflow-x-auto">
                                {log.stack}
                              </pre>
                            </details>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-500">
                        {log.timestamp
                          ? format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')
                          : 'N/A'
                        }
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex gap-1">
                          <button
                            onClick={() => copyToClipboard(log.message || log.raw || '')}
                            className="text-blue-500 hover:text-blue-700 transition-colors p-1"
                            title="Copy log message to clipboard"
                          >
                            <FontAwesomeIcon icon={faCopy} className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(startIndex + index)}
                            className="text-red-500 hover:text-red-700 transition-colors p-1"
                            title="Delete this log entry permanently"
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
              <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-t border-gray-200 text-xs">
                <div className="text-gray-700">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredContent.length)} of {filteredContent.length} entries
                </div>
                <div className="flex gap-1 items-center">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Go to previous page"
                  >
                    Prev
                  </button>
                  <span className="px-2 py-1 text-xs bg-blue-500 text-white rounded" title={`Current page ${currentPage} of ${totalPages}`}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Go to next page"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No logs available for the selected type.</p>
          </div>
        )}
      </div>
    </div>
  );
}
