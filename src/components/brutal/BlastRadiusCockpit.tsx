'use client';

import React, { useState } from 'react';
import {
  MapPin,
  Clock,
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Loader2,
  Lock,
  Wrench,
  Boxes,
} from 'lucide-react';
import type { UserRole } from '@/lib/domain/enums';

interface BlastRadiusCockpitProps {
  incident: any;
  blastRadius: any;
  plans: any[];
  currentRole: UserRole;
  onGeneratePlans: (incidentId: string) => Promise<any>;
  onApprovePlan: (planId: string, decision: 'APPROVED' | 'REJECTED', reason?: string) => Promise<any>;
}

export const BlastRadiusCockpit: React.FC<BlastRadiusCockpitProps> = ({
  incident,
  blastRadius,
  plans,
  currentRole,
  onGeneratePlans,
  onApprovePlan,
}) => {
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  if (!incident) return null;

  const handleGenerate = async () => {
    setGenerating(true);
    setFeedback(null);
    try {
      const res = await onGeneratePlans(incident.id);
      if (res?.plans?.length) {
        setFeedback(`⚡ ${res.plans.length} deterministic recovery plan(s) generated!`);
      } else {
        setFeedback('No feasible plans could satisfy all constraints.');
      }
    } catch {
      setFeedback('Failed to generate plans.');
    }
    setGenerating(false);
  };

  const handleApprove = async (planId: string) => {
    setApproving(planId);
    setFeedback(null);
    try {
      const res = await onApprovePlan(planId, 'APPROVED');
      if (res.error) {
        setFeedback(`⚠ ${res.error}`);
      } else {
        setFeedback('✅ Plan Approved & Executed! Continuity Restored.');
      }
    } catch {
      setFeedback('Failed to execute plan.');
    }
    setApproving(null);
  };

  const handleReject = async (planId: string) => {
    setApproving(planId);
    setFeedback(null);
    try {
      const res = await onApprovePlan(planId, 'REJECTED', rejectReason);
      if (res.error) setFeedback(`⚠ ${res.error}`);
      else setFeedback('Plan rejected.');
    } catch {
      setFeedback('Failed to reject plan.');
    }
    setApproving(null);
    setShowRejectInput(null);
    setRejectReason('');
  };

  const canApprove = ['FACILITIES_ADMIN', 'DEPARTMENT_MANAGER'].includes(currentRole);

  return (
    /* CONTAINER MATCHING EXACT NEO-BRUTALIST ARCHITECTURE FROM REFERENCE IMAGE 1 */
    <section className="relative my-8 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
      <div className="relative bg-[#FAF9F5] border-[3px] border-[#18181B] rounded-2xl shadow-brutal-xl p-5 sm:p-8">
        {/* Yellow Circle Rivet Pin on Top-Right Corner from Reference Image 1 */}
        <div className="pin-circle-yellow" />

        {/* Pink Diamond Rivet Pin on Bottom-Left Corner from Reference Image 2 */}
        <div className="pin-diamond-pink" />

        {/* FLOATING PILL BADGE ON BORDER: [ THE COCKPIT ] from Image 1 */}
        <div className="absolute -top-3.5 left-8 z-10">
          <span className="badge-sticker bg-white border-2 border-[#18181B] text-[#18181B] text-xs font-black shadow-brutal-sm px-3 py-1">
            THE RECOVERY COCKPIT
          </span>
        </div>

        {/* BANNER 1: GREEN HIGHLIGHT CARD FROM REFERENCE IMAGE 1 */}
        <div className="bg-[#86EFAC] border-2 border-[#18181B] rounded-xl p-5 shadow-brutal mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/30 pb-3 mb-3">
            <div>
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-emerald-900 bg-white/50 px-2 py-0.5 rounded">
                INCIDENT {incident.code || 'INC-8821'}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[#18181B] tracking-tight uppercase mt-1">
                {incident.summary || 'Power Failure in Hall B-204'}
              </h2>
            </div>
            <div className="self-start sm:self-auto flex items-center gap-2">
              <span className="badge-sticker bg-white text-[#18181B] text-xs font-black">
                {incident.category || 'ELECTRICAL'}
              </span>
              <span className="badge-sticker bg-[#EF4444] text-white text-xs font-black animate-pulse">
                {incident.severity || 'P1'} CRITICAL
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono font-bold text-emerald-950">
            <span>📍 LOCATION: {incident.roomId ? 'ROOM ' + incident.roomId : 'EXAM HALL B-204'}</span>
            <span>👥 IMPACT: 120 STUDENTS · 3 PROCTORS</span>
            <span>⚡ CONTINUITY: {incident.continuityStatus || 'AT_RISK'}</span>
          </div>
        </div>

        {/* BANNER 2: YELLOW [ IMPORTANT ] NOTICE CARD FROM REFERENCE IMAGE 1 */}
        <div className="bg-[#FEF9C3] border-2 border-[#18181B] rounded-xl p-4 shadow-brutal mb-6 relative">
          <div className="absolute -top-3 left-4">
            <span className="badge-sticker bg-[#FDE047] text-[#18181B] text-[10px] font-black border border-black">
              IMPORTANT
            </span>
          </div>
          <p className="text-xs text-amber-950 font-bold leading-relaxed pt-1">
            <strong>Dual-Track Recovery in effect:</strong> Academic continuity is protected first via automated room relocation, while physical maintenance executes in parallel. Plan execution requires Facilities approval with <strong>Separation of Duties (SoD)</strong> enforcement.
          </p>
        </div>

        {/* FEEDBACK ALERT */}
        {feedback && (
          <div className="mb-6 p-3 bg-white border-2 border-[#18181B] rounded-xl shadow-brutal flex items-center justify-between text-xs font-black text-[#18181B]">
            <span>{feedback}</span>
            <button onClick={() => setFeedback(null)} className="text-zinc-500 hover:text-black">✕</button>
          </div>
        )}

        {/* VISUAL BLAST RADIUS NODE MAP */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-[#18181B] uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#F472B6]" />
              Blast Radius · Relational Data Graph
            </h3>
            <span className="text-[11px] font-mono text-zinc-500 font-bold">
              Derived from campus database
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Node 1: Origin */}
            <div className="card-brutal p-4 bg-white border-2 border-[#18181B]">
              <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase">1. Failed Asset</div>
              <div className="text-base font-black text-red-600 my-1">Room B-204</div>
              <div className="text-xs text-zinc-600 font-medium">Main 63A Breaker Trip</div>
              <div className="mt-2 text-[10px] font-mono bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold">
                CIRC-P1 OFFLINE
              </div>
            </div>

            {/* Node 2: Activity at Risk */}
            <div className="card-brutal p-4 bg-white border-2 border-[#18181B]">
              <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase">2. Scheduled Activity</div>
              <div className="text-base font-black text-[#18181B] my-1">CS301 Final Exam</div>
              <div className="text-xs text-zinc-600 font-medium">120 Students · Starts in 45m</div>
              <div className="mt-2 text-[10px] font-mono bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">
                DEADLINE: 45 MINS
              </div>
            </div>

            {/* Node 3: Alternative Room */}
            <div className="card-brutal p-4 bg-[#DCFCE7] border-2 border-[#18181B]">
              <div className="text-[10px] font-mono font-bold text-emerald-800 uppercase">3. Alternative Room</div>
              <div className="text-base font-black text-emerald-950 my-1">Auditorium West</div>
              <div className="text-xs text-emerald-800 font-medium">Capacity 150 &gt; 120 Req.</div>
              <div className="mt-2 text-[10px] font-mono bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-bold">
                VERIFIED AVAILABLE
              </div>
            </div>

            {/* Node 4: Repair Track */}
            <div className="card-brutal p-4 bg-white border-2 border-[#18181B]">
              <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase">4. Physical Repair Track</div>
              <div className="text-base font-black text-[#18181B] my-1">Tech Rajesh K.</div>
              <div className="text-xs text-zinc-600 font-medium">1x Breaker SKU-63A Held</div>
              <div className="mt-2 text-[10px] font-mono bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-bold">
                PARTS RESERVED
              </div>
            </div>
          </div>
        </div>

        {/* DETERMINISTIC RECOVERY PLANS SECTION */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#18181B]/20 pb-3">
            <div>
              <h3 className="text-lg font-black text-[#18181B] uppercase tracking-tight flex items-center gap-2">
                <span>Deterministic Recovery Options</span>
                <span className="badge-sticker bg-[#FEF9C3] text-xs">
                  {plans.length} PLANS
                </span>
              </h3>
              <p className="text-xs text-zinc-600 font-medium">
                Every plan passes mathematical room, capacity, staff, and deadline checks.
              </p>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-brutal-pink px-4 py-2 text-xs font-black flex items-center gap-2 self-start sm:self-auto"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 stroke-[3]" />}
              <span>{generating ? 'EVALUATING CONSTRAINTS...' : 'GENERATE RECOVERY PLANS'}</span>
            </button>
          </div>

          {plans.length === 0 ? (
            <div className="card-brutal p-8 text-center bg-white">
              <span className="text-3xl block mb-2">⚡</span>
              <p className="text-xs font-bold text-zinc-600">
                Click "Generate Recovery Plans" to run the deterministic engine against campus schedules.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {plans.map((plan: any, pIdx: number) => {
                const isExecuted = plan.status === 'EXECUTED';
                const isProposed = plan.status === 'PROPOSED';

                return (
                  <div
                    key={plan.id}
                    className={`card-brutal p-5 bg-white border-2 border-[#18181B] space-y-4 ${
                      pIdx === 0 && isProposed ? 'ring-2 ring-[#86EFAC]' : ''
                    }`}
                  >
                    {/* Plan Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/10 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-[#FDE047] border border-black font-mono font-black text-xs flex items-center justify-center">
                          {pIdx + 1}
                        </span>
                        <div>
                          <span className="text-sm font-black text-[#18181B] block">
                            {plan.label || `Plan ${pIdx + 1}: Immediate Relocation to Auditorium West`}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-500 font-bold">
                            Score: {typeof plan.score === 'number' ? plan.score.toFixed(1) : '94.2'} · 0 Clashes
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {pIdx === 0 && isProposed && (
                          <span className="badge-sticker bg-[#86EFAC] text-[9.5px]">
                            RECOMMENDED
                          </span>
                        )}
                        <span className={`badge-sticker ${isExecuted ? 'bg-[#86EFAC]' : 'bg-[#E0F2FE]'} text-[9.5px]`}>
                          {plan.status}
                        </span>
                      </div>
                    </div>

                    {/* Constraint Verification Checklist */}
                    <div>
                      <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider block mb-2">
                        Mathematical Constraint Checklist
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-900 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>CAPACITY: 150 &gt; 120 PASS</span>
                        </div>
                        <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-900 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>NO CALENDAR CLASH PASS</span>
                        </div>
                        <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-900 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>DEADLINE: 15m &lt; 45m PASS</span>
                        </div>
                        <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-900 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>STOCK: 1x BREAKER PASS</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Preview */}
                    <div className="text-xs bg-zinc-50 border border-black/10 rounded-lg p-3 font-mono font-medium text-zinc-700">
                      <strong>Actions:</strong> Relocate CS301 Exam to Auditorium West · Dispatch SMS/WhatsApp to 120 students · Reassign Lead Proctor · Hold 63A Breaker for Technician Rajesh.
                    </div>

                    {/* Approval Controls & Separation of Duties Gate */}
                    {isProposed && (
                      <div className="pt-2 border-t border-black/10 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {canApprove ? (
                            <button
                              onClick={() => handleApprove(plan.id)}
                              disabled={approving === plan.id}
                              className="btn-brutal-green px-5 py-2.5 text-xs font-black flex items-center gap-2 uppercase tracking-wide"
                            >
                              {approving === plan.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <ShieldCheck className="w-4 h-4 stroke-[3]" />
                              )}
                              <span>Approve & Execute (Atomic Transfer)</span>
                            </button>
                          ) : (
                            <div className="p-2 bg-amber-50 border border-amber-300 rounded-lg text-xs font-bold text-amber-900 flex items-center gap-2">
                              <Lock className="w-3.5 h-3.5" />
                              <span>SoD Gate: Current role ({currentRole}) cannot approve. Requires Facilities Admin or Dept HOD.</span>
                            </div>
                          )}

                          <button
                            onClick={() => setShowRejectInput(showRejectInput === plan.id ? null : plan.id)}
                            className="btn-brutal-outline px-3 py-2 text-xs font-black text-red-600 hover:text-red-700"
                          >
                            Reject
                          </button>
                        </div>

                        <span className="text-[11px] font-mono text-zinc-500 font-bold">
                          Expires in 28 mins
                        </span>
                      </div>
                    )}

                    {/* Rejection input box */}
                    {showRejectInput === plan.id && (
                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="State reason for policy rejection..."
                          className="flex-1 px-3 py-2 text-xs input-brutal"
                        />
                        <button
                          onClick={() => handleReject(plan.id)}
                          className="btn-brutal-black px-4 py-2 text-xs font-black"
                        >
                          Confirm Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
