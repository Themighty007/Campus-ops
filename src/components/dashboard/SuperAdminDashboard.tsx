'use client';

import React, { useState } from 'react';
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Terminal,
  Send,
  Users,
  Cpu,
  FileCheck,
  Layers,
  Eye,
  Camera,
  Check,
  X,
  Lock,
} from 'lucide-react';
import { PersonaProfile } from '@/types/personas';

interface SuperAdminDashboardProps {
  persona: PersonaProfile;
  onOpenCockpit?: () => void;
  activeSubTab?: string;
  onSelectSubTab?: (tab: string) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  persona,
  onOpenCockpit,
  activeSubTab = 'overview',
  onSelectSubTab,
}) => {
  // Complaint statistics
  const stats = {
    raised: 24,
    solved: 19,
    ongoing: 4,
    failed: 1, // Escalated
    successRate: '95.8%',
  };

  // AI Reviewer Proposals with Student-Uploaded Photo
  const [plans, setPlans] = useState([
    {
      id: 'PLAN-AEGIS-101',
      title: 'Relocate 180 Students to Library Hall & Dispatch Rajesh Kumar',
      targetIncident: 'INC-01000 (Hall B-204 Power Outage)',
      reporter: 'Aarav Patel (Roll #22CS045)',
      status: 'AWAITING_REVIEW',
      checks: [
        { label: 'CAPACITY', result: '180 / 200 Seats', status: 'PASS' },
        { label: 'NO_CLASH', result: 'No Overlapping Bookings', status: 'PASS' },
        { label: 'DEADLINE_MET', result: '12m Relocation < 30m Exam', status: 'PASS' },
        { label: 'STAFF_RATIO', result: '1:30 Invigilator Roster Confirmed', status: 'PASS' },
        { label: 'STOCK_AVAILABLE', result: 'MCB-63A-3P in Stores', status: 'PASS' },
      ],
      aiRationale:
        'Hall B-204 main breaker tripped at 21:00 prior to EE301 Midterm Exam. Deterministic engine selected Library Hall A (score 0.96) as optimal relocation, and dispatched lead technician Rajesh Kumar with 1x MCB-63A-3P breaker replacement.',
      evidencePhoto: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop',
    },
  ]);

  // Reviewer Decision Feedback
  const [reviewerFeedback, setReviewerFeedback] = useState<string | null>(null);

  const handleReviewDecision = async (planId: string, decision: 'ACCEPT' | 'REJECT') => {
    setPlans(
      plans.map((p) =>
        p.id === planId ? { ...p, status: decision === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED' } : p
      )
    );

    // Call Redis sync to dispatch to technician and notify student
    try {
      await fetch('/api/redis/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          box: 'technician',
          type: 'WORK_ORDER_DISPATCHED',
          payload: {
            workOrderId: 'WO-8821',
            incidentId: 'INC-01000',
            title: 'Replace Tripped 63A MCB Breaker (Panel E-4)',
            roomCode: 'Hall B-204',
            priority: 'P1_CRITICAL',
            allocatedPart: 'MCB-63A-3P (3-Pole 10kA)',
            photoUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop',
            stage: 'ASSIGNED',
            assignedTo: 'Rajesh Kumar',
          },
        }),
      });

      await fetch('/api/redis/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          box: 'student',
          type: 'SUPERADMIN_APPROVED',
          payload: {
            ticketId: 'INC-01000',
            status: 'IN_PROGRESS',
            message: 'Super Admin approved recovery plan. Lead Tech Rajesh Kumar dispatched.',
          },
        }),
      });
    } catch {
      // non-blocking
    }

    if (decision === 'ACCEPT') {
      setReviewerFeedback(
        '✓ Approved! Work Order dispatched to Field Specialist Rajesh Kumar with student photo. Student Aarav Patel notified.'
      );
    } else {
      setReviewerFeedback('❌ Plan rejected. Triggered deterministic replanning engine.');
    }
    setTimeout(() => setReviewerFeedback(null), 5000);
  };

  // Registered Students & Users Directory
  const registeredUsers = [
    { name: 'Aarav Patel', roll: '22CS045', dept: 'CSE', role: 'Student', queries: 3, status: 'Verified' },
    { name: 'Prof. Ananya Sen', roll: 'FAC-CS-208', dept: 'CSE', role: 'Faculty Proctor', queries: 2, status: 'Verified' },
    { name: 'Dr. K. Raman', roll: 'HOD-EE-101', dept: 'EEE', role: 'Department Head', queries: 5, status: 'Verified' },
    { name: 'Rajesh Kumar', roll: 'TECH-808', dept: 'Facilities', role: 'Field Specialist', queries: 12, status: 'Verified' },
    { name: 'Sneha Rao', roll: '22EE012', dept: 'EEE', role: 'Student', queries: 1, status: 'Verified' },
    { name: 'Vikram Singh', roll: '22ME098', dept: 'Mech', role: 'Student', queries: 2, status: 'Verified' },
    { name: 'S. Venkatesh', roll: 'INV-042', dept: 'Stores', role: 'Procurement Lead', queries: 8, status: 'Verified' },
  ];

  // Technical AI Chat Console State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: 'Aegis Campus Recovery Kernel online. Gemini 3.8 Flash operational. Ready for technical queries regarding campus electrical load, blast radius calculations, or resource reservations.',
      time: '21:40',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSendChat = (presetText?: string) => {
    const textToSend = presetText || chatInput;
    if (!textToSend.trim()) return;

    const userMsg = { sender: 'user' as const, text: textToSend, time: 'Just now' };
    setChatMessages((prev) => [...prev, userMsg]);
    if (!presetText) setChatInput('');
    setIsTyping(true);

    setTimeout(() => {
      let aiReply = '';
      if (textToSend.includes('Hall B-204') || textToSend.includes('Grid Load')) {
        aiReply =
          'Telemetry Query: Hall B-204 feeder line #2 pulled 84.2A prior to trip. Normal rating is 63A. Secondary sub-station load is nominal at 42%. Blast radius: 1 scheduled exam (180 students), 1 invigilator team. Continuity relocation to Library Hall is valid and verified.';
      } else if (textToSend.includes('Chiller') || textToSend.includes('Blast Radius')) {
        aiReply =
          'Simulation Analysis: If Chiller Unit 2 trips, Server C-1 inlet temperature will reach 28.5°C within 18 minutes. Secondary redundant CRAC unit 1 can absorb 65% thermal load. Recommendation: spin up auxiliary vent dampers.';
      } else if (textToSend.includes('MCB') || textToSend.includes('Stock')) {
        aiReply =
          'Inventory Verification: Central Stores has 2x MCB-63A-3P units in stock. 1 unit is reserved for Work Order #WO-8821 (Tech Rajesh Kumar). Reorder trigger threshold is set to 1 unit.';
      } else {
        aiReply = `Diagnostic Output: Processed query "${textToSend}". System status healthy. All 7 active zones monitored with deterministic safety rules.`;
      }

      setChatMessages((prev) => [...prev, { sender: 'ai', text: aiReply, time: 'Just now' }]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner Alert Feedback */}
      {reviewerFeedback && (
        <div className="card-brutal p-3.5 bg-[#DCFCE7] border-2 border-[#18181B] text-xs font-bold text-emerald-900 flex items-center gap-2 shadow-brutal-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-800" />
          <span>{reviewerFeedback}</span>
        </div>
      )}

      {/* =========================================================================
          VIEW 1: OVERVIEW TAB (Default CRM KPI tiles + Complaint stats)
      ========================================================================= */}
      {(activeSubTab === 'overview' || !activeSubTab) && (
        <div className="space-y-6">
          {/* TOP ROW: MASTER COMPLAINT STATS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card-brutal p-4 bg-[#FEF9C3] flex flex-col justify-between">
              <span className="text-[11px] font-black uppercase text-zinc-600">Total Raised</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-black text-[#18181B]">{stats.raised}</span>
                <span className="text-[10px] font-mono text-zinc-500 font-bold">100% Ingest</span>
              </div>
            </div>

            <div className="card-brutal p-4 bg-[#DCFCE7] flex flex-col justify-between">
              <span className="text-[11px] font-black uppercase text-zinc-600">Solved & Verified</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-black text-emerald-800">{stats.solved}</span>
                <span className="text-[10px] font-mono text-emerald-700 font-bold">{stats.successRate}</span>
              </div>
            </div>

            <div className="card-brutal p-4 bg-[#E0F2FE] flex flex-col justify-between">
              <span className="text-[11px] font-black uppercase text-zinc-600">Ongoing Repairs</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-black text-sky-800">{stats.ongoing}</span>
                <span className="text-[10px] font-mono text-sky-700 font-bold">SLA Tracked</span>
              </div>
            </div>

            <div className="card-brutal p-4 bg-[#FFE4E6] flex flex-col justify-between">
              <span className="text-[11px] font-black uppercase text-zinc-600">Escalated / Blocked</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-3xl font-black text-rose-800">{stats.failed}</span>
                <span className="badge-sticker bg-white text-[9px] text-rose-800 font-bold">AI ASSIST</span>
              </div>
            </div>
          </div>

          {/* ACTIVE DISRUPTION HIGHLIGHT */}
          <div className="card-brutal p-5 bg-white border-2 border-[#18181B] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="badge-sticker bg-red-400 text-black text-[10px]">P1 CRITICAL</span>
                <span className="text-xs font-mono font-bold text-zinc-500">INC-01000 · Exam Hall B-204</span>
              </div>
              <h3 className="text-base font-black text-black">
                Main Circuit Breaker Tripped 30m Before EE301 Midterm Exam
              </h3>
              <p className="text-xs text-zinc-600 font-medium">
                Reported by Aarav Patel with photo evidence. AI proposes Plan Alpha: Relocate to Library Hall A + Dispatch Rajesh Kumar.
              </p>
            </div>
            {onSelectSubTab && (
              <button
                onClick={() => onSelectSubTab('ai-reviewer')}
                className="px-4 py-2 btn-brutal-yellow text-xs font-black flex items-center gap-1.5 shrink-0"
              >
                <span>Open AI Reviewer (HITL)</span>
                <span>→</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: AI REVIEWER (HUMAN-IN-THE-LOOP) TAB
          Shows incoming student query, uploaded photo, AI reasoning, and [YES / NO] buttons!
      ========================================================================= */}
      {activeSubTab === 'ai-reviewer' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between pb-3 border-b-2 border-zinc-200">
            <div>
              <span className="badge-sticker bg-[#FDE047] text-[#18181B] mb-1">
                HUMAN-IN-THE-LOOP GOVERNANCE
              </span>
              <h2 className="text-lg font-black text-[#18181B] uppercase tracking-tight">
                AI Incident Reviewer & Authorization Gate
              </h2>
              <p className="text-xs text-zinc-600 font-medium">
                Verify student-submitted photos, inspect deterministic constraints, and approve or reject recovery plans.
              </p>
            </div>
            <span className="badge-sticker bg-red-400 text-black font-bold">1 PENDING REVIEW</span>
          </div>

          {plans.map((plan) => (
            <div key={plan.id} className="card-brutal p-6 bg-white border-3 border-black space-y-5 shadow-brutal">
              {/* Proposal Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b-2 border-zinc-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="badge-sticker bg-purple-200 text-purple-900 text-[10px]">
                      {plan.id}
                    </span>
                    <span className="text-xs font-mono text-zinc-500 font-bold">
                      Target: {plan.targetIncident}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-[#18181B] mt-1">{plan.title}</h3>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">
                    Filed by: <strong className="text-black">{plan.reporter}</strong>
                  </p>
                </div>

                {/* Status Badge */}
                <span
                  className={`badge-sticker self-start sm:self-center font-bold text-xs ${
                    plan.status === 'ACCEPTED'
                      ? 'bg-[#86EFAC] text-black'
                      : plan.status === 'REJECTED'
                      ? 'bg-rose-200 text-rose-900'
                      : 'bg-[#FEF9C3] text-black'
                  }`}
                >
                  {plan.status === 'ACCEPTED'
                    ? '✓ APPROVED & DISPATCHED'
                    : plan.status === 'REJECTED'
                    ? '❌ REJECTED'
                    : '⏳ AWAITING SUPER ADMIN DECISION'}
                </span>
              </div>

              {/* GRID: STUDENT UPLOADED PHOTO + DETERMINISTIC CHECKS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* LEFT: STUDENT UPLOADED PHOTO EVIDENCE */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-zinc-700 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-zinc-600" />
                      Student-Submitted Photo Evidence
                    </span>
                    <span className="text-[10px] font-mono bg-zinc-100 px-2 py-0.5 rounded border border-black font-bold">
                      VERIFIED
                    </span>
                  </div>

                  <div className="relative border-2 border-black rounded-xl overflow-hidden bg-black group h-52 flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={plan.evidencePhoto}
                      alt="Student submitted evidence"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-xs text-white p-2 rounded-lg border border-white/20 text-[11px] font-mono flex items-center justify-between">
                      <span>Hall B-204 Panel E-4 (Breaker Tripped)</span>
                      <span className="text-emerald-400 font-bold">Zoom 🔍</span>
                    </div>
                  </div>
                </div>

                {/* RIGHT: 5 MATHEMATICAL CONSTRAINT CHECKS */}
                <div className="space-y-2">
                  <span className="text-xs font-black uppercase text-zinc-700 block">
                    Deterministic Constraint Solver Proofs
                  </span>

                  <div className="space-y-1.5">
                    {plan.checks.map((chk, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-lg border-2 border-black bg-zinc-50 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span className="font-mono font-bold text-zinc-800">{chk.label}</span>
                        </div>
                        <span className="font-mono font-black text-black">{chk.result}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI RATIONALE EXPLANATION */}
              <div className="p-3.5 rounded-xl bg-yellow-50/70 border-2 border-amber-300 text-xs space-y-1">
                <span className="font-black text-amber-900 uppercase block text-[10px]">
                  AI Reasoning & Triage Matrix:
                </span>
                <p className="text-zinc-700 leading-relaxed font-medium">{plan.aiRationale}</p>
              </div>

              {/* HUMAN-IN-THE-LOOP YES / NO DECISION PROMPT */}
              {plan.status === 'AWAITING_REVIEW' && (
                <div className="pt-3 border-t-2 border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-zinc-600 font-medium">
                    Do you authorize immediate execution of Plan Alpha and dispatch Rajesh Kumar?
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* NO / REJECT BUTTON */}
                    <button
                      onClick={() => handleReviewDecision(plan.id, 'REJECT')}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border-2 border-black bg-rose-100 hover:bg-rose-200 text-rose-900 font-black text-xs flex items-center justify-center gap-2 shadow-brutal-sm"
                    >
                      <X className="w-4 h-4 stroke-[3]" />
                      <span>[ NO / Reject ]</span>
                    </button>

                    {/* YES / APPROVE BUTTON */}
                    <button
                      onClick={() => handleReviewDecision(plan.id, 'ACCEPT')}
                      className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border-2 border-black bg-[#86EFAC] hover:bg-emerald-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-brutal"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>[ YES / Approve & Dispatch ]</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* =========================================================================
          VIEW 3: REGISTERED USERS & ACCESS CONTROL TAB
      ========================================================================= */}
      {activeSubTab === 'users' && (
        <div className="card-brutal p-6 bg-white space-y-4">
          <div className="flex items-center justify-between pb-3 border-b-2 border-zinc-100">
            <div>
              <h2 className="text-base font-black uppercase text-[#18181B]">
                Registered Students, Faculty & Personnel Directory
              </h2>
              <p className="text-xs text-zinc-600 font-medium">
                Verified identities authorized across the 5 campus operational portals.
              </p>
            </div>
            <span className="badge-sticker bg-zinc-100 text-[10px]">{registeredUsers.length} VERIFIED</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-2 border-[#18181B] bg-zinc-50 text-[10px] font-mono uppercase text-zinc-500">
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Identifier</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Queries</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {registeredUsers.map((u, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-[#18181B]">{u.name}</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-600">{u.roll}</td>
                    <td className="py-2.5 px-3">
                      <span className="badge-sticker bg-zinc-100 text-[9px] py-0">{u.role}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-zinc-700">{u.queries}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] font-mono text-emerald-700 font-bold">✓ {u.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 4: TECHNICAL AI CHAT TAB (GEMINI 3.8 FLASH)
      ========================================================================= */}
      {activeSubTab === 'ai-chat' && (
        <div className="card-brutal p-6 bg-white space-y-4">
          <div className="flex items-center justify-between pb-3 border-b-2 border-zinc-100">
            <div>
              <h2 className="text-base font-black uppercase text-[#18181B]">
                Gemini 3.8 Flash Technical AI Copilot
              </h2>
              <p className="text-xs text-zinc-600 font-medium">
                Real-time campus telemetry analysis, chiller simulation, and inventory availability queries.
              </p>
            </div>
            <span className="badge-sticker bg-[#DCFCE7] text-emerald-900 text-[10px]">GEMINI 3.8 FLASH</span>
          </div>

          {/* Quick Prompt Chips */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => handleSendChat('Query Grid Load: Hall B-204')}
              className="px-2.5 py-1 rounded-lg border border-black text-xs font-mono bg-zinc-50 hover:bg-zinc-100 shadow-brutal-sm"
            >
              ⚡ Query Grid Load: Hall B-204
            </button>
            <button
              onClick={() => handleSendChat('Simulate Chiller 2 Trip in Data Center')}
              className="px-2.5 py-1 rounded-lg border border-black text-xs font-mono bg-zinc-50 hover:bg-zinc-100 shadow-brutal-sm"
            >
              ❄️ Chiller 2 Blast Radius
            </button>
            <button
              onClick={() => handleSendChat('Check MCB Breaker Spare Stock')}
              className="px-2.5 py-1 rounded-lg border border-black text-xs font-mono bg-zinc-50 hover:bg-zinc-100 shadow-brutal-sm"
            >
              📦 Check Spare MCBs
            </button>
          </div>

          {/* Chat Stream Window */}
          <div className="h-64 overflow-y-auto space-y-2.5 p-4 bg-[#FAF9F5] border-2 border-[#18181B] rounded-xl font-mono text-xs">
            {chatMessages.map((m, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border-2 border-black ${
                  m.sender === 'user'
                    ? 'bg-[#FEF9C3] ml-12 text-zinc-900 shadow-brutal-sm'
                    : 'bg-white mr-12 text-zinc-800 shadow-brutal-sm'
                }`}
              >
                <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 mb-1">
                  <span>{m.sender === 'user' ? 'CHIEF CONTROLLER' : 'AEGIS AI KERNEL'}</span>
                  <span>{m.time}</span>
                </div>
                <p className="text-xs leading-relaxed">{m.text}</p>
              </div>
            ))}
            {isTyping && (
              <div className="text-xs text-zinc-500 font-mono animate-pulse">
                AI evaluating telemetry...
              </div>
            )}
          </div>

          {/* Input Box */}
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              placeholder="Ask technical campus questions (e.g. generator reserve, breaker impedance)..."
              className="flex-1 px-3 py-2 text-xs input-brutal font-mono"
            />
            <button
              onClick={() => handleSendChat()}
              className="btn-brutal-green px-5 py-2 text-xs font-black flex items-center justify-center shadow-brutal-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 5: IMMUTABLE AUDIT TRAIL TAB
      ========================================================================= */}
      {activeSubTab === 'audit' && (
        <div className="card-brutal p-6 bg-white space-y-4">
          <div className="flex items-center justify-between pb-3 border-b-2 border-zinc-100">
            <div>
              <h2 className="text-base font-black uppercase text-[#18181B]">
                Immutable Governance & Segregation of Duties (SoD) Audit
              </h2>
              <p className="text-xs text-zinc-600 font-medium">
                Cryptographically hashed audit log verifying actor signatures and zero unauthorized overrides.
              </p>
            </div>
            <span className="badge-sticker bg-zinc-800 text-white font-mono text-[10px]">SHA-256 VERIFIED</span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {[
              { time: '21:15:32', actor: 'Aarav Patel (Student)', action: 'REPORT_SUBMITTED', hash: 'e3b0c442...a98b', detail: 'Photo attached: hall_b204_panel.jpg' },
              { time: '21:15:35', actor: 'Aegis AI Engine', action: 'DETERMINISTIC_TRIAGE', hash: 'a1b2c3d4...5e6f', detail: 'Selected Plan Alpha (Library Hall A)' },
              { time: '21:16:01', actor: 'Chief Controller (Admin)', action: 'APPROVAL_RECORDED', hash: '8f7d9a10...bc23', detail: 'Human-in-the-Loop decision: YES' },
              { time: '21:16:04', actor: 'System Dispatcher', action: 'WORK_ORDER_ISSUED', hash: '09a8b7c6...d5e4', detail: 'Assigned to Tech Rajesh Kumar' },
            ].map((entry, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-black bg-zinc-50 flex items-center justify-between">
                <div>
                  <span className="font-bold text-black">{entry.action}</span>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{entry.detail} · By {entry.actor}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 block">{entry.time}</span>
                  <span className="text-[9px] text-emerald-700 font-bold">{entry.hash}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
