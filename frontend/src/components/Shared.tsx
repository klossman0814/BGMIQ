import React from 'react';

export function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-primary-200 dark:border-primary-800 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>
      </div>
    </div>
  );
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
      <p className="text-red-700 dark:text-red-300 text-sm">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 text-sm text-red-600 dark:text-red-400 underline hover:no-underline">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = '📭', title, description, children }: { icon?: string; title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{title}</h3>
      {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>}
      {children}
    </div>
  );
}

export function GlucoseBadge({ value }: { value: number }) {
  let bg, text, label;
  if (value < 54) { bg = 'bg-red-900'; text = 'text-white'; label = 'Critical Low'; }
  else if (value < 70) { bg = 'bg-orange-500'; text = 'text-white'; label = 'Low'; }
  else if (value <= 180) { bg = 'bg-green-500'; text = 'text-white'; label = 'In Range'; }
  else if (value <= 250) { bg = 'bg-yellow-500'; text = 'text-black'; label = 'High'; }
  else { bg = 'bg-red-600'; text = 'text-white'; label = 'Critical High'; }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      <span>{value}</span>
      <span className="opacity-75">{label}</span>
    </span>
  );
}

export function KpiCard({ label, value, unit, color }: { label: string; value: string | number; unit?: string; color?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-4 text-center shadow-sm">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color || 'text-gray-900 dark:text-gray-100'}`}>
        {value}{unit && <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-0.5">{unit}</span>}
      </p>
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl">&times;</button>
        </div>
        <div className="p-5 text-gray-800 dark:text-gray-200">{children}</div>
      </div>
    </div>
  );
}