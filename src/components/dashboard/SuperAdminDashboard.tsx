'use client';

import React, { useState } from 'react';
import { Shield, CheckCircle2, XCircle, AlertTriangle, MessageSquare, Terminal, Send, Users, Cpu, FileCheck, Layers, Eye } from 'lucide-react';
import { PersonaProfile } from '@/types/personas';

interface SuperAdminDashboardProps {
  persona: PersonaProfile;
  onOpenCockpit?: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ persona, onOpenCockpit }) => {
  // Complaint statistics
  const stats = {
    raised: 24,
    solved: 19,
    ongoing: 4,
    failed: 1, // Escalated
    successRate: '95.8%',
  };

  // AI Reviewer Proposals
  const [plans, setPlans] = useState([
    {
      id: 'PLAN-AEGIS-101',
      title: 'Relocate 180 Students to Library Hall (3rd Floor)',
      targetIncident: 'INC-204 (Hall B-204 Power Outage)',
      status: 'AWAITING_REVIEW',
      checks: [
        { label: 'CAPACITY', result: '180 / 200 Seats', status: 'PASS' },
        { label: 'NO_CLASH', result: 'No Overlapping Bookings', status: 'PASS' },
        { label: 'DEADLINE_MET', result: '12m Relocation < 30m Exam', status: 'PASS' },
        { label: 'STAFF_RATIO', result: '1:30 Invigilator Roster Confirmed', status: 'PASS' },
        { label: 'STOCK_AVAILABLE', result: 'MCB-63A-3P in Stores', status: 'PASS' },
      ],
      aiRationale: 'Hall B-204 loss of main breaker detected at 21:15. Deterministic engine evaluated 3 alternatives: Aud-West (failed deadline: 38m transit), Split-Room B-101+102 (failed invigilator count: needed 4, available 2), Library Hall (passed all 5 checks with score 0.94).',
      evidencePhoto: '/assets/aistudio/image_7671df28.png',
    },
  ]);

  // Reviewer Decision Feedback
  const [reviewerFeedback, setReviewerFeedback] = useState<string | null>(null);

  const handleReviewDecision = (planId: string, decision: 'ACCEPT' | 'REJECT') => {
    setPlans(
      plans.map((p) => (p.id === planId ? { ...p, status: decision === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED' } : p))
    );
    if (decision === 'ACCEPT') {
      setReviewerFeedback(
        '✓ Plan accepted and atomically executed in Postgres! Roster locked; notifications dispatched.'
      );
    } else {
      setReviewerFeedback('❌ Plan rejected. Triggered deterministic replanning engine.');
    }
    setTimeout(() => setReviewerFeedback(null), 4000);
  };

  // Registered Students & Users Directory
  const registeredUsers = [
    { name: 'Aarav Patel', roll: '22CS045', dept: 'CSE', role: 'Student', queries: 3, status: 'Verified' },
    { name: 'Dr. K. Raman', roll: 'FAC-EE-104', dept: 'EEE', role: 'Faculty HOD', queries: 5, status: 'Verified' },
    { name: 'Sneha Rao', roll: '22EE012', dept: 'EEE', role: 'Student', queries: 1, status: 'Verified' },
    { name: 'Vikram Singh', roll: '22ME098', dept: 'Mech', role: 'Student', queries: 2, status: 'Verified' },
    { name: 'Ananya Sharma', roll: '22IT044', dept: 'IT', role: 'Student', queries: 0, status: 'Verified' },
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
        aiReply = 'Telemetry Query: Hall B-204 feeder line #2 pulled 84.2A prior to trip. Normal rating is 63A. Secondary sub-station load is nominal at 42%. Blast radius: 1 scheduled exam (180 students), 1 invigilator team. Continuity relocation to Library Hall is valid and verified.';
      } else if (textToSend.includes('Chiller') || textToSend.includes('Blast Radius')) {
        aiReply = 'Simulation Analysis: If Chiller Unit 2 trips, Server C-1 inlet temperature will reach 28.5°C within 18 minutes. Secondary redundant CRAC unit 1 can absorb 65% thermal load. Recommendation: spin up auxiliary vent dampers.';
      } else if (textToSend.includes('MCB') || textToSend.includes('Stock')) {
        aiReply = 'Inventory Verification: Central Stores has 2x MCB-63A-3P units in stock. 1 unit is reserved for Work Order #WO-882 (Tech Rajesh Kumar). Reorder trigger threshold is set to 1 unit.';
      } else {
        aiReply = `Diagnostic Output: Processed query "${textToSend}". System status healthy. All 7 active zones monitored with deterministic safety rules.`;
      }

      setChatMessages((prev) => [
        ...prev,
        { sender: 'ai', text: aiReply, time: 'Just now' },
      ]);
      setIsTyping(false);
    }, 700);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner Alert Feedback */}
      {reviewerFeedback && (
        <div className="card-brutal p-3.5 bg-[#DCFCE7] border-2 border-[#18181B] text-xs font-bold text-emerald-900 flex items-center gap-2 shadow-brutal-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{reviewerFeedback}</span>
        </div>
      )}

      {/* =========================================================================
          TOP ROW: MASTER COMPLAINT STATS + SMALL TOP CORNER VISUAL WIDGET
          "Full statistics on complaints: raised, solved, ongoing, failed to solve"
      ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* KPI 1: Raised */}
        <div className="card-brutal p-4 bg-white flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-zinc-600">Total Raised</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black text-[#18181B]">{stats.raised}</span>
            <p className="text-[11px] font-bold text-zinc-500 mt-1">Campus Incidents (30d)</p>
          </div>
        </div>

        {/* KPI 2: Solved */}
        <div className="card-brutal p-4 bg-[#DCFCE7] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-zinc-700">Solved & Closed</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black text-[#18181B]">{stats.solved}</span>
            <p className="text-[11px] font-bold text-emerald-800 mt-1">79.2% Resolved on Time</p>
          </div>
        </div>

        {/* KPI 3: Ongoing */}
        <div className="card-brutal p-4 bg-[#FEF9C3] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-zinc-700">Ongoing Active</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black text-[#18181B]">{stats.ongoing}</span>
            <p className="text-[11px] font-bold text-amber-900 mt-1">Under Active Repair</p>
          </div>
        </div>

        {/* KPI 4: Failed / Escalated + Compact Corner Metric Widget */}
        <div className="card-brutal p-4 bg-[#FCE7F3] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-zinc-700">Escalated</span>
            <span className="badge-sticker bg-white text-[9px] py-0">{stats.successRate} OK</span>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black text-[#18181B]">{stats.failed}</span>
            <p className="text-[11px] font-bold text-pink-900 mt-1">Requires Senior Signoff</p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: AI REVIEWER PERMISSIONS (Accept / Reject with AI Reasoning & Evidence)
      ========================================================================= */}
      <div className="card-brutal p-5 bg-white space-y-4">
        <div className="flex items-center justify-between pb-3 border-b-2 border-zinc-100">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#FDA4AF] border-2 border-[#18181B] flex items-center justify-center font-black text-sm shadow-brutal-sm">
              🛡️
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-[#18181B] uppercase">
                  AI Recovery Plan Reviewer Gate
                </h3>
                <span className="badge-sticker bg-[#86EFAC] text-[9px]">ACTIVE PROPOSAL</span>
              </div>
              <p className="text-xs text-zinc-500">
                Super Admin exclusive: inspect deterministic constraint proofs and execute or reject plans
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-zinc-600 bg-zinc-100 px-2 py-1 rounded border border-black/20">
            Segregation of Duties (SoD) Active
          </span>
        </div>

        {plans.map((plan) => (
          <div key={plan.id} className="p-4 rounded-xl border-2 border-[#18181B] bg-zinc-50 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="badge-sticker bg-[#FEF9C3] text-[9px]">{plan.id}</span>
                <h4 className="text-sm font-black text-[#18181B] mt-1">{plan.title}</h4>
                <p className="text-xs text-zinc-600 font-mono">Target: {plan.targetIncident}</p>
              </div>

              {/* Action Buttons: Accept or Reject */}
              <div className="flex items-center gap-2 shrink-0">
                {plan.status === 'AWAITING_REVIEW' ? (
                  <>
                    <button
                      onClick={() => handleReviewDecision(plan.id, 'ACCEPT')}
                      className="btn-brutal-green px-4 py-2 text-xs font-black flex items-center gap-1.5 shadow-brutal-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      <span>Accept AI Plan</span>
                    </button>
                    <button
                      onClick={() => handleReviewDecision(plan.id, 'REJECT')}
                      className="btn-brutal-pink px-4 py-2 text-xs font-black flex items-center gap-1.5 shadow-brutal-sm"
                    >
                      <XCircle className="w-4 h-4 stroke-[2.5]" />
                      <span>Reject & Replan</span>
                    </button>
                  </>
                ) : (
                  <span className={`badge-sticker text-xs py-1 px-3 ${
                    plan.status === 'ACCEPTED' ? 'bg-[#86EFAC] text-black' : 'bg-red-200 text-red-900'
                  }`}>
                    {plan.status}
                  </span>
                )}
              </div>
            </div>

            {/* 5 Deterministic Check Badges */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-200">
              {plan.checks.map((chk, idx) => (
                <div key={idx} className="bg-white border-2 border-[#18181B] rounded-lg px-2.5 py-1 text-[10px] font-mono flex items-center gap-1.5 shadow-xs">
                  <span className="text-emerald-600 font-black">✓</span>
                  <span className="font-black text-[#18181B]">{chk.label}:</span>
                  <span className="text-zinc-600">{chk.result}</span>
                </div>
              ))}
            </div>

            {/* AI Decision Reasoning & Evidence Photo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="md:col-span-2 p-3 bg-white border border-zinc-200 rounded-lg text-xs">
                <span className="text-[10px] font-mono font-black uppercase text-zinc-500 block mb-1">
                  How AI made this decision:
                </span>
                <p className="text-zinc-700 leading-relaxed font-medium">
                  {plan.aiRationale}
                </p>
              </div>

              {/* Photo Evidence Thumbnail that AI used */}
              <div className="p-2.5 bg-white border border-zinc-200 rounded-lg flex items-center gap-2.5">
                <div className="w-16 h-14 bg-zinc-800 rounded border border-black flex items-center justify-center text-white text-[9px] font-mono text-center p-1 leading-tight shrink-0">
                  ⚡ DB-2B 63A FAULT
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-[#18181B] block">Evidence Analyzed</span>
                  <span className="text-[9px] text-zinc-500 font-mono block">hall_b204_panel.jpg</span>
                  <span className="text-[9px] text-emerald-700 font-bold font-mono">Thermal Signature Verified</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* =========================================================================
          SECTION 2: REGISTERED STUDENTS & REQUESTERS DIRECTORY + TECHNICAL AI CHAT
      ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: REGISTERED STUDENTS DIRECTORY (Critical User Requirement) */}
        <div className="card-brutal p-5 bg-white">
          <div className="flex items-center justify-between pb-3 border-b-2 border-zinc-100 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">👥</span>
              <h3 className="font-black text-sm text-[#18181B] uppercase">
                Registered Students & Faculty
              </h3>
            </div>
            <span className="badge-sticker bg-zinc-100 text-[10px]">{registeredUsers.length} ACTIVE</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-2 border-[#18181B] bg-zinc-50 text-[10px] font-mono uppercase text-zinc-500">
                  <th className="py-2 px-2.5">User</th>
                  <th className="py-2 px-2.5">Identifier</th>
                  <th className="py-2 px-2.5">Role</th>
                  <th className="py-2 px-2.5">Queries</th>
                  <th className="py-2 px-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {registeredUsers.map((u, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                    <td className="py-2.5 px-2.5 font-bold text-[#18181B]">{u.name}</td>
                    <td className="py-2.5 px-2.5 font-mono text-zinc-600">{u.roll}</td>
                    <td className="py-2.5 px-2.5">
                      <span className="badge-sticker bg-zinc-100 text-[9px] py-0">{u.role}</span>
                    </td>
                    <td className="py-2.5 px-2.5 font-mono font-bold text-zinc-700">{u.queries}</td>
                    <td className="py-2.5 px-2.5">
                      <span className="text-[10px] font-mono text-emerald-700 font-bold">✓ {u.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: TECHNICAL AI CHAT (Critical User Requirement) */}
        <div className="card-brutal p-5 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b-2 border-zinc-100 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">🤖</span>
                <h3 className="font-black text-sm text-[#18181B] uppercase">
                  Technical AI Chat Console
                </h3>
              </div>
              <span className="badge-sticker bg-[#DCFCE7] text-[10px]">GEMINI 3.8 FLASH</span>
            </div>

            {/* Quick Prompt Chips */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              <button
                onClick={() => handleSendChat('Query Grid Load: Hall B-204')}
                className="px-2 py-0.5 rounded border border-zinc-300 hover:border-black text-[10px] font-mono bg-zinc-50 hover:bg-zinc-100 transition-colors"
              >
                ⚡ Query Grid Load: Hall B-204
              </button>
              <button
                onClick={() => handleSendChat('Simulate Chiller 2 Trip in Data Center')}
                className="px-2 py-0.5 rounded border border-zinc-300 hover:border-black text-[10px] font-mono bg-zinc-50 hover:bg-zinc-100 transition-colors"
              >
                ❄️ Chiller 2 Blast Radius
              </button>
              <button
                onClick={() => handleSendChat('Check MCB Breaker Spare Stock')}
                className="px-2 py-0.5 rounded border border-zinc-300 hover:border-black text-[10px] font-mono bg-zinc-50 hover:bg-zinc-100 transition-colors"
              >
                📦 Check Spare MCBs
              </button>
            </div>

            {/* Chat Stream Window */}
            <div className="h-44 overflow-y-auto space-y-2.5 p-3 bg-[#FAF9F5] border-2 border-[#18181B] rounded-xl font-mono text-xs">
              {chatMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-lg border ${
                    m.sender === 'user'
                      ? 'bg-[#FEF9C3] border-amber-300 ml-6 text-zinc-900'
                      : 'bg-white border-zinc-300 mr-4 text-zinc-800'
                  }`}
                >
                  <div className="flex justify-between items-center text-[9px] font-bold text-zinc-500 mb-0.5">
                    <span>{m.sender === 'user' ? 'CHIEF CONTROLLER' : 'AEGIS AI KERNEL'}</span>
                    <span>{m.time}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{m.text}</p>
                </div>
              ))}
              {isTyping && (
                <div className="text-[10px] text-zinc-400 font-mono animate-pulse">
                  AI evaluating campus telemetry...
                </div>
              )}
            </div>
          </div>

          {/* Chat Input Field */}
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              placeholder="Ask technical campus questions (e.g., generator reserve, feeder load)..."
              className="flex-1 px-3 py-1.5 text-xs input-brutal font-mono"
            />
            <button
              onClick={() => handleSendChat()}
              className="btn-brutal-green px-4 py-1.5 text-xs font-black flex items-center justify-center shadow-brutal-sm"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
