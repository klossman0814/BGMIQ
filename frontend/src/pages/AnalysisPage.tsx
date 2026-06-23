import React, { useEffect, useState } from 'react';
import { analysisApi } from '../services/api';
import { AnalysisData } from '../types';
import { LoadingSpinner, ErrorMessage, KpiCard } from '../components/Shared';
import { mealContextLabel, getGMILevel } from '../utils/helpers';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';

const PIE_COLORS = { veryLow: '#8B0000', low: '#FF6B35', inRange: '#2ECC71', high: '#F39C12', veryHigh: '#E74C3C' };

export default function AnalysisPage() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);

  const fetchData = () => {
    setLoading(true);
    analysisApi.get(days)
      .then((res) => setData(res.data))
      .catch(() => setError('Failed to load analysis'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [days]);

  if (loading) return <LoadingSpinner text="Analyzing data..." />;
  if (error) return <ErrorMessage message={error} onRetry={fetchData} />;
  if (!data) return null;

  const { basic, detailed, timeInRange } = data;

  const pieData = [
    { name: 'Very Low (<54)', value: timeInRange.veryLow, color: PIE_COLORS.veryLow },
    { name: 'Low (54-69)', value: timeInRange.low, color: PIE_COLORS.low },
    { name: 'In Range (70-180)', value: timeInRange.inRange, color: PIE_COLORS.inRange },
    { name: 'High (181-250)', value: timeInRange.high, color: PIE_COLORS.high },
    { name: 'Very High (>250)', value: timeInRange.veryHigh, color: PIE_COLORS.veryHigh },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analysis</h1>
        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                days === d ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Basic KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        <KpiCard label="Avg Glucose" value={basic.average} unit="mg/dL" color="text-blue-600" />
        <KpiCard label="Median" value={basic.median} unit="mg/dL" />
        <KpiCard label="Min" value={basic.min} unit="mg/dL" color="text-green-600" />
        <KpiCard label="Max" value={basic.max} unit="mg/dL" color="text-red-600" />
        <KpiCard label="Std Dev" value={basic.stdDev} />
        <KpiCard label="CV" value={`${basic.coefficientOfVariation}%`} />
        <KpiCard label="GMI" value={`${basic.gmi}%`} color={basic.gmi > 0 ? (basic.gmi < 7 ? 'text-green-600' : 'text-yellow-600') : 'text-gray-400'} />
        <KpiCard label="Readings" value={basic.totalCount} />
      </div>
      {basic.gmi > 0 && <p className="text-xs text-gray-500 text-center -mt-3">GMI: {getGMILevel(basic.gmi).label}</p>}

      {/* Detailed KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Time in Range" value={`${basic.timeInRangePercent}%`} color="text-green-600" />
        <KpiCard label="Below Range" value={`${basic.timeBelowRangePercent}%`} color="text-orange-500" />
        <KpiCard label="Above Range" value={`${basic.timeAboveRangePercent}%`} color="text-yellow-600" />
        <KpiCard label="Readings/Day" value={detailed.readingsPerDay} />
        <KpiCard label="Hypoglycemia Events" value={detailed.hypoglycemiaEvents} color="text-orange-500" />
        <KpiCard label="Hyperglycemia Events" value={detailed.hyperglycemiaEvents} color="text-red-500" />
        <KpiCard label="Overnight Lows" value={detailed.overnightLows} color="text-orange-500" />
        <KpiCard label="Morning Highs" value={detailed.morningHighs} color="text-yellow-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Average Trend */}
        <div className="card">
          <h3 className="card-header">Daily Average Glucose</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.dailyAverages}>
              <defs>
                <linearGradient id="dailyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4CAF50" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis domain={[40, 300]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="avg" stroke="#4CAF50" fill="url(#dailyGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Time in Range Donut */}
        <div className="card">
          <h3 className="card-header">Time in Range Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ value }) => `${value}%`}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly Average */}
        <div className="card">
          <h3 className="card-header">Hourly Average Glucose</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.hourlyAverages}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 11 }}
                tickFormatter={(h) => `${h}:00`} />
              <YAxis domain={[40, 300]} tick={{ fontSize: 11 }} />
              <Tooltip labelFormatter={(h) => `${h}:00`} />
              <Line type="monotone" dataKey="avg" stroke="#4CAF50" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="min" stroke="#FF6B35" strokeWidth={1} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="max" stroke="#E74C3C" strokeWidth={1} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* By Meal Context */}
        <div className="card">
          <h3 className="card-header">Average by Meal Context</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={Object.entries(data.byMealContext).map(([ctx, val]) => ({
                name: mealContextLabel(ctx),
                avg: val.avg,
                count: val.count,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="avg" fill="#4CAF50" radius={[4, 4, 0, 0]} name="Avg Glucose" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}