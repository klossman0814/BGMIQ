import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { LoadingSpinner, ErrorMessage, EmptyState } from '../components/Shared';
import { formatDateTime } from '../utils/helpers';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

interface Meal {
  id: number; name: string; carbs: number | null; mealType: string;
  eatenAt: string; notes: string | null;
}

export default function MealsPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', carbs: '', mealType: 'snack', eatenAt: '', notes: '' });

  const fetchMeals = () => {
    setLoading(true);
    api.get('/meals').then(r => setMeals(r.data)).catch(() => setError('Failed to load meals')).finally(() => setLoading(false));
  };

  useEffect(() => { fetchMeals(); }, []);

  const openNew = () => {
    setEditingId(null);
    setForm({ name: '', carbs: '', mealType: 'snack', eatenAt: new Date().toISOString().slice(0, 16), notes: '' });
    setShowForm(true);
  };

  const openEdit = (m: Meal) => {
    setEditingId(m.id);
    setForm({ name: m.name, carbs: m.carbs?.toString() || '', mealType: m.mealType, eatenAt: m.eatenAt.slice(0, 16), notes: m.notes || '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    const payload: Record<string, unknown> = { name: form.name, mealType: form.mealType };
    if (form.carbs) payload.carbs = parseInt(form.carbs);
    if (form.eatenAt) payload.eatenAt = new Date(form.eatenAt).toISOString();
    if (form.notes) payload.notes = form.notes;
    try {
      if (editingId) await api.put(`/meals/${editingId}`, payload);
      else await api.post('/meals', payload);
      setShowForm(false);
      fetchMeals();
    } catch { alert('Failed to save meal'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this meal?')) return;
    try { await api.delete(`/meals/${id}`); fetchMeals(); }
    catch { alert('Failed to delete'); }
  };

  if (loading) return <LoadingSpinner text="Loading meals..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchMeals} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Meals</h1>
        <button onClick={openNew} className="btn-primary">+ Add Meal</button>
      </div>

      {showForm && (
        <div className="card">
          <h3 className="card-header">{editingId ? 'Edit Meal' : 'New Meal'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Meal Name *</label>
              <input type="text" className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Oatmeal" />
            </div>
            <div>
              <label className="label">Meal Type</label>
              <select className="input" value={form.mealType} onChange={e => setForm({ ...form, mealType: e.target.value })}>
                {MEAL_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Carbohydrates (g)</label>
              <input type="number" className="input" value={form.carbs} onChange={e => setForm({ ...form, carbs: e.target.value })} placeholder="e.g. 45" min={0} />
            </div>
            <div>
              <label className="label">Date & Time</label>
              <input type="datetime-local" className="input" value={form.eatenAt} onChange={e => setForm({ ...form, eatenAt: e.target.value })} />
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

      {meals.length === 0 ? (
        <EmptyState icon="🍽️" title="No meals logged" description="Track your meals and carb intake" />
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Meal</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Carbs</th>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {meals.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                  <td className="px-4 py-3"><span className="badge-blue">{m.mealType}</span></td>
                  <td className="px-4 py-3">{m.carbs ? `${m.carbs}g` : '-'}</td>
                  <td className="px-4 py-3 text-sm">{formatDateTime(m.eatenAt)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-[150px] truncate">{m.notes || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(m)} className="text-xs text-primary-600 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(m.id)} className="text-xs text-red-600 hover:underline">Delete</button>
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