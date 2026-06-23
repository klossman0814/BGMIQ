import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { readingsApi } from '../services/api';
import { LoadingSpinner, ErrorMessage } from '../components/Shared';
import { mealContextLabel } from '../utils/helpers';

export default function AddReadingPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    glucoseValue: '',
    readingDatetime: '',
    mealContext: 'other',
    source: 'manual',
    carbs: '',
    insulinUnits: '',
    medicationTaken: false,
    activityMinutes: '',
    symptoms: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);

  useEffect(() => {
    if (id) {
      readingsApi.get(parseInt(id))
        .then((res) => {
          const r = res.data;
          setForm({
            glucoseValue: r.glucoseValue.toString(),
            readingDatetime: new Date(r.readingDatetime).toISOString().slice(0, 16),
            mealContext: r.mealContext,
            source: r.source,
            carbs: r.carbs?.toString() || '',
            insulinUnits: r.insulinUnits?.toString() || '',
            medicationTaken: r.medicationTaken,
            activityMinutes: r.activityMinutes?.toString() || '',
            symptoms: r.symptoms || '',
            notes: r.notes || '',
          });
        })
        .catch(() => setError('Failed to load reading'))
        .finally(() => setFetchLoading(false));
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const val = parseInt(form.glucoseValue);
    if (!val || val < 20 || val > 600) {
      setError('Glucose value must be between 20 and 600 mg/dL');
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        glucoseValue: val,
        mealContext: form.mealContext,
        source: form.source,
        medicationTaken: form.medicationTaken,
      };
      if (form.readingDatetime) payload.readingDatetime = new Date(form.readingDatetime).toISOString();
      if (form.carbs) payload.carbs = parseInt(form.carbs);
      if (form.insulinUnits) payload.insulinUnits = parseFloat(form.insulinUnits);
      if (form.activityMinutes) payload.activityMinutes = parseInt(form.activityMinutes);
      if (form.symptoms) payload.symptoms = form.symptoms;
      if (form.notes) payload.notes = form.notes;

      if (isEdit) {
        await readingsApi.update(parseInt(id!), payload);
      } else {
        await readingsApi.create(payload);
      }
      navigate('/readings');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save reading');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) return <LoadingSpinner text="Loading reading..." />;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? 'Edit Reading' : 'Add New Reading'}
      </h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Glucose Value (mg/dL) *</label>
            <input
              type="number"
              className="input"
              value={form.glucoseValue}
              onChange={(e) => setForm({ ...form, glucoseValue: e.target.value })}
              placeholder="e.g. 120"
              min={20}
              max={600}
              required
            />
          </div>
          <div>
            <label className="label">Date & Time</label>
            <input
              type="datetime-local"
              className="input"
              value={form.readingDatetime}
              onChange={(e) => setForm({ ...form, readingDatetime: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Meal Context</label>
            <select className="input" value={form.mealContext} onChange={(e) => setForm({ ...form, mealContext: e.target.value })}>
              <option value="fasting">Fasting</option>
              <option value="before_meal">Before Meal</option>
              <option value="after_meal">After Meal</option>
              <option value="bedtime">Bedtime</option>
              <option value="overnight">Overnight</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Source</label>
            <select className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              <option value="manual">Manual Entry</option>
              <option value="meter">Glucose Meter</option>
              <option value="CGM">CGM</option>
            </select>
          </div>

          <div>
            <label className="label">Carbohydrates (g)</label>
            <input type="number" className="input" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: e.target.value })} placeholder="e.g. 45" min={0} />
          </div>
          <div>
            <label className="label">Insulin Units</label>
            <input type="number" step="0.1" className="input" value={form.insulinUnits} onChange={(e) => setForm({ ...form, insulinUnits: e.target.value })} placeholder="e.g. 5.0" min={0} />
          </div>

          <div>
            <label className="label">Activity (minutes)</label>
            <input type="number" className="input" value={form.activityMinutes} onChange={(e) => setForm({ ...form, activityMinutes: e.target.value })} placeholder="e.g. 30" min={0} />
          </div>
          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.medicationTaken} onChange={(e) => setForm({ ...form, medicationTaken: e.target.checked })} className="w-4 h-4 text-primary-600 rounded" />
              <span className="text-sm text-gray-700">Medication Taken</span>
            </label>
          </div>
        </div>

        <div>
          <label className="label">Symptoms</label>
          <input type="text" className="input" value={form.symptoms} onChange={(e) => setForm({ ...form, symptoms: e.target.value })} placeholder="e.g. Dizziness, headache" />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any additional notes..." />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving...' : isEdit ? 'Update Reading' : 'Save Reading'}
          </button>
          <button type="button" onClick={() => navigate('/readings')} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}