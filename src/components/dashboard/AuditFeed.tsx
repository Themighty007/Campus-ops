'use client';

import { formatDistanceToNow } from 'date-fns';

interface AuditFeedProps {
  events: any[];
}

const ACTION_ICONS: Record<string, string> = {
  INCIDENT_CREATED: '📝',
  AUTO_ASSIGNED: '🤖',
  PLANS_GENERATED: '⚡',
  PLAN_APPROVED_AND_EXECUTED: '✅',
  PLAN_REJECTED: '❌',
  INCIDENT_TRANSITION: '🔄',
  WORK_ORDER_TRANSITION: '🔧',
  WEBHOOK_INCIDENT_CREATED: '📡',
  SCENARIO_INJECTED: '🎭',
  DEMO_RESET: '🔁',
  SLA_BREACH_ESCALATED: '🚨',
  WORKAROUND_APPLIED: '⚡',
};

export function AuditFeed({ events }: AuditFeedProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <h2 className="font-semibold text-sm">Audit Trail</h2>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[600px] overflow-y-auto">
        {events.length === 0 && (
          <div className="p-6 text-center text-sm text-gray-500">
            No events yet.
          </div>
        )}
        {events.map((event: any, idx: number) => (
          <div key={event.id ?? idx} className="px-4 py-2.5">
            <div className="flex items-start gap-2">
              <span className="text-sm mt-0.5">{ACTION_ICONS[event.action] ?? '•'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">
                  {event.action?.replace(/_/g, ' ')}
                </p>
                {event.incident_id && (
                  <p className="text-xs text-gray-500 truncate">
                    Incident: {event.incident_id?.slice(0, 8)}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">
                  {event.actor_kind === 'USER' ? '👤' : event.actor_kind === 'AI' ? '🤖' : '⚙️'}
                  {' '}
                  {event.created_at
                    ? formatDistanceToNow(new Date(event.created_at), { addSuffix: true })
                    : ''}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
