import React, { useState } from 'react';
import { reportsApi } from '../services/api';
import { DoctorReport } from '../types';
import { LoadingSpinner, ErrorMessage, EmptyState, KpiCard } from '../components/Shared';
import { formatDate, formatDateTime, mealContextLabel, getGMILevel, exportToPdf } from '../utils/helpers';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState<DoctorReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateReport = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await reportsApi.doctorReport({ startDate, endDate });
      setReport(res.data);
    } catch {
      setError('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!report) return;
    const kpis = report.kpis;

    const patientInfo = `
      <h1>Doctor's Report — ${report.patient.name}</h1>
      <p style="color:#666;">Generated: ${formatDate(report.generatedAt)}
      ${report.patient.profile?.diabetesType ? ` | Type: ${report.patient.profile.diabetesType}` : ''}
      ${report.patient.profile?.providerName ? ` | Provider: ${report.patient.profile.providerName}` : ''}
      </p>
      <p>Period: ${report.dateRange?.startDate || 'N/A'} to ${report.dateRange?.endDate || 'N/A'}</p>

      <h2>Summary</h2>
      <div class="kpi-grid">
        <div class="kpi-card"><div class="kpi-value">${report.summary.totalReadings}</div><div class="kpi-label">Total Readings</div></div>
        <div class="kpi-card"><div class="kpi-value">${report.summary.uniqueDays}</div><div class="kpi-label">Days Logged</div></div>
        <div class="kpi-card"><div class="kpi-value">${report.summary.readingsPerDay.toFixed(1)}</div><div class="kpi-label">Readings/Day</div></div>
      </div>

      <h2>Glucose KPIs</h2>
      <div class="kpi-grid">
        <div class="kpi-card"><div class="kpi-value">${kpis.average}</div><div class="kpi-label">Avg Glucose</div></div>
        <div class="kpi-card"><div class="kpi-value">${kpis.median}</div><div class="kpi-label">Median</div></div>
        <div class="kpi-card"><div class="kpi-value">${kpis.min} – ${kpis.max}</div><div class="kpi-label">Range</div></div>
        <div class="kpi-card"><div class="kpi-value">${kpis.stdDev}</div><div class="kpi-label">Std Deviation</div></div>
        <div class="kpi-card"><div class="kpi-value">${kpis.gmi}%</div><div class="kpi-label">GMI (Glucose Management Indicator)</div></div>
        <div class="kpi-card"><div class="kpi-value">${kpis.timeInRangePercent}%</div><div class="kpi-label">Time in Range</div></div>
        <div class="kpi-card"><div class="kpi-value">${kpis.timeBelowRangePercent}%</div><div class="kpi-label">Below Range</div></div>
        <div class="kpi-card"><div class="kpi-value">${kpis.timeAboveRangePercent}%</div><div class="kpi-label">Above Range</div></div>
        <div class="kpi-card"><div class="kpi-value">${kpis.adherencePercent}%</div><div class="kpi-label">Medication Adherence</div></div>
        <div class="kpi-card"><div class="kpi-value">${kpis.coefficientOfVariation}%</div><div class="kpi-label">Coefficient of Variation</div></div>
      </div>

      <h2>Events</h2>
      <div class="kpi-grid">
        <div class="kpi-card"><div class="kpi-value">${report.events.lowEvents}</div><div class="kpi-label">Low Events (&lt;70)</div></div>
        <div class="kpi-card"><div class="kpi-value">${report.events.highEvents}</div><div class="kpi-label">High Events (&gt;180)</div></div>
        <div class="kpi-card"><div class="kpi-value">${report.events.overnightLows}</div><div class="kpi-label">Overnight Lows</div></div>
        <div class="kpi-card"><div class="kpi-value">${report.events.morningHighs}</div><div class="kpi-label">Morning Highs</div></div>
        <div class="kpi-card"><div class="kpi-value">${report.events.postMealSpikes}</div><div class="kpi-label">Post-Meal Spikes</div></div>
      </div>

      ${report.medications.length > 0 ? `
        <h2>Active Medications</h2>
        <table>
          <tr><th>Medication</th><th>Dosage</th><th>Frequency</th></tr>
          ${report.medications.map(m => `<tr><td>${m.name}</td><td>${m.dosage}</td><td>${m.frequency}</td></tr>`).join('')}
        </table>
      ` : ''}

      ${Object.keys(report.insulinSummary).length > 0 ? `
        <h2>Insulin Usage</h2>
        <table>
          <tr><th>Type</th><th>Total Units</th><th>Doses</th></tr>
          ${Object.entries(report.insulinSummary).map(([type, s]) =>
            `<tr><td>${type}</td><td>${s.totalUnits.toFixed(1)}</td><td>${s.count}</td></tr>`
          ).join('')}
        </table>
      ` : ''}

      <h2>Glucose Trend Data</h2>
      <p style="color:#666;">${report.trendData.length} readings recorded in this period.</p>
    `;

    exportToPdf(patientInfo);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

      <div className="card">
        <h3 className="card-header">Generate Doctor's Report</h3>
        <div className="flex flex-wrap gap-4 items-end mb-4">
          <div>
            <label className="label">Start Date</label>
            <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="label">End Date</label>
            <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <button onClick={generateReport} disabled={loading} className="btn-primary">
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}

      {loading && <LoadingSpinner text="Generating report..." />}

      {report && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KpiCard label="Total Readings" value={report.summary.totalReadings} />
            <KpiCard label="Days Logged" value={report.summary.uniqueDays} />
            <KpiCard label="Days Logged %" value={`${report.summary.daysLoggedPercent}%`} color={report.summary.daysLoggedPercent >= 70 ? 'text-green-600' : 'text-yellow-600'} />
            <KpiCard label="Readings/Day" value={report.summary.readingsPerDay.toFixed(1)} />
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KpiCard label="Average" value={report.kpis.average} unit="mg/dL" color="text-blue-600" />
            <KpiCard label="Median" value={report.kpis.median} unit="mg/dL" />
            <KpiCard label="Min / Max" value={`${report.kpis.min}/${report.kpis.max}`} unit="mg/dL" />
            <KpiCard label="Std Dev" value={report.kpis.stdDev} />
            <KpiCard label="CV" value={`${report.kpis.coefficientOfVariation}%`} />
            <KpiCard label="GMI" value={`${report.kpis.gmi}%`} color={report.kpis.gmi < 7 ? 'text-green-600' : 'text-yellow-600'} />
            <KpiCard label="Time in Range" value={`${report.kpis.timeInRangePercent}%`} color="text-green-600" />
            <KpiCard label="Below Range" value={`${report.kpis.timeBelowRangePercent}%`} color="text-orange-500" />
            <KpiCard label="Above Range" value={`${report.kpis.timeAboveRangePercent}%`} color="text-yellow-600" />
            <KpiCard label="Medication" value={`${report.kpis.adherencePercent}%`} color="text-blue-600" />
            <KpiCard label="Low Events" value={report.events.lowEvents} color="text-orange-500" />
          </div>

          {/* Trend Chart */}
          {report.trendData.length > 0 && (
            <div className="card">
              <h3 className="card-header">Glucose Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={report.trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[40, 300]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#4CAF50" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Event Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KpiCard label="Low Events" value={report.events.lowEvents} color="text-orange-500" />
            <KpiCard label="High Events" value={report.events.highEvents} color="text-red-500" />
            <KpiCard label="Overnight Lows" value={report.events.overnightLows} color="text-orange-500" />
            <KpiCard label="Morning Highs" value={report.events.morningHighs} color="text-yellow-600" />
            <KpiCard label="Post-Meal Spikes" value={report.events.postMealSpikes} color="text-yellow-600" />
          </div>

          {/* Medications */}
          {report.medications.length > 0 && (
            <div className="card">
              <h3 className="card-header">Active Medications</h3>
              <div className="space-y-2">
                {report.medications.map((m, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <span className="text-lg">💊</span>
                    <div>
                      <p className="font-medium text-gray-900">{m.name}</p>
                      <p className="text-sm text-gray-500">{m.dosage} — {m.frequency}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insulin Summary */}
          {Object.keys(report.insulinSummary).length > 0 && (
            <div className="card">
              <h3 className="card-header">Insulin Usage</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(report.insulinSummary).map(([type, s]) => (
                  <KpiCard key={type} label={type.replace('_', ' ')} value={`${s.totalUnits.toFixed(1)}U`} />
                ))}
              </div>
            </div>
          )}

          {/* Print / Export */}
          <div className="flex justify-center">
            <button onClick={handlePrint} className="btn-primary px-8 py-3 text-lg">
              🖨️ Print / Export PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}