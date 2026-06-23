import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { LoadingSpinner, ErrorMessage, EmptyState } from '../components/Shared';
import { formatDateTime } from '../utils/helpers';

const INSULIN_TYPES = [
  { value: 'rapid_acting', label: 'Rapid Acting' },
  { value: 'short_acting', label: 'Short Acting' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'long_acting', label: 'Long Acting' },
  { value: 'pre_mixed', label: 'Pre-Mixed' },
] as const;

interface InsulinLog {
  id: number; insulinType: string; units: number;
  administered: string; notes: string | null;
}

export default function InsulinPage() {
  const [logs, setLogs] = useState<InsulinLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ insulinType: 'rapid_acting', units: '', administered: '', notes: '' });

  const fetchLogs = () => {
    setLoading(true);
    api.get('/insulin').then(r => setLogs(r.data)).catch(() => setError('Failed to load')).finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(); }, []);

  const openNew = () => {
    setEditingId(null);
    setForm({ insulinType: 'rapid_acting', units: '', administered: new Date().toISOString().slice(0, 16), notes: '' });
    setShowForm(true);
  };

  const openEdit = (l: InsulinLog) => {
    setEditingId(l.id);
    setForm({ insulinType: l.insulinType, units: l.units.toString(), administered: l.administered.slice(0, 16), notes: l.notes || '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.units || parseFloat(form.units) <= 0) return;
    const payload: Record<string, unknown> = { insulinType: form.insulinType, units: parseFloat(form.units) };
    if (form.administered) payload.administered = new Date(form.administered).toISOString();
    if (form.notes) payload.notes = form.notes;
    try {
      if (editingId) await api.put(`/insulin/${editingId}`, payload);
      else await api.post('/insulin', payload);
      setShowForm(false); fetchLogs();
    } catch { alert('Failed to save'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this insulin log?')) return;
    try { await api.delete(`/insulin/${id}`); fetchLogs(); }
    catch { alert('Failed to delete'); }
  };

  if (loading) return <LoadingSpinner text="Loading insulin logs..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchLogs} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Insulin Log</h1>
        <button onClick={openNew} className="btn-primary">+ Add Dose</button>
      </div>

      {showForm && (
        <div className="card">
          <h3 className="card-header">{editingId ? 'Edit Insulin Dose' : 'New Insulin Dose'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Insulin Type</label>
              <select className="input" value={form.insulinType} onChange={e => setForm({ ...form, insulinType: e.target.value })}>
                {INSULIN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Units *</label>
              <input type="number" step="0.5" className="input" value={form.units} onChange={e => setForm({ ...form, units: e.target.value })} placeholder="e.g. 5.0" min={0.5} />
            </div>
            <div>
              <label className="label">Date & Time</label>
              <input type="datetime-local" className="input" value={form.administered} onChange={e => setForm({ ...form, administered: e.target.value })} />
            </div>
            <div>
              <label className="label">Notes</label>
              <input type="text" className="input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="btn-primary">{editingId ? 'Update' : 'Save'}</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {logs.length === 0 ? (
        <EmptyState icon="💉" title="No insulin logged" description="Track your insulin doses" />
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Units</th>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {logs.map(l => (
                <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3"><span className="badge-blue">{INSULIN_TYPES.find(t => t.value === l.insulinType)?.label || l.insulinType}</span></td>
                  <td className="px-4 py-3 font-semibold">{l.units} U</td>
                  <td className="px-4 py-3 text-sm">{formatDateTime(l.administered)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{l.notes || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(l)} className="text-xs text-primary-600 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(l.id)} className="text-xs text-red-600 hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}