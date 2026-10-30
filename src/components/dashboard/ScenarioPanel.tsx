'use client';

import { useState } from 'react';
import { Zap, Wifi, Droplets, Loader2, FlaskConical } from 'lucide-react';
import type { UserRole } from '@/lib/domain/enums';

interface ScenarioPanelProps {
  onInject: (scenario: string) => Promise<any>;
  role: UserRole;
}

const SCENARIOS = [
  {
    id: 'electrical_exam',
    name: '⚡ Electrical Failure + Exam',
    desc: 'Circuit breaker trip in B-204, exam in 45 min',
    icon: Zap,
    color: 'text-red-500',
  },
  {
    id: 'network_lab',
    name: '🌐 Network Outage + Lab',
    desc: 'Switch failure in A-301, 60 students affected',
    icon: Wifi,
    color: 'text-blue-500',
  },
  {
    id: 'water_leak',
    name: '💧 Plumbing Emergency',
    desc: 'Ceiling leak in C-102, equipment at risk',
    icon: Droplets,
    color: 'text-cyan-500',
  },
];

export function ScenarioPanel({ onInject, role }: ScenarioPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const canInject = ['FACILITIES_ADMIN', 'SYSTEM_ADMIN'].includes(role);

  if (!canInject) return null;

  const handleInject = async (scenarioId: string) => {
    setLoading(scenarioId);
    setFeedback(null);
    try {
      const result = await onInject(scenarioId);
      setFeedback(result.message ?? 'Scenario injected.');
    } catch {
      setFeedback('Failed to inject scenario.');
    }
    setLoading(null);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
        <FlaskConical className="w-4 h-4 text-purple-500" />
        <h2 className="font-semibold text-sm">Chaos Lab</h2>
      </div>

      {feedback && (
        <div className="px-4 py-2 text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 border-b border-purple-100 dark:border-purple-800">
          {feedback}
        </div>
      )}

      <div className="p-3 space-y-2">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => handleInject(s.id)}
            disabled={loading !== null}
            className="w-full text-left bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 rounded-lg p-3 transition-colors"
          >
            <div className="flex items-center gap-2">
              {loading === s.id ? (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              ) : (
                <s.icon className={`w-4 h-4 ${s.color}`} />
              )}
              <span className="text-sm font-medium">{s.name}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 ml-6">{s.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
