import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/readings', label: 'Glucose Log', icon: '📝' },
  { to: '/readings/new', label: 'Add Reading', icon: '➕' },
  { to: '/analysis', label: 'Analysis', icon: '📈' },
  { to: '/reports', label: 'Reports', icon: '📋' },
  { to: '/insulin', label: 'Insulin Log', icon: '💉' },
  { to: '/meals', label: 'Meals', icon: '🍽️' },
  { to: '/activities', label: 'Activities', icon: '🏃' },
  { to: '/medications', label: 'Medications', icon: '💊' },
  { to: '/alerts', label: 'Alerts', icon: '🔔' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
  const { logout } = useAuth();

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <NavLink to="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">B</span>
          </div>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-gray-100">BGMIQ</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Glucose Monitor</p>
          </div>
        </NavLink>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-400 w-full transition-colors"
        >
          <span className="text-lg">🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}