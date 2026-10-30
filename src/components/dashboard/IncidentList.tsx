'use client';

import { AlertCircle, Zap, Wifi, Droplets, Thermometer, Shield, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IncidentListProps {
  incidents: any[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  ELECTRICAL: <Zap className="w-4 h-4" />,
  NETWORK: <Wifi className="w-4 h-4" />,
  PLUMBING: <Droplets className="w-4 h-4" />,
  HVAC: <Thermometer className="w-4 h-4" />,
  SAFETY: <Shield className="w-4 h-4" />,
};

const SEVERITY_STYLES: Record<string, string> = {
  P1: 'bg-red-500',
  P2: 'bg-orange-500',
  P3: 'bg-yellow-500',
  P4: 'bg-green-500',
};

export function IncidentList({ incidents, selectedId, onSelect, loading }: IncidentListProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const open = incidents.filter((i) => !['RESOLVED', 'CLOSED', 'REJECTED', 'MERGED'].includes(i.status));
  const closed = incidents.filter((i) => ['RESOLVED', 'CLOSED'].includes(i.status));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <h2 className="font-semibold text-sm">Active Incidents</h2>
        <span className="text-xs text-gray-500 tabular-nums">{open.length} open</span>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[500px] overflow-y-auto">
        {open.length === 0 && (
          <div className="p-6 text-center text-sm text-gray-500">
            No active incidents. Use the scenario panel below to inject one.
          </div>
        )}

        {open.map((incident) => (
          <button
            key={incident.id}
            onClick={() => onSelect(incident.id)}
            className={cn(
              'w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
              selectedId === incident.id && 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500',
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-gray-400">
                {CATEGORY_ICONS[incident.category] ?? <AlertCircle className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-mono text-gray-500">{incident.code}</span>
                  <span className={cn('w-2 h-2 rounded-full', SEVERITY_STYLES[incident.severity] ?? 'bg-gray-400')} />
                  <span className="text-xs font-medium">{incident.severity}</span>
                </div>
                <p className="text-sm font-medium truncate">{incident.summary}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="status-badge bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {incident.status}
                  </span>
                  {incident.continuityStatus !== 'NONE' && (
                    <span className={cn(
                      'status-badge',
                      incident.continuityStatus === 'AT_RISK' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                      incident.continuityStatus === 'PLANNED' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                      incident.continuityStatus === 'RESTORED' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
                      incident.continuityStatus === 'LOST' && 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
                    )}>
                      {incident.continuityStatus}
                    </span>
                  )}
                  {incident.isSafety && (
                    <span className="status-badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                      ⚠ SAFETY
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {closed.length > 0 && (
        <details className="border-t border-gray-100 dark:border-gray-800">
          <summary className="px-4 py-2 text-xs text-gray-500 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
            {closed.length} resolved/closed
          </summary>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {closed.map((i) => (
              <button
                key={i.id}
                onClick={() => onSelect(i.id)}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 opacity-60"
              >
                <span className="text-xs font-mono">{i.code}</span>
                <span className="text-xs ml-2">{i.summary?.slice(0, 60)}</span>
              </button>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
