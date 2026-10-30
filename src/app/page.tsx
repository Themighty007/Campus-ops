'use client';

import { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { IncidentList } from '@/components/dashboard/IncidentList';
import { BlastRadiusCard } from '@/components/dashboard/BlastRadiusCard';
import { RecoveryPlansCard } from '@/components/dashboard/RecoveryPlansCard';
import { AuditFeed } from '@/components/dashboard/AuditFeed';
import { ReportModal } from '@/components/dashboard/ReportModal';
import { StatsBar } from '@/components/dashboard/StatsBar';
import { ScenarioPanel } from '@/components/dashboard/ScenarioPanel';
import type { UserRole } from '@/lib/domain/enums';

export default function DashboardPage() {
  const [role, setRole] = useState<UserRole>('FACILITIES_ADMIN');
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [blastRadius, setBlastRadius] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [audit, setAudit] = useState<any[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    'x-aegis-role': role,
  }), [role]);

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch('/api/incidents', { headers: headers() });
      const data = await res.json();
      if (data.incidents) setIncidents(data.incidents);
    } catch (e) {
      console.error('Failed to fetch incidents', e);
    }
  }, [headers]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics', { headers: headers() });
      const data = await res.json();
      setAnalytics(data);
      if (data.recentAudit) setAudit(data.recentAudit);
    } catch (e) {
      console.error('Failed to fetch analytics', e);
    }
  }, [headers]);

  const fetchBlastRadius = useCallback(async (incidentId: string) => {
    try {
      const res = await fetch(`/api/blast-radius?incidentId=${incidentId}`, { headers: headers() });
      const data = await res.json();
      setBlastRadius(data.blastRadius);
    } catch (e) {
      console.error('Failed to fetch blast radius', e);
    }
  }, [headers]);

  const fetchPlans = useCallback(async (incidentId: string) => {
    try {
      const res = await fetch(`/api/plans?incidentId=${incidentId}`, { headers: headers() });
      const data = await res.json();
      if (data.plans) setPlans(data.plans);
    } catch (e) {
      console.error('Failed to fetch plans', e);
    }
  }, [headers]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchIncidents(), fetchAnalytics()]);
    setLoading(false);
  }, [fetchIncidents, fetchAnalytics]);

  useEffect(() => {
    refresh();
  }, [role]);

  useEffect(() => {
    if (selectedIncidentId) {
      fetchBlastRadius(selectedIncidentId);
      fetchPlans(selectedIncidentId);
    } else {
      setBlastRadius(null);
      setPlans([]);
    }
  }, [selectedIncidentId, fetchBlastRadius, fetchPlans]);

  const handleReport = async (text: string, roomHint?: string) => {
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ text, roomHint, source: 'WEB' }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowReport(false);
        await refresh();
        if (data.incident?.id) setSelectedIncidentId(data.incident.id);
        return data;
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError('Failed to submit report');
    }
  };

  const handleGeneratePlans = async (incidentId: string) => {
    const res = await fetch('/api/plans', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ incidentId }),
    });
    const data = await res.json();
    if (data.plans) setPlans(data.plans);
    return data;
  };

  const handleApprovePlan = async (planId: string, decision: 'APPROVED' | 'REJECTED', reason?: string) => {
    const res = await fetch(`/api/plans/${planId}/approve`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ decision, reason }),
    });
    const data = await res.json();
    if (res.ok && selectedIncidentId) {
      await fetchPlans(selectedIncidentId);
      await refresh();
    }
    return data;
  };

  const handleInjectScenario = async (scenario: string) => {
    const res = await fetch('/api/demo', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ action: 'inject_scenario', scenario }),
    });
    const data = await res.json();
    if (res.ok) {
      await refresh();
      if (data.incidentId) setSelectedIncidentId(data.incidentId);
    }
    return data;
  };

  const handleReset = async () => {
    const res = await fetch('/api/demo', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ action: 'seed' }),
    });
    if (res.ok) {
      setSelectedIncidentId(null);
      setBlastRadius(null);
      setPlans([]);
      await refresh();
    }
  };

  const selectedIncident = incidents.find((i: any) => i.id === selectedIncidentId);

  return (
    <div className="min-h-screen">
      <Navbar role={role} onRoleChange={setRole} onReport={() => setShowReport(true)} onReset={handleReset} />

      {error && (
        <div className="mx-4 mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-300 text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-medium hover:underline">Dismiss</button>
        </div>
      )}

      <StatsBar analytics={analytics} incidents={incidents} loading={loading} />

      <main className="max-w-[1600px] mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Incident list */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          <IncidentList
            incidents={incidents}
            selectedId={selectedIncidentId}
            onSelect={setSelectedIncidentId}
            loading={loading}
          />
          <ScenarioPanel onInject={handleInjectScenario} role={role} />
        </div>

        {/* Center: Blast radius + Plans */}
        <div className="lg:col-span-5 xl:col-span-6 space-y-4">
          {selectedIncident ? (
            <>
              <BlastRadiusCard incident={selectedIncident} blastRadius={blastRadius} />
              <RecoveryPlansCard
                incident={selectedIncident}
                plans={plans}
                role={role}
                onGenerate={() => handleGeneratePlans(selectedIncident.id)}
                onApprove={handleApprovePlan}
              />
            </>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center text-gray-500">
              <div className="text-5xl mb-4">🛡️</div>
              <h2 className="text-lg font-semibold mb-2">Aegis Command Centre</h2>
              <p className="text-sm max-w-md mx-auto">
                Select an incident to view its blast radius and recovery plans,
                or report a new issue.
              </p>
            </div>
          )}
        </div>

        {/* Right: Audit feed */}
        <div className="lg:col-span-3">
          <AuditFeed events={audit} />
        </div>
      </main>

      {showReport && (
        <ReportModal
          onSubmit={handleReport}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
