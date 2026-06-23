import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'gray';
  icon?: string;
  className?: string;
}

const colorMap = {
  green: 'border-l-4 border-green-500',
  red: 'border-l-4 border-red-500',
  yellow: 'border-l-4 border-yellow-500',
  blue: 'border-l-4 border-blue-500',
  purple: 'border-l-4 border-purple-500',
  gray: 'border-l-4 border-gray-500',
};

export default function StatCard({ title, value, subtitle, color = 'blue', icon, className = '' }: StatCardProps) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${colorMap[color]} ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
    </div>
  );
}