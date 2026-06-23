import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { mealsApi } from '../services/api';
import { LoadingSpinner, ErrorMessage, EmptyState } from '../components/Shared';
import { formatDateTime } from '../utils/helpers';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

interface Meal {
  id: number; name: string; carbs: number | null; mealType: string;
  eatenAt: string; notes: string | null;
}

interface MealAnalysis {
  mealId: number; name: string; mealType: string; carbs: number | null;
  eatenAt: string; spike: number; readingCount: number;
  minutesToPeak?: number;
  baseline: { value: number; time: string };
  oneHour: { value: number; time: string };
  twoHour: { value: number; time: string };
  peak: { value: number; time: string; minutesToPeak: number };
  returnToBaseline: { value: number; time: string; minutesAfterPeak: number } | null;
}

interface Rankings {
  highestSpike: { name: string; spike: number; mealType: string; carbs: number | null; eatenAt: string } | null;
  lowestSpike: { name: string; spike: number; mealType: string; carbs: number | null; eatenAt: string } | null;
  byMealType: { type: string; avgSpike: number; count: number }[];
  byCarbRange: { range: string; avgSpike: number; count: number }[];
  bestFoods: { name: string; avgSpike: number; count: number }[];
  worstFoods: { name: string; avgSpike: number; count: number }[];
}

