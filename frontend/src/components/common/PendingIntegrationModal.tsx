import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { ServerOff, RefreshCw, Sparkles, AlertCircle, Code } from 'lucide-react';

interface PendingIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  operationName: string; // e.g. "Payment Transfer", "Demo Deposit"
  endpoint: string; // e.g. "/api/payments"
  method?: string; // e.g. "POST"
  payload?: Record<string, unknown>;
  onRetry: () => void;
  onSimulateSandbox?: () => void;
  isRetrying?: boolean;
}

export const PendingIntegrationModal: React.FC<PendingIntegrationModalProps> = ({
  isOpen,
  onClose,
  title = 'Backend Confirmation Required',
  operationName,
  endpoint,
  method = 'POST',
  payload,
  onRetry,
  onSimulateSandbox,
  isRetrying = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4 text-left">
        {/* Banner */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <ServerOff className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-950">
              Live Backend Service Offline
            </h4>
            <p className="text-xs text-amber-900 leading-relaxed">
              In accordance with project safety guidelines, <strong>{operationName}</strong> cannot be marked as successful or deducted from your account balance without confirmation from your teammate’s live backend API.
            </p>
          </div>
        </div>

        {/* Technical Contract Specification */}
        <div className="bg-slate-900 rounded-2xl p-4 text-slate-200 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Code size={14} className="text-indigo-400" />
              Required Teammate API Endpoint
            </span>
            <span className="font-mono bg-slate-800 text-amber-300 px-2 py-0.5 rounded text-[11px] font-bold">
              {method} {endpoint}
            </span>
          </div>

          {payload && (
            <div className="space-y-1">
              <p className="text-[11px] text-slate-400">Prepared Request Payload:</p>
              <pre className="text-[11px] font-mono bg-slate-950/80 p-2.5 rounded-xl overflow-x-auto text-emerald-400 border border-slate-800">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </div>
          )}

          <p className="text-[11px] text-slate-400 border-t border-slate-800 pt-2 flex items-center gap-1">
            <AlertCircle size={13} className="text-indigo-400 shrink-0" />
            <span>Target Host: <code>http://localhost:5000</code> (configured in <code>.env</code>)</span>
          </p>
        </div>

        {/* Explanatory Notice */}
        <div className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
          <p>
            <strong>College Project Note:</strong> When your teammate starts the backend server on port 5000 with MySQL, click <em>&ldquo;Retry with Live Backend&rdquo;</em> to process real verified transactions.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <Button
            variant="primary"
            fullWidth
            onClick={onRetry}
            isLoading={isRetrying}
            leftIcon={<RefreshCw size={16} />}
          >
            Check Backend &amp; Retry
          </Button>

          {onSimulateSandbox && (
            <Button
              variant="outline"
              fullWidth
              onClick={onSimulateSandbox}
              leftIcon={<Sparkles size={16} className="text-amber-500" />}
              className="border-amber-300 hover:bg-amber-50 text-amber-900"
            >
              Preview UI with Local Sandbox Data
            </Button>
          )}

          <Button variant="ghost" fullWidth onClick={onClose} size="sm">
            Cancel &amp; Keep Form
          </Button>
        </div>
      </div>
    </Modal>
  );
};

