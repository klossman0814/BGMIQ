import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { readingsApi } from '../services/api';
import { GlucoseReading } from '../types';
import { LoadingSpinner, ErrorMessage, EmptyState, GlucoseBadge } from '../components/Shared';
import { formatDateTime, mealContextLabel, sourceLabel } from '../utils/helpers';

export default function GlucoseLogPage() {
  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{message: string, imported: number, errors: string[]} | null>(null);
  const navigate = useNavigate();

  const fetchReadings = () => {
    setLoading(true);
    readingsApi.list({ page, limit: 20 })
      .then((res) => {
        setReadings(res.data.readings);
        setTotalPages(res.data.pagination.totalPages);
      })
      .catch(() => setError('Failed to load readings'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReadings(); }, [page]);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this reading?')) return;
    try {
      await readingsApi.delete(id);
      fetchReadings();
    } catch {
      alert('Failed to delete');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    setImportLoading(true);
    setImportResult(null);

    try {
      const response = await readingsApi.import(importFile);
      const { data } = response;
      setImportResult(data);
      fetchReadings();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Network error occurred';
      setImportResult({ message: 'Import failed', imported: 0, errors: [msg] });
    } finally {
      setImportLoading(false);
    }
  };

  const resetImport = () => {
    setImportFile(null);
    setImportResult(null);
    setShowImportModal(false);
  };

  if (loading) return <LoadingSpinner text="Loading readings..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchReadings} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Glucose Log</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowImportModal(true)} 
            className="btn-secondary"
          >
            Import from Libre3 CSV
          </button>
          <button onClick={() => navigate('/readings/new')} className="btn-primary">
            + Add Reading
          </button>
        </div>
      </div>

      {readings.length === 0 ? (
<EmptyState
              icon="📝"
              title="No readings recorded"
              description="Add your first glucose reading to start tracking"
            >
              <button onClick={() => navigate('/readings/new')} className="btn-primary mt-4">
                Add Your First Reading
              </button>
            </EmptyState>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Glucose</th>
                    <th className="px-4 py-3">Meal Context</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Carbs</th>
                    <th className="px-4 py-3">Insulin</th>
                    <th className="px-4 py-3">Symptoms</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {readings.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 text-sm">{formatDateTime(r.readingDatetime)}</td>
                      <td className="px-4 py-3">
                        <GlucoseBadge value={r.glucoseValue} />
                      </td>
                      <td className="px-4 py-3 text-sm">{mealContextLabel(r.mealContext)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{sourceLabel(r.source)}</td>
                      <td className="px-4 py-3 text-sm">{r.carbs ? `${r.carbs}g` : '-'}</td>
                      <td className="px-4 py-3 text-sm">{r.insulinUnits ? `${r.insulinUnits}U` : '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-[120px] truncate">{r.symptoms || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => navigate(`/readings/${r.id}/edit`)} className="text-xs text-primary-600 hover:underline">Edit</button>
                          <button onClick={() => handleDelete(r.id)} className="text-xs text-red-600 hover:underline">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary btn-sm">Previous</button>
              <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary btn-sm">Next</button>
            </div>
          )}
        </>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Import from Libre3 CSV</h2>
            
            {importResult ? (
              <div className="mb-4">
                <p className="font-medium mb-2 text-gray-900 dark:text-gray-100">{importResult.message}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Successfully imported: {importResult.imported} readings</p>
                {importResult.errors.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">Errors:</p>
                    <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 max-h-32 overflow-y-auto">
                      {importResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <button 
                  onClick={resetImport}
                  className="btn-primary mt-4"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleImportSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select CSV File
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 dark:text-gray-400
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 dark:file:bg-blue-900/40 file:text-blue-700 dark:file:text-blue-300
                      hover:file:bg-blue-100 dark:hover:file:bg-blue-800/40"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    The CSV file should contain glucose readings with date/time and glucose value columns
                  </p>
                </div>
                
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={resetImport}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!importFile || importLoading}
                    className="btn-primary disabled:opacity-50"
                  >
                    {importLoading ? 'Importing...' : 'Import'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}