export default function MealsPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', carbs: '', mealType: 'snack', eatenAt: '', notes: '' });

  const [tab, setTab] = useState<'log' | 'analysis'>('log');
  const [analysisMonths, setAnalysisMonths] = useState(3);
  const [analysisData, setAnalysisData] = useState<{ meals: MealAnalysis[]; rankings: Rankings | null } | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  const fetchMeals = () => {
    setLoading(true);
    api.get('/meals').then(r => setMeals(r.data)).catch(() => setError('Failed to load meals')).finally(() => setLoading(false));
  };

  useEffect(() => { fetchMeals(); }, []);

  useEffect(() => {
    if (tab !== 'analysis') return;
    setAnalysisLoading(true);
    setAnalysisError('');
    mealsApi.analysis(analysisMonths)
      .then(r => setAnalysisData(r.data))
      .catch(() => setAnalysisError('Failed to load analysis'))
      .finally(() => setAnalysisLoading(false));
  }, [tab, analysisMonths]);

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

  const spikeLabel = (s: number) => {
    if (s <= 30) return 'text-green-600';
    if (s <= 60) return 'text-yellow-600';
    if (s <= 90) return 'text-orange-500';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Tab toggle */}
      <div className="flex items-center justify-between">
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button onClick={() => setTab('log')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'log' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>Log</button>
          <button onClick={() => setTab('analysis')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'analysis' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>Impact Analysis</button>
        </div>
        {tab === 'log' && <button onClick={openNew} className="btn-primary">+ Add Meal</button>}
      </div>

      {/* Log tab */}
      {tab === 'log' && (
        <>
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
            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="px-4 py-3">Meal</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Carbs</th>
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {meals.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{m.name}</td>
                      <td className="px-4 py-3"><span className="badge-blue">{m.mealType}</span></td>
                      <td className="px-4 py-3">{m.carbs ? `${m.carbs}g` : '-'}</td>
                      <td className="px-4 py-3 text-sm">{formatDateTime(m.eatenAt)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-[150px] truncate">{m.notes || '-'}</td>
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
        </>
      )}

      {/* Impact Analysis tab */}
      {tab === 'analysis' && (
        <>
          {/* Month selector */}
          <div className="flex gap-2">
            {[3, 6, 12].map(m => (
              <button key={m} onClick={() => setAnalysisMonths(m)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${analysisMonths === m ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                {m} months
              </button>
            ))}
          </div>

          {analysisLoading && <LoadingSpinner text="Analyzing meals..." />}
          {analysisError && <ErrorMessage message={analysisError} />}

          {analysisData && analysisData.rankings && (
            <>
              {/* Ranking cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {analysisData.rankings.highestSpike && (
                  <div className="card">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">Highest Spike</p>
                    <p className="text-xl font-bold text-red-600">{analysisData.rankings.highestSpike.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">+{analysisData.rankings.highestSpike.spike} mg/dL ({analysisData.rankings.highestSpike.mealType})</p>
                  </div>
                )}
                {analysisData.rankings.lowestSpike && (
                  <div className="card">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">Lowest Spike</p>
                    <p className="text-xl font-bold text-green-600">{analysisData.rankings.lowestSpike.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">+{analysisData.rankings.lowestSpike.spike} mg/dL ({analysisData.rankings.lowestSpike.mealType})</p>
                  </div>
                )}
              </div>

              {/* By Meal Type */}
              <div className="card">
                <h3 className="card-header">Average Spike by Meal Type</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {analysisData.rankings.byMealType.map(mt => (
                    <div key={mt.type} className="text-center">
                      <p className={`text-2xl font-bold ${spikeLabel(mt.avgSpike)}`}>{mt.avgSpike}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">{mt.type} ({mt.count})</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Carb Range */}
              <div className="card">
                <h3 className="card-header">Average Spike by Carb Range</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {analysisData.rankings.byCarbRange.map(cr => (
                    <div key={cr.range} className="text-center">
                      <p className={`text-2xl font-bold ${spikeLabel(cr.avgSpike)}`}>{cr.avgSpike}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{cr.range} ({cr.count})</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Best & Worst Foods */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card">
                  <h3 className="card-header text-green-600 dark:text-green-400">Best Foods</h3>
                  <div className="space-y-2">
                    {analysisData.rankings.bestFoods.map(f => (
                      <div key={f.name} className="flex justify-between text-sm">
                        <span className="text-gray-900 dark:text-gray-100">{f.name}</span>
                        <span className="text-green-600 font-medium">+{f.avgSpike} avg ({f.count}x)</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <h3 className="card-header text-red-600 dark:text-red-400">Worst Foods</h3>
                  <div className="space-y-2">
                    {analysisData.rankings.worstFoods.map(f => (
                      <div key={f.name} className="flex justify-between text-sm">
                        <span className="text-gray-900 dark:text-gray-100">{f.name}</span>
                        <span className="text-red-600 font-medium">+{f.avgSpike} avg ({f.count}x)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Per-meal analysis table */}
              <div className="card">
                <h3 className="card-header">Per-Meal Detail ({analysisData.meals.length} meals)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <th className="px-3 py-2">Meal</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Carbs</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Baseline</th>
                        <th className="px-3 py-2">1h</th>
                        <th className="px-3 py-2">2h</th>
                        <th className="px-3 py-2">Peak</th>
                        <th className="px-3 py-2">Spike</th>
                        <th className="px-3 py-2">To Peak</th>
                        <th className="px-3 py-2">Return</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {analysisData.meals.map(ma => (
                        <tr key={ma.mealId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                          <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{ma.name}</td>
                          <td className="px-3 py-2"><span className="badge-blue text-xs">{ma.mealType}</span></td>
                          <td className="px-3 py-2">{ma.carbs ? `${ma.carbs}g` : '-'}</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDateTime(ma.eatenAt)}</td>
                          <td className="px-3 py-2">{ma.baseline.value}</td>
                          <td className="px-3 py-2">{ma.oneHour.value}</td>
                          <td className="px-3 py-2">{ma.twoHour.value}</td>
                          <td className="px-3 py-2 font-semibold">{ma.peak.value}</td>
                          <td className={`px-3 py-2 font-medium ${spikeLabel(ma.spike)}`}>+{ma.spike}</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{ma.peak.minutesToPeak}min</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                            {ma.returnToBaseline ? `${ma.returnToBaseline.minutesAfterPeak}min` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {analysisData && !analysisData.rankings && !analysisLoading && (
            <EmptyState icon="🍽️" title="No meal data" description="Add meals and glucose readings to see impact analysis" />
          )}
        </>
      )}
    </div>
  );
}