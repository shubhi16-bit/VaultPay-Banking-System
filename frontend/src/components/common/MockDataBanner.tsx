import React from 'react';
import { Database, AlertTriangle } from 'lucide-react';

interface MockDataBannerProps {
  className?: string;
}

export const MockDataBanner: React.FC<MockDataBannerProps> = ({ className = '' }) => {
  return (
    <div
      role="note"
      className={`bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-900 flex items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle size={15} className="text-amber-600 shrink-0" />
        <span>
          <strong>Simulated Sandbox Environment:</strong> Backend API endpoints are currently unavailable on this branch. Using local simulated data.
        </span>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold shrink-0">
        <Database size={12} />
        <span>Mock Mode Active</span>
      </div>
    </div>
  );
};
