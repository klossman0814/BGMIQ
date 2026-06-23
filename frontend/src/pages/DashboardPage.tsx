import React, { useEffect, useState } from 'react';
import { dashboardApi } from '../services/api';
import { DashboardData } from '../types';
import { LoadingSpinner, ErrorMessage, GlucoseBadge, KpiCard, EmptyState } from '../components/Shared';
import StatCard from '../components/StatCard';
import { getGlucoseLevel, getGMILevel, formatDateTime, mealContextLabel } from '../utils/helpers';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from 'recharts';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = () => {
    setLoading(true);
    dashboardApi.get()
      .then((res) => setData(res.data))
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchData} />;
  if (!data) return <EmptyState title="No data" description="Start by adding glucose readings" />;

  const latest = data.latestReading;
  const glucoseLevel = latest ? getGlucoseLevel(latest.glucoseValue) : null;

  // Time in range pie data
  const pieData = [
    { name: 'Very Low (<54)', value: data.weekKPI.timeVeryLowPercent, color: '#8B0000' },
    { name: 'Low (54-69)', value: Math.max(0, data.weekKPI.timeBelowRangePercent - data.weekKPI.timeVeryLowPercent), color: '#FF6B35' },
    { name: 'In Range (70-180)', value: data.weekKPI.timeInRangePercent, color: '#2ECC71' },
    { name: 'High (181-250)', value: Math.max(0, data.weekKPI.timeAboveRangePercent - data.weekKPI.timeVeryHighPercent), color: '#F39C12' },
    { name: 'Very High (>250)', value: data.weekKPI.timeVeryHighPercent, color: '#E74C3C' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Latest Reading */}
      {latest && glucoseLevel && (
        <div className={`rounded-xl p-6 ${glucoseLevel.className}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Current Glucose</p>
              <p className="text-4xl font-bold mt-1">{latest.glucoseValue} <span className="text-lg font-normal opacity-80">mg/dL</span></p>
              <p className="text-sm opacity-80 mt-1">{glucoseLevel.label} · {mealContextLabel(latest.mealContext)} · {formatDateTime(latest.readingDatetime)}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl">
                {glucoseLevel.label === 'Critical Low' ? '🚨' :
                 glucoseLevel.label === 'Low' ? '⚠️' :
                 glucoseLevel.label === 'In Range' ? '✅' :
                 glucoseLevel.label === 'High' ? '⚡' : '🚨'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Today's Avg" value={`${data.todayKPI.average}`} subtitle={`${data.todayKPI.totalCount} readings`} color="blue" icon="📊" />
        <StatCard title="7-Day Avg" value={`${data.weekKPI.average}`} subtitle={`${data.weekKPI.totalCount} readings`} color="green" icon="📈" />
        <StatCard title="GMI (14-Day)" value={`${data.twoWeekKPI.gmi}%`} subtitle={getGMILevel(data.twoWeekKPI.gmi).label} color={data.twoWeekKPI.gmi < 7 ? 'green' : 'yellow'} icon="🎯" />
        <StatCard title="Time in Range" value={`${data.weekKPI.timeInRangePercent}%`} subtitle="70-180 mg/dL (7 days)" color={data.weekKPI.timeInRangePercent >= 70 ? 'green' : 'yellow'} icon="🎯" />
        <StatCard title="Readings/Day" value={`${(data.weekKPI.totalCount / 7).toFixed(1)}`} subtitle="Last 7 days" color="purple" icon="📝" />
        <StatCard title="GMI (30-Day)" value={`${data.monthKPI.gmi}%`} subtitle="Estimated HbA1c equivalent" color="blue" icon="📉" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard label="Low Events" value={data.weekKPI.lowEvents} color="text-orange-500" />
        <KpiCard label="High Events" value={data.weekKPI.highEvents} color="text-yellow-600" />
        <KpiCard label="Min" value={data.weekKPI.min} unit="mg/dL" />
        <KpiCard label="Max" value={data.weekKPI.max} unit="mg/dL" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <div className="card">
          <h3 className="card-header">Today's Glucose Trend</h3>
          {data.dailyTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.dailyTrendData}>
                <defs>
                  <linearGradient id="colorGlucose" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4CAF50" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis domain={[40, 300]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <ReferenceLine y={70} stroke="#FF6B35" strokeDasharray="5 5" />
                <ReferenceLine y={180} stroke="#F39C12" strokeDasharray="5 5" />
                <Area type="monotone" dataKey="value" stroke="#4CAF50" fill="url(#colorGlucose)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No readings today" icon="📭" />}
        </div>

        {/* 7-Day Trend */}
        <div className="card">
          <h3 className="card-header">7-Day Glucose Trend</h3>
          {data.weekTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.weekTrendData}>
                <defs>
                  <linearGradient id="colorWeek" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2196F3" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2196F3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[40, 300]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <ReferenceLine y={70} stroke="#FF6B35" strokeDasharray="5 5" />
                <ReferenceLine y={180} stroke="#F39C12" strokeDasharray="5 5" />
                <Area type="monotone" dataKey="value" stroke="#2196F3" fill="url(#colorWeek)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No readings this week" icon="📭" />}
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time in Range Donut */}
        <div className="card">
          <h3 className="card-header">Time in Range (7 days)</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${value}%`}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No data" icon="📊" />}
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {pieData.map((d, i) => (
              <span key={i} className="text-xs flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: d.color }} />
                {d.name}
              </span>
            ))}
          </div>
        </div>

        {/* Meal Context Distribution */}
        <div className="card">
          <h3 className="card-header">By Meal Context (7 days)</h3>
          {Object.keys(data.mealContextDistribution).length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={Object.entries(data.mealContextDistribution).map(([ctx, count]) => ({
                name: mealContextLabel(ctx),
                count,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#4CAF50" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No data" icon="📊" />}
        </div>

        {/* Readings Per Day */}
        <div className="card">
          <h3 className="card-header">Readings Per Day</h3>
          {data.readingsPerDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.readingsPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#2196F3" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No data" icon="📊" />}
        </div>
      </div>
    </div>
  );
}

// Need to import ReferenceLine
import { ReferenceLine } from 'recharts';