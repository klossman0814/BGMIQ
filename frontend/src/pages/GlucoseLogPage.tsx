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

  if (loading) return <LoadingSpinner text="Loading readings..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchReadings} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Glucose Log</h1>
        <button onClick={() => navigate('/readings/new')} className="btn-primary">
          + Add Reading
        </button>
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                <tbody className="divide-y divide-gray-100">
                  {readings.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm">{formatDateTime(r.readingDatetime)}</td>
                      <td className="px-4 py-3">
                        <GlucoseBadge value={r.glucoseValue} />
                      </td>
                      <td className="px-4 py-3 text-sm">{mealContextLabel(r.mealContext)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{sourceLabel(r.source)}</td>
                      <td className="px-4 py-3 text-sm">{r.carbs ? `${r.carbs}g` : '-'}</td>
                      <td className="px-4 py-3 text-sm">{r.insulinUnits ? `${r.insulinUnits}U` : '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-[120px] truncate">{r.symptoms || '-'}</td>
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
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary btn-sm">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}