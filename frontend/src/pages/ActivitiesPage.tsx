import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { LoadingSpinner, ErrorMessage, EmptyState } from '../components/Shared';
import { formatDateTime } from '../utils/helpers';

const INTENSITIES = ['light', 'moderate', 'vigorous'] as const;

interface Activity {
  id: number; name: string; duration: number; intensity: string | null;
  startedAt: string; notes: string | null;
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', duration: '30', intensity: 'moderate', startedAt: '', notes: '' });

  const fetchActivities = () => {
    setLoading(true);
    api.get('/activities').then(r => setActivities(r.data)).catch(() => setError('Failed to load')).finally(() => setLoading(false));
  };

  useEffect(() => { fetchActivities(); }, []);

  const openNew = () => {
    setEditingId(null);
    setForm({ name: '', duration: '30', intensity: 'moderate', startedAt: new Date().toISOString().slice(0, 16), notes: '' });
    setShowForm(true);
  };

  const openEdit = (a: Activity) => {
    setEditingId(a.id);
    setForm({ name: a.name, duration: a.duration.toString(), intensity: a.intensity || 'moderate', startedAt: a.startedAt.slice(0, 16), notes: a.notes || '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.duration) return;
    const payload: Record<string, unknown> = { name: form.name, duration: parseInt(form.duration), intensity: form.intensity };
    if (form.startedAt) payload.startedAt = new Date(form.startedAt).toISOString();
    if (form.notes) payload.notes = form.notes;
    try {
      if (editingId) await api.put(`/activities/${editingId}`, payload);
      else await api.post('/activities', payload);
      setShowForm(false); fetchActivities();
    } catch { alert('Failed to save'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this activity?')) return;
    try { await api.delete(`/activities/${id}`); fetchActivities(); }
    catch { alert('Failed to delete'); }
  };

  const intensityBadge = (i: string | null) => {
    if (i === 'light') return <span className="badge-green">{i}</span>;
    if (i === 'moderate') return <span className="badge-yellow">{i}</span>;
    if (i === 'vigorous') return <span className="badge-red">{i}</span>;
    return <span className="badge-gray">-</span>;
  };

  if (loading) return <LoadingSpinner text="Loading activities..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchActivities} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Activities</h1>
        <button onClick={openNew} className="btn-primary">+ Add Activity</button>
      </div>

      {showForm && (
        <div className="card">
          <h3 className="card-header">{editingId ? 'Edit Activity' : 'New Activity'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Activity *</label>
              <input type="text" className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Walking" />
            </div>
            <div>
              <label className="label">Duration (minutes)</label>
              <input type="number" className="input" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} min={1} />
            </div>
            <div>
              <label className="label">Intensity</label>
              <select className="input" value={form.intensity} onChange={e => setForm({ ...form, intensity: e.target.value })}>
                {INTENSITIES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date & Time</label>
              <input type="datetime-local" className="input" value={form.startedAt} onChange={e => setForm({ ...form, startedAt: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Notes</label>
              <input type="text" className="input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="btn-primary">{editingId ? 'Update' : 'Save'}</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {activities.length === 0 ? (
        <EmptyState icon="🏃" title="No activities logged" description="Track your physical activities" />
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Activity</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Intensity</th>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activities.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{a.name}</td>
                  <td className="px-4 py-3">{a.duration} min</td>
                  <td className="px-4 py-3">{intensityBadge(a.intensity)}</td>
                  <td className="px-4 py-3 text-sm">{formatDateTime(a.startedAt)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-[150px] truncate">{a.notes || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(a)} className="text-xs text-primary-600 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(a.id)} className="text-xs text-red-600 hover:underline">Delete</button>
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