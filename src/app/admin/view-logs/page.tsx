'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

export default function ViewLogs() {
  const [logContent, setLogContent] = useState<string[]>([]);
  const [selectedLogType, setSelectedLogType] = useState('error');
  const [loading, setLoading] = useState(true);

  const logTypes = [
    { label: 'Combined Log', value: 'combined' },
    { label: 'Error Log', value: 'error' },
    { label: 'Exceptions Log', value: 'exceptions' },
    { label: 'Rejections Log', value: 'rejections' },
  ];

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`/api/logs?type=${selectedLogType}`);
        setLogContent(response.data.content);
      } catch (error) {
        console.error('Failed to fetch logs:', error);
        setLogContent(['Error loading logs']);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [selectedLogType]);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">View Logs</h1>
      <div className="mb-4">
        <label htmlFor="logType" className="mr-2">Select Log Type:</label>
        <select
          id="logType"
          value={selectedLogType}
          onChange={(e) => setSelectedLogType(e.target.value)}
          className="p-2 border rounded"
        >
          {logTypes.map((log) => (
            <option key={log.value} value={log.value}>
              {log.label}
            </option>
          ))}
        </select>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white p-4 rounded shadow overflow-auto max-h-96">
          {logContent.length > 0 ? (
            logContent.map((line, index) => (
              <p key={index} className="text-sm break-all">
                {line}
              </p>
            ))
          ) : (
            <p>No logs available</p>
          )}
        </div>
      )}
    </div>
  );
}