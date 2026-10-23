import React from 'react';
import { Database, AlertTriangle, CheckCircle2, Server } from 'lucide-react';
import { useBank } from '../../context/BankContext';

interface MockDataBannerProps {
  className?: string;
}

export const MockDataBanner: React.FC<MockDataBannerProps> = ({ className = '' }) => {
  const { isBackendOnline } = useBank();

  if (isBackendOnline) {
    return (
      <div
        role="note"
        className={`bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2 text-xs text-emerald-950 flex items-center justify-between gap-3 ${className}`}
      >
        <div className="flex items-center gap-2 font-medium">
          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
          <span>
            <strong>Live Backend Connected:</strong> Teammate API server is online and confirming transactions.
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-semibold shrink-0">
          <Server size={12} />
          <span>Live API Online</span>
        </div>
      </div>
    );
  }

  return (
    <div
      role="note"
      className={`bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-950 flex items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle size={15} className="text-amber-600 shrink-0" />
        <span>
          <strong>Simulated Sandbox Environment:</strong> Live backend server (http://localhost:5000) is offline. Transactions require backend confirmation.
        </span>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 text-[11px] bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full font-semibold shrink-0">
        <Database size={12} />
        <span>Live Backend Offline</span>
      </div>
    </div>
  );
};
