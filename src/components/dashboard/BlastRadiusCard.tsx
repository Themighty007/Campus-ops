'use client';

import { Users, MapPin, Clock, Wrench, AlertTriangle, BookOpen } from 'lucide-react';

interface BlastRadiusCardProps {
  incident: any;
  blastRadius: any;
}

export function BlastRadiusCard({ incident, blastRadius }: BlastRadiusCardProps) {
  const deadline = incident.activityDeadlineAt
    ? new Date(incident.activityDeadlineAt)
    : blastRadius?.earliestDeadline
      ? new Date(blastRadius.earliestDeadline)
      : null;

  const minutesLeft = deadline
    ? Math.max(0, Math.round((deadline.getTime() - Date.now()) / 60_000))
    : null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          Blast Radius — {incident.code}
        </h2>
        <span className={`severity-${incident.severity} status-badge font-bold`}>
          {incident.severity}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary */}
        <p className="text-sm">{incident.summary}</p>

        {/* Deadline countdown */}
        {minutesLeft !== null && minutesLeft < 480 && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            minutesLeft < 30
              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
          }`}>
            <Clock className={`w-4 h-4 ${minutesLeft < 30 ? 'text-red-600' : 'text-yellow-600'}`} />
            <span className="text-sm font-medium">
              {minutesLeft < 60
                ? `${minutesLeft} min until next activity`
                : `${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}m until next activity`}
            </span>
          </div>
        )}

        {/* Metrics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {blastRadius?.room && (
            <MetricCard
              icon={<MapPin className="w-4 h-4" />}
              label="Room"
              value={blastRadius.room.code}
              detail={blastRadius.room.name}
            />
          )}
          <MetricCard
            icon={<BookOpen className="w-4 h-4" />}
            label="Activities"
            value={blastRadius?.activities?.length ?? 0}
            detail="at risk"
          />
          <MetricCard
            icon={<Users className="w-4 h-4" />}
            label="People"
            value={blastRadius?.affectedPeople ?? 0}
            detail="affected"
          />
          <MetricCard
            icon={<Wrench className="w-4 h-4" />}
            label="Staff"
            value={blastRadius?.assignedStaff?.length ?? 0}
            detail="involved"
          />
        </div>

        {/* Affected activities */}
        {blastRadius?.activities?.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              At-Risk Activities
            </h3>
            <div className="space-y-1.5">
              {blastRadius.activities.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                  <div>
                    <span className="font-medium">{a.title}</span>
                    {a.courseCode && <span className="text-xs text-gray-500 ml-2">{a.courseCode}</span>}
                  </div>
                  <div className="text-xs text-gray-500 tabular-nums">
                    {new Date(a.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {' – '}
                    {new Date(a.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cohorts */}
        {blastRadius?.cohorts?.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Affected Cohorts
            </h3>
            <div className="flex flex-wrap gap-2">
              {blastRadius.cohorts.map((c: any, i: number) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full px-2.5 py-1">
                  <Users className="w-3 h-3" />
                  {c.label} ({c.headcount})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Required parts/skill */}
        <div className="flex flex-wrap gap-2 text-xs">
          {blastRadius?.requiredSkill && (
            <span className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full px-2.5 py-1">
              Skill: {blastRadius.requiredSkill}
            </span>
          )}
          {blastRadius?.requiredPart && (
            <span className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-full px-2.5 py-1">
              Part: {blastRadius.requiredPart.name} ({blastRadius.requiredPart.qtyAvailable - blastRadius.requiredPart.qtyReserved} free)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string | number; detail: string }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
      <div className="flex justify-center text-gray-400 mb-1">{icon}</div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-gray-500">{detail}</p>
    </div>
  );
}
