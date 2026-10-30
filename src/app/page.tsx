'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BrutalNavbar } from '@/components/brutal/Navbar';
import { LandingHero } from '@/components/brutal/LandingHero';
import { ActiveIncidentsGrid } from '@/components/brutal/ActiveIncidentsGrid';
import { BlastRadiusCockpit } from '@/components/brutal/BlastRadiusCockpit';
import { LoginModal } from '@/components/brutal/LoginModal';
import { ReportIssueModal } from '@/components/brutal/ReportIssueModal';
import { BrutalFooter } from '@/components/brutal/Footer';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { StudentDashboard } from '@/components/dashboard/StudentDashboard';
import { TeacherDashboard } from '@/components/dashboard/TeacherDashboard';
import { TechnicianDashboard } from '@/components/dashboard/TechnicianDashboard';
import { SuperAdminDashboard } from '@/components/dashboard/SuperAdminDashboard';
import { InventoryDashboard } from '@/components/dashboard/InventoryDashboard';
import { DepartmentHeadDashboard } from '@/components/dashboard/DepartmentHeadDashboard';
import { WorkOrdersQueriesView } from '@/components/dashboard/WorkOrdersQueriesView';
import { CampusRoomsLabsView } from '@/components/dashboard/CampusRoomsLabsView';
import { DEMO_PERSONAS, PersonaId } from '@/types/personas';
import type { UserRole } from '@/lib/domain/enums';

