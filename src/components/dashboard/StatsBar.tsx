'use client';

import { AlertTriangle, Clock, Users, Wrench } from 'lucide-react';

interface StatsBarProps {
  analytics: any;
  incidents: any[];
  loading: boolean;
}

export function StatsBar({ analytics, incidents, loading }: StatsBarProps) {
  const openCount = incidents.filter((i) =>
    !['RESOLVED', 'CLOSED', 'REJECTED', 'MERGED'].includes(i.status)
  ).length;

  const p1Count = incidents.filter((i) => i.severity === 'P1' && !['RESOLVED', 'CLOSED'].includes(i.status)).length;

  const slaBreached = analytics?.slaCompliance?.filter((s: any) => s.sla_status === 'BREACHED')?.length ?? 0;

  const activeWo = analytics?.staffWorkload?.reduce((sum: number, s: any) => sum + (s.open_work_orders ?? 0), 0) ?? 0;

  const stats = [
    { label: 'Active Incidents', value: openCount, icon: AlertTriangle, color: 'text-red-500' },
    { label: 'P1 Critical', value: p1Count, icon: Clock, color: 'text-orange-500' },
    { label: 'SLA Breached', value: slaBreached, icon: Clock, color: 'text-yellow-600' },
    { label: 'Open Work Orders', value: activeWo, icon: Wrench, color: 'text-blue-500' },
  ];

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 flex items-center gap-3"
          >
            <div className={`p-2 rounded-lg bg-gray-50 dark:bg-gray-800 ${stat.color}`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {loading ? '—' : stat.value}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
