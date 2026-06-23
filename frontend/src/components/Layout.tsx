import React from 'react';
import { useAuth } from '../hooks/useAuth';
import Sidebar from './Sidebar';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800">BGMIQ</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
              {user?.email}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}