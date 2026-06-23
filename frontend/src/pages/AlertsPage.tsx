import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { AlertData } from '../types';
import { LoadingSpinner, ErrorMessage, EmptyState } from '../components/Shared';
import { formatDateTime } from '../utils/helpers';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'border-red-600 bg-red-50',
  warning: 'border-yellow-500 bg-yellow-50',
  info: 'border-blue-500 bg-blue-50',
};

const TYPE_ICONS: Record<string, string> = {
  critical_low: '🚨', low: '⚠️', high: '⚡', critical_high: '🚨', no_data: '📡',
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchAlerts = () => {
    setLoading(true);
    const params: Record<string, unknown> = {};
    if (filter === 'unread') params.unread = true;
    api.get('/alerts', { params }).then(r => setAlerts(r.data)).catch(() => setError('Failed to load')).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAlerts(); }, [filter]);

  const markRead = async (id: number) => {
    await api.put(`/alerts/${id}/read`);
    setAlerts(alerts.map(a => a.id === id ? { ...a, isRead: true } : a));
  };

  const markAllRead = async () => {
    await api.put('/alerts/read-all');
    setAlerts(alerts.map(a => ({ ...a, isRead: true })));
  };

  const deleteAlert = async (id: number) => {
    if (!confirm('Delete this alert?')) return;
    await api.delete(`/alerts/${id}`);
    setAlerts(alerts.filter(a => a.id !== id));
  };

  const unreadCount = alerts.filter(a => !a.isRead).length;

  if (loading) return <LoadingSpinner text="Loading alerts..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchAlerts} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
          {unreadCount > 0 && <p className="text-sm text-gray-500">{unreadCount} unread</p>}
        </div>
        <div className="flex gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>All</button>
            <button onClick={() => setFilter('unread')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'unread' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Unread</button>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn-secondary btn-sm">Mark All Read</button>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <EmptyState icon="🔔" title="No alerts" description={filter === 'unread' ? 'No unread alerts' : 'No alerts have been generated'} />
      ) : (
        <div className="space-y-3">
          {alerts.map(a => (
            <div key={a.id} className={`rounded-lg border-l-4 p-4 transition-colors ${SEVERITY_COLORS[a.severity] || 'bg-white border-gray-300'} ${a.isRead ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-xl flex-shrink-0">{TYPE_ICONS[a.type] || '🔔'}</span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold uppercase px-1.5 py-0.5 rounded ${a.severity === 'critical' ? 'text-red-700 bg-red-100' : a.severity === 'warning' ? 'text-yellow-700 bg-yellow-100' : 'text-blue-700 bg-blue-100'}`}>
                        {a.severity}
                      </span>
                      <span className="text-xs text-gray-400">{formatDateTime(a.createdAt)}</span>
                      {!a.isRead && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                    </div>
                    <p className="text-sm text-gray-800 mt-1">{a.message}</p>
                    {a.reading && (
                      <p className="text-xs text-gray-500 mt-1">
                        Glucose: {a.reading.glucoseValue} mg/dL at {formatDateTime(a.reading.readingDatetime)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {!a.isRead && (
                    <button onClick={() => markRead(a.id)} className="text-xs text-primary-600 hover:underline whitespace-nowrap">Dismiss</button>
                  )}
                  <button onClick={() => deleteAlert(a.id)} className="text-xs text-red-600 hover:underline whitespace-nowrap">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}