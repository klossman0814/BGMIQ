import React, { useState, useEffect } from 'react';
import { profileApi } from '../services/api';
import { PatientProfile, DiabetesType } from '../types';
import { LoadingSpinner, ErrorMessage } from '../components/Shared';
import { diabetesTypeLabel } from '../utils/helpers';

export default function SettingsPage() {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    dateOfBirth: '',
    diabetesType: 'Type1' as DiabetesType,
    targetLow: 70,
    targetHigh: 180,
    providerName: '',
    emergencyContact: '',
    phone: '',
  });

  useEffect(() => {
    profileApi.get()
      .then((res) => {
        const p = res.data;
        setProfile(p);
        setForm({
          dateOfBirth: p.dateOfBirth || '',
          diabetesType: p.diabetesType || 'Type1',
          targetLow: p.targetLow || 70,
          targetHigh: p.targetHigh || 180,
          providerName: p.providerName || '',
          emergencyContact: p.emergencyContact || '',
          phone: p.phone || '',
        });
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await profileApi.update(form as any);
      setSuccess('Profile updated successfully');
    } catch {
      setError('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading profile..." />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings & Profile</h1>

      {error && <ErrorMessage message={error} />}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      <div className="card space-y-5">
        <h3 className="card-header">Patient Profile</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Date of Birth</label>
            <input type="date" className="input" value={form.dateOfBirth}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
          </div>
          <div>
            <label className="label">Diabetes Type</label>
            <select className="input" value={form.diabetesType}
              onChange={(e) => setForm({ ...form, diabetesType: e.target.value as DiabetesType })}>
              <option value="Type1">Type 1</option>
              <option value="Type2">Type 2</option>
              <option value="Gestational">Gestational</option>
              <option value="Pre-diabetic">Pre-diabetic</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="label">Target Low (mg/dL)</label>
            <input type="number" className="input" value={form.targetLow}
              onChange={(e) => setForm({ ...form, targetLow: parseInt(e.target.value) || 70 })}
              min={50} max={100} />
          </div>
          <div>
            <label className="label">Target High (mg/dL)</label>
            <input type="number" className="input" value={form.targetHigh}
              onChange={(e) => setForm({ ...form, targetHigh: parseInt(e.target.value) || 180 })}
              min={100} max={300} />
          </div>

          <div>
            <label className="label">Provider Name</label>
            <input type="text" className="input" value={form.providerName}
              onChange={(e) => setForm({ ...form, providerName: e.target.value })}
              placeholder="Dr. Name" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input type="tel" className="input" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+1-555-000-0000" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Emergency Contact</label>
            <input type="text" className="input" value={form.emergencyContact}
              onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
              placeholder="Name and phone number" />
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      {/* Info about glucose ranges */}
      <div className="card">
        <h3 className="card-header">Glucose Range Reference</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-2 rounded bg-red-900/10 dark:bg-red-900/30">
            <span className="w-3 h-3 rounded-full bg-glucose-critical-low" />
            <div><p className="font-medium text-sm text-gray-900 dark:text-gray-100">Critical Low</p><p className="text-xs text-gray-500 dark:text-gray-400">Below 54 mg/dL — Seek immediate medical attention</p></div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded bg-orange-50 dark:bg-orange-900/20">
            <span className="w-3 h-3 rounded-full bg-glucose-low" />
            <div><p className="font-medium text-sm text-gray-900 dark:text-gray-100">Low</p><p className="text-xs text-gray-500 dark:text-gray-400">54–69 mg/dL — Consider fast-acting carbs</p></div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded bg-green-50 dark:bg-green-900/20">
            <span className="w-3 h-3 rounded-full bg-glucose-in-range" />
            <div><p className="font-medium text-sm text-gray-900 dark:text-gray-100">In Range</p><p className="text-xs text-gray-500 dark:text-gray-400">70–180 mg/dL — Target range</p></div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded bg-yellow-50 dark:bg-yellow-900/20">
            <span className="w-3 h-3 rounded-full bg-glucose-high" />
            <div><p className="font-medium text-sm text-gray-900 dark:text-gray-100">High</p><p className="text-xs text-gray-500 dark:text-gray-400">181–250 mg/dL — Consider adjustment</p></div>
          </div>
          <div className="flex items-center gap-3 p-2 rounded bg-red-50 dark:bg-red-900/20">
            <span className="w-3 h-3 rounded-full bg-glucose-critical-high" />
            <div><p className="font-medium text-sm text-gray-900 dark:text-gray-100">Critical High</p><p className="text-xs text-gray-500 dark:text-gray-400">Above 250 mg/dL — Seek medical attention</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}