import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import { LoadingSpinner } from './components/Shared';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import GlucoseLogPage from './pages/GlucoseLogPage';
import AddReadingPage from './pages/AddReadingPage';
import AnalysisPage from './pages/AnalysisPage';
import ReportsPage from './pages/ReportsPage';
import MedicationsPage from './pages/MedicationsPage';
import SettingsPage from './pages/SettingsPage';
import MealsPage from './pages/MealsPage';
import ActivitiesPage from './pages/ActivitiesPage';
import InsulinPage from './pages/InsulinPage';
import AlertsPage from './pages/AlertsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner text="Authenticating..." />;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner text="Loading..." />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/readings" element={<ProtectedRoute><GlucoseLogPage /></ProtectedRoute>} />
          <Route path="/readings/new" element={<ProtectedRoute><AddReadingPage /></ProtectedRoute>} />
          <Route path="/readings/:id/edit" element={<ProtectedRoute><AddReadingPage /></ProtectedRoute>} />
          <Route path="/analysis" element={<ProtectedRoute><AnalysisPage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
          <Route path="/medications" element={<ProtectedRoute><MedicationsPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/meals" element={<ProtectedRoute><MealsPage /></ProtectedRoute>} />
          <Route path="/activities" element={<ProtectedRoute><ActivitiesPage /></ProtectedRoute>} />
          <Route path="/insulin" element={<ProtectedRoute><InsulinPage /></ProtectedRoute>} />
          <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}