export default function HomePage() {
  // Navigation & View Mode: 'landing' or 'dashboard'
  const [viewMode, setViewMode] = useState<'landing' | 'dashboard'>('landing');
  const [activePersonaId, setActivePersonaId] = useState<PersonaId>('student');
  const [dashboardTab, setDashboardTab] = useState<string>('overview');

  // Backend Role state (synced with active persona)
  const [currentRole, setCurrentRole] = useState<UserRole>(DEMO_PERSONAS.student.role);

  // Live Incident & Cockpit State
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [blastRadius, setBlastRadius] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginSubdivision, setLoginSubdivision] = useState<'student' | 'management'>('student');
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Sync role whenever activePersonaId changes
  useEffect(() => {
    const persona = DEMO_PERSONAS[activePersonaId];
    if (persona) {
      setCurrentRole(persona.role);
    }
  }, [activePersonaId]);

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

  // Handler: Login persona selection -> immediately enters dashboard!
  const handleSelectPersonaFromModal = (role: UserRole, personaId?: PersonaId) => {
    if (personaId) {
      setActivePersonaId(personaId);
      setCurrentRole(DEMO_PERSONAS[personaId].role);
    } else {
      setCurrentRole(role);
    }
    setViewMode('dashboard');
    setDashboardTab('overview');
  };

  // Active persona profile
  const currentPersona = DEMO_PERSONAS[activePersonaId];

  // Currently selected incident object
  const selectedIncident =
    incidents.find((i) => i.id === selectedIncidentId) || incidents[0] || null;

  // =========================================================================
  // VIEW MODE A: ROLE-SPECIFIC CRM DASHBOARD (When logged in)
  // =========================================================================
  if (viewMode === 'dashboard') {
    return (
      <DashboardLayout
        currentPersona={currentPersona}
        onSwitchPersona={(id) => {
          setActivePersonaId(id);
          setCurrentRole(DEMO_PERSONAS[id].role);
          setDashboardTab('overview');
        }}
        onExitToLanding={() => setViewMode('landing')}
        activeTab={dashboardTab}
        onSelectTab={(tab) => setDashboardTab(tab)}
      >
        {/* =========================================================================
            ROLE 1: STUDENT (Aarav Patel) — Strictly 2-3 Tabs
            Tabs: 'overview', 'queries', 'relocated'
        ========================================================================= */}
        {activePersonaId === 'student' && (
          <>
            {dashboardTab === 'overview' && (
              <StudentDashboard
                persona={currentPersona}
                onOpenReportModal={() => setReportModalOpen(true)}
                onOpenCockpit={() => setDashboardTab('relocated')}
              />
            )}
            {dashboardTab === 'queries' && (
              <WorkOrdersQueriesView
                persona={currentPersona}
                onOpenReport={() => setReportModalOpen(true)}
                onOpenCockpit={() => setDashboardTab('relocated')}
              />
            )}
            {dashboardTab === 'relocated' && (
              <CampusRoomsLabsView
                persona={currentPersona}
                onOpenCockpit={() => setDashboardTab('overview')}
              />
            )}
          </>
        )}

        {/* =========================================================================
            ROLE 2: TEACHER / FACULTY (Prof. Ananya Sen) — Strictly 3-4 Tabs
            Tabs: 'overview', 'continuity', 'queries', 'labs'
        ========================================================================= */}
        {activePersonaId === 'teacher' && (
          <>
            {dashboardTab === 'overview' && (
              <TeacherDashboard persona={currentPersona} />
            )}
            {dashboardTab === 'continuity' && (
              <CampusRoomsLabsView
                persona={currentPersona}
                onOpenCockpit={() => setDashboardTab('overview')}
              />
            )}
            {dashboardTab === 'queries' && (
              <WorkOrdersQueriesView
                persona={currentPersona}
                onOpenReport={() => setReportModalOpen(true)}
                onOpenCockpit={() => setDashboardTab('continuity')}
              />
            )}
            {dashboardTab === 'labs' && (
              <CampusRoomsLabsView
                persona={currentPersona}
                onOpenCockpit={() => setDashboardTab('overview')}
              />
            )}
          </>
        )}

        {/* =========================================================================
            ROLE 3: FIELD TECHNICIAN (Rajesh Kumar) — Strictly 3-4 Tabs
            Tabs: 'overview', 'workorders', 'parts'
        ========================================================================= */}
        {activePersonaId === 'technician' && (
          <>
            {dashboardTab === 'overview' && (
              <TechnicianDashboard
                persona={currentPersona}
                onWorkOrderCompleted={() => fetchIncidents()}
              />
            )}
            {dashboardTab === 'workorders' && (
              <WorkOrdersQueriesView
                persona={currentPersona}
                onOpenReport={() => setReportModalOpen(true)}
                onOpenCockpit={() => setDashboardTab('overview')}
              />
            )}
            {dashboardTab === 'parts' && (
              <InventoryDashboard persona={currentPersona} />
            )}
          </>
        )}

        {/* =========================================================================
            ROLE 4: SUPER ADMIN (Chief Controller) — Strictly 5-7 Tabs, 1 Page Each
            Tabs: 'overview', 'ai-reviewer', 'live-incidents', 'blast-cockpit', 'users', 'ai-chat', 'audit'
        ========================================================================= */}
        {activePersonaId === 'superadmin' && (
          <>
            {dashboardTab === 'overview' && (
              <SuperAdminDashboard
                persona={currentPersona}
                activeSubTab="overview"
                onSelectSubTab={(tab) => setDashboardTab(tab)}
                onOpenCockpit={() => setDashboardTab('blast-cockpit')}
              />
            )}
            {dashboardTab === 'ai-reviewer' && (
              <SuperAdminDashboard
                persona={currentPersona}
                activeSubTab="ai-reviewer"
                onSelectSubTab={(tab) => setDashboardTab(tab)}
                onOpenCockpit={() => setDashboardTab('blast-cockpit')}
              />
            )}
            {dashboardTab === 'live-incidents' && (
              <WorkOrdersQueriesView
                persona={currentPersona}
                onOpenReport={() => setReportModalOpen(true)}
                onOpenCockpit={() => setDashboardTab('blast-cockpit')}
              />
            )}
            {dashboardTab === 'blast-cockpit' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-[#18181B] uppercase tracking-tight">
                    Deterministic Blast Radius & AI Recovery Cockpit
                  </h2>
                  <button
                    onClick={() => setDashboardTab('overview')}
                    className="px-3 py-1.5 bg-white border-2 border-black rounded-lg text-xs font-bold hover:bg-zinc-100 shadow-brutal-sm"
                  >
                    ← Return to Overview
                  </button>
                </div>
                <BlastRadiusCockpit
                  incident={selectedIncident}
                  blastRadius={blastRadius}
                  plans={plans}
                  currentRole={currentRole}
                  onGeneratePlans={handleGeneratePlans}
                  onApprovePlan={handleApprovePlan}
                />
              </div>
            )}
            {dashboardTab === 'users' && (
              <SuperAdminDashboard
                persona={currentPersona}
                activeSubTab="users"
                onSelectSubTab={(tab) => setDashboardTab(tab)}
                onOpenCockpit={() => setDashboardTab('blast-cockpit')}
              />
            )}
            {dashboardTab === 'ai-chat' && (
              <SuperAdminDashboard
                persona={currentPersona}
                activeSubTab="ai-chat"
                onSelectSubTab={(tab) => setDashboardTab(tab)}
                onOpenCockpit={() => setDashboardTab('blast-cockpit')}
              />
            )}
            {dashboardTab === 'audit' && (
              <SuperAdminDashboard
                persona={currentPersona}
                activeSubTab="audit"
                onSelectSubTab={(tab) => setDashboardTab(tab)}
                onOpenCockpit={() => setDashboardTab('blast-cockpit')}
              />
            )}
          </>
        )}

        {/* =========================================================================
            ROLE 5: DEPARTMENT HEAD (Dr. K. Raman — EEE In-Charge) — 5-6 Items
            Tabs: 'overview', 'hall-status', 'dept-tickets', 'exam-protection', 'faculty-roster'
        ========================================================================= */}
        {activePersonaId === 'depthead' && (
          <DepartmentHeadDashboard
            persona={currentPersona}
            activeTab={dashboardTab}
            onSelectTab={(tab) => setDashboardTab(tab)}
          />
        )}

        {/* =========================================================================
            ROLE 6: STORES & PROCUREMENT (S. Venkatesh)
            Tabs: 'overview', 'requisitions', 'stock'
        ========================================================================= */}
        {activePersonaId === 'inventory' && (
          <InventoryDashboard persona={currentPersona} />
        )}
      </DashboardLayout>
    );
  }

  // =========================================================================
  // VIEW MODE B: PUBLIC LANDING PAGE & DISRUPTION RADAR
  // =========================================================================
  return (
    <div className="min-h-screen flex flex-col bg-grid-paper">
      {/* 1. TOP NAVBAR WITH TWO SUBDIVISION LOGIN BUTTONS */}
      <BrutalNavbar
        currentRole={currentRole}
        activePersonaId={activePersonaId}
        onOpenLogin={(sub) => {
          setLoginSubdivision(sub);
          setLoginModalOpen(true);
        }}
        onOpenDashboard={() => setViewMode('dashboard')}
        onOpenReport={() => setReportModalOpen(true)}
        onResetDemo={handleResetDemo}
        onOpenChaos={() => {
          const el = document.getElementById('incidents-grid');
          el?.scrollIntoView({ behavior: 'smooth' });
        }}
        activeCount={incidents.filter((i) => !['RESOLVED', 'CLOSED'].includes(i.status)).length}
      />

      {/* 2. HERO SECTION RECREATING REFERENCE IMAGE 3 (Cassette Tapes, Highlighter, Dual Track) */}
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
        <BlastRadiusCockpit
          incident={selectedIncident}
          blastRadius={blastRadius}
          plans={plans}
          currentRole={currentRole}
          onGeneratePlans={handleGeneratePlans}
          onApprovePlan={handleApprovePlan}
        />
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
        onSelectRole={handleSelectPersonaFromModal}
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
