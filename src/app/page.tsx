'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BrutalNavbar } from '@/components/brutal/Navbar';
import { LandingHero } from '@/components/brutal/LandingHero';
import { ActiveIncidentsGrid } from '@/components/brutal/ActiveIncidentsGrid';
import { BlastRadiusCockpit } from '@/components/brutal/BlastRadiusCockpit';
import { LoginModal } from '@/components/brutal/LoginModal';
import { ReportIssueModal } from '@/components/brutal/ReportIssueModal';
import { BrutalFooter } from '@/components/brutal/Footer';
import type { UserRole } from '@/lib/domain/enums';

export default function HomePage() {
  const [currentRole, setCurrentRole] = useState<UserRole>('FACILITIES_ADMIN');
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [blastRadius, setBlastRadius] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginSubdivision, setLoginSubdivision] = useState<'student' | 'management'>('student');
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Header factory to pass active persona role to backend
  const getHeaders = useCallback(
    () => ({
      'Content-Type': 'application/json',
      'x-aegis-role': currentRole,
    }),
    [currentRole]
  );

  // Fetch live incidents
  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch('/api/incidents', { headers: getHeaders() });
      const data = await res.json();
      if (data.incidents) {
        setIncidents(data.incidents);
        // Default select the first incident if none selected
        if (!selectedIncidentId && data.incidents.length > 0) {
          setSelectedIncidentId(data.incidents[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load incidents', e);
    }
  }, [getHeaders, selectedIncidentId]);

  // Fetch blast radius for selected incident
  const fetchBlastRadius = useCallback(
    async (incidentId: string) => {
      try {
        const res = await fetch(`/api/blast-radius?incidentId=${incidentId}`, {
          headers: getHeaders(),
        });
        const data = await res.json();
        if (data.blastRadius) setBlastRadius(data.blastRadius);
      } catch (e) {
        console.error('Failed to load blast radius', e);
      }
    },
    [getHeaders]
  );

  // Fetch recovery plans for selected incident
  const fetchPlans = useCallback(
    async (incidentId: string) => {
      try {
        const res = await fetch(`/api/plans?incidentId=${incidentId}`, {
          headers: getHeaders(),
        });
        const data = await res.json();
        if (data.plans) setPlans(data.plans);
      } catch (e) {
        console.error('Failed to load recovery plans', e);
      }
    },
    [getHeaders]
  );

  // Initial load
  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents, currentRole]);

  // Sync selected incident details
  useEffect(() => {
    if (selectedIncidentId) {
      fetchBlastRadius(selectedIncidentId);
      fetchPlans(selectedIncidentId);
    }
  }, [selectedIncidentId, fetchBlastRadius, fetchPlans]);

  // Handler: Generate deterministic plans
  const handleGeneratePlans = async (incidentId: string) => {
    const res = await fetch('/api/plans', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ incidentId }),
    });
    const data = await res.json();
    if (data.plans) setPlans(data.plans);
    return data;
  };

  // Handler: Approve or reject plan
  const handleApprovePlan = async (
    planId: string,
    decision: 'APPROVED' | 'REJECTED',
    reason?: string
  ) => {
    const res = await fetch(`/api/plans/${planId}/approve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ decision, reason }),
    });
    const data = await res.json();
    if (res.ok && selectedIncidentId) {
      await fetchPlans(selectedIncidentId);
      await fetchIncidents();
    }
    return data;
  };

  // Handler: Inject chaos scenario
  const handleTriggerChaos = async (scenario: string) => {
    const res = await fetch('/api/demo', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ action: 'inject_scenario', scenario }),
    });
    const data = await res.json();
    if (res.ok) {
      await fetchIncidents();
      if (data.incidentId) {
        setSelectedIncidentId(data.incidentId);
      }
    }
  };

  // Handler: Reset demo
  const handleResetDemo = async () => {
    const res = await fetch('/api/demo', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ action: 'seed' }),
    });
    if (res.ok) {
      await fetchIncidents();
      setSelectedIncidentId(null);
      setBlastRadius(null);
      setPlans([]);
    }
  };

  // Handler: Submit new incident
  const handleReportSubmit = async (text: string, roomHint?: string) => {
    const res = await fetch('/api/incidents', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text, roomHint, source: 'WEB' }),
    });
    const data = await res.json();
    if (res.ok) {
      await fetchIncidents();
      if (data.incident?.id) {
        setSelectedIncidentId(data.incident.id);
      }
    }
    return data;
  };

  // Currently selected incident object
  const selectedIncident =
    incidents.find((i) => i.id === selectedIncidentId) || incidents[0] || null;

  return (
    <div className="min-h-screen flex flex-col bg-grid-paper">
      {/* 1. TOP NAVBAR WITH TWO SUBDIVISION LOGIN BUTTONS */}
      <BrutalNavbar
        currentRole={currentRole}
        onOpenLogin={(sub) => {
          setLoginSubdivision(sub);
          setLoginModalOpen(true);
        }}
        onOpenReport={() => setReportModalOpen(true)}
        onResetDemo={handleResetDemo}
        onOpenChaos={() => {
          const el = document.getElementById('incidents-grid');
          el?.scrollIntoView({ behavior: 'smooth' });
        }}
        activeCount={incidents.filter((i) => !['RESOLVED', 'CLOSED'].includes(i.status)).length}
      />

      {/* 2. HERO SECTION RECREATING REFERENCE IMAGE 3 (Cassette Tapes, Highlighter, Stickers) */}
      <LandingHero
        onOpenStudentLogin={() => {
          setLoginSubdivision('student');
          setLoginModalOpen(true);
        }}
        onOpenManagementLogin={() => {
          setLoginSubdivision('management');
          setLoginModalOpen(true);
        }}
        onScrollToIncidents={() => {
          const el = document.getElementById('incidents-grid');
          el?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* 3. ACTIVE INCIDENTS GRID & CHAOS LAB (Recreating Reference Image 4) */}
      <div id="incidents-grid">
        <ActiveIncidentsGrid
          incidents={incidents}
          selectedId={selectedIncidentId}
          onSelectIncident={(id) => {
            setSelectedIncidentId(id);
            const el = document.getElementById('blast-cockpit');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          onOpenReportModal={() => setReportModalOpen(true)}
          onTriggerChaos={handleTriggerChaos}
        />
      </div>

      {/* 4. BLAST RADIUS & RECOVERY COCKPIT (Recreating Reference Image 1) */}
      <div id="blast-cockpit">
        {selectedIncident && (
          <BlastRadiusCockpit
            incident={selectedIncident}
            blastRadius={blastRadius}
            plans={plans}
            currentRole={currentRole}
            onGeneratePlans={handleGeneratePlans}
            onApprovePlan={handleApprovePlan}
          />
        )}
      </div>

      {/* 5. FOOTER RECREATING REFERENCE IMAGE 2 (Black Grid, Pixel Art Badge) */}
      <BrutalFooter />

      {/* 6. MODALS */}
      {/* (a) Login Portal with Two Subdivisions */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        defaultSubdivision={loginSubdivision}
        currentRole={currentRole}
        onSelectRole={(role) => setCurrentRole(role)}
      />

      {/* (b) Natural Language Report Modal */}
      <ReportIssueModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        onSubmit={handleReportSubmit}
      />
    </div>
  );
}
