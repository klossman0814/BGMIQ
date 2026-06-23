import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { LoadingSpinner, ErrorMessage, EmptyState } from '../components/Shared';
import { formatDateTime } from '../utils/helpers';

interface Medication {
  id: number; name: string; dosage: string; frequency: string;
  prescribedBy: string | null; startDate: string | null; endDate: string | null;
  isActive: boolean;
}

interface MedicationLog {
  id: number; medicationId: number; dose: string | null; takenAt: string;
  skipped: boolean; notes: string | null;
  medication: { name: string; dosage: string };
}

export default function MedicationsPage() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [todayLogs, setTodayLogs] = useState<MedicationLog[]>([]);
  const [allLogs, setAllLogs] = useState<MedicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', dosage: '', frequency: '', prescribedBy: '' });

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      api.get('/medications'),
      api.get('/medication-logs/today'),
      api.get('/medication-logs'),
    ]).then(([meds, today, logs]) => {
      setMedications(meds.data);
      setTodayLogs(today.data.logs || []);
      setAllLogs(logs.data);
    }).catch(() => setError('Failed to load')).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const openNew = () => { setEditingId(null); setForm({ name: '', dosage: '', frequency: '', prescribedBy: '' }); setShowForm(true); };
  const openEdit = (m: Medication) => { setEditingId(m.id); setForm({ name: m.name, dosage: m.dosage, frequency: m.frequency, prescribedBy: m.prescribedBy || '' }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name || !form.dosage) return;
    try {
      if (editingId) await api.put(`/medications/${editingId}`, form);
      else await api.post('/medications', form);
      setShowForm(false); fetchAll();
    } catch { alert('Failed to save'); }
  };

  const toggleActive = async (med: Medication) => {
    try { await api.put(`/medications/${med.id}`, { isActive: !med.isActive }); fetchAll(); }
    catch { alert('Failed to update'); }
  };

  const deleteMed = async (id: number) => {
    if (!confirm('Delete this medication?')) return;
    try { await api.delete(`/medications/${id}`); fetchAll(); }
    catch { alert('Failed to delete'); }
  };

  const logTaken = async (medId: number) => {
    try { await api.post('/medication-logs', { medicationId: medId }); fetchAll(); }
    catch { alert('Failed to log'); }
  };

  const logSkipped = async (medId: number) => {
    try { await api.post('/medication-logs', { medicationId: medId, skipped: true, notes: 'Skipped' }); fetchAll(); }
    catch { alert('Failed to log'); }
  };

  if (loading) return <LoadingSpinner text="Loading medications..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchAll} />;

  const activeMeds = medications.filter(m => m.isActive);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Medications</h1>
        <button onClick={openNew} className="btn-primary">+ Add Medication</button>
      </div>

      {showForm && (
        <div className="card">
          <h3 className="card-header">{editingId ? 'Edit Medication' : 'New Medication'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div><label className="label">Name *</label><input type="text" className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Metformin" /></div>
            <div><label className="label">Dosage *</label><input type="text" className="input" value={form.dosage} onChange={e => setForm({ ...form, dosage: e.target.value })} placeholder="500mg" /></div>
            <div><label className="label">Frequency</label><input type="text" className="input" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} placeholder="Twice daily" /></div>
            <div><label className="label">Prescribed By</label><input type="text" className="input" value={form.prescribedBy} onChange={e => setForm({ ...form, prescribedBy: e.target.value })} placeholder="Dr. Name" /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="btn-primary">{editingId ? 'Update' : 'Save'}</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Today's Adherence */}
      {activeMeds.length > 0 && (
        <div className="card">
          <h3 className="card-header">Today's Adherence</h3>
          <div className="space-y-2">
            {activeMeds.map(med => {
              const logged = todayLogs.find(l => l.medicationId === med.id);
              return (
                <div key={med.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{med.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{med.dosage} — {med.frequency}</p>
                  </div>
                  <div className="flex gap-2">
                    {logged ? (
                      <span className={`text-sm font-medium ${logged.skipped ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {logged.skipped ? '❌ Skipped' : '✅ Taken'}
                      </span>
                    ) : (
                      <>
                        <button onClick={() => logTaken(med.id)} className="btn-sm bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 rounded-lg">✅ Taken</button>
                        <button onClick={() => logSkipped(med.id)} className="btn-sm bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 rounded-lg">❌ Skip</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {todayLogs.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {todayLogs.filter(l => !l.skipped).length}/{activeMeds.length} medications taken today
              </p>
            </div>
          )}
        </div>
      )}

      {/* Medication List */}
      {medications.length === 0 ? (
        <EmptyState icon="💊" title="No medications" description="Add your medications to track adherence" />
      ) : (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">All Medications</h3>
          <div className="grid gap-3">
            {medications.map(med => (
              <div key={med.id} className={`card flex items-center justify-between ${!med.isActive ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-4">
                  <span className="text-2xl">💊</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{med.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{med.dosage} — {med.frequency}</p>
                    {med.prescribedBy && <p className="text-xs text-gray-400 dark:text-gray-500">Prescribed by {med.prescribedBy}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${med.isActive ? 'badge-green' : 'badge-gray'}`}>
                    {med.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button onClick={() => openEdit(med)} className="text-xs text-primary-600 hover:underline">Edit</button>
                  <button onClick={() => toggleActive(med)} className="text-xs text-gray-500 hover:underline">{med.isActive ? 'Deactivate' : 'Activate'}</button>
                  <button onClick={() => deleteMed(med.id)} className="text-xs text-red-600 hover:underline">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Adherence History */}
      {allLogs.length > 0 && (
        <div className="card">
          <h3 className="card-header">Adherence History</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-3 py-2">Medication</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Dose</th>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {allLogs.slice(0, 50).map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-3 py-2 text-sm font-medium">{log.medication.name}</td>
                    <td className="px-3 py-2">{log.skipped ? <span className="badge-red">Skipped</span> : <span className="badge-green">Taken</span>}</td>
                    <td className="px-3 py-2 text-sm">{log.dose || '-'}</td>
                    <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{formatDateTime(log.takenAt)}</td>
                    <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 max-w-[120px] truncate">{log.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}