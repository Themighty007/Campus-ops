'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, Sparkles, ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/domain/enums';

interface RecoveryPlansCardProps {
  incident: any;
  plans: any[];
  role: UserRole;
  onGenerate: () => Promise<any>;
  onApprove: (planId: string, decision: 'APPROVED' | 'REJECTED', reason?: string) => Promise<any>;
}

export function RecoveryPlansCard({ incident, plans, role, onGenerate, onApprove }: RecoveryPlansCardProps) {
  const [generating, setGenerating] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setFeedback(null);
    try {
      const result = await onGenerate();
      if (result.plans?.length === 0) setFeedback('No feasible plans found.');
      else setFeedback(`${result.plans?.length ?? 0} plans generated.`);
    } catch {
      setFeedback('Failed to generate plans.');
    }
    setGenerating(false);
  };

  const handleApprove = async (planId: string) => {
    setApproving(planId);
    setFeedback(null);
    try {
      const result = await onApprove(planId, 'APPROVED');
      if (result.error) setFeedback(`⚠ ${result.error}`);
      else setFeedback('✅ Plan approved and executed!');
    } catch {
      setFeedback('Failed to approve plan.');
    }
    setApproving(null);
  };

  const handleReject = async (planId: string) => {
    setApproving(planId);
    setFeedback(null);
    try {
      const result = await onApprove(planId, 'REJECTED', rejectReason);
      if (result.error) setFeedback(`⚠ ${result.error}`);
      else setFeedback('Plan rejected.');
    } catch {
      setFeedback('Failed to reject plan.');
    }
    setApproving(null);
    setShowReject(null);
    setRejectReason('');
  };

  const canGenerate = ['FACILITIES_ADMIN', 'DEPARTMENT_MANAGER'].includes(role);
  const canApprove = ['FACILITIES_ADMIN', 'DEPARTMENT_MANAGER'].includes(role);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-500" />
          Recovery Plans
        </h2>
        {canGenerate && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {generating ? 'Generating…' : 'Generate Plans'}
          </button>
        )}
      </div>

      {feedback && (
        <div className="px-4 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-b border-blue-100 dark:border-blue-800">
          {feedback}
        </div>
      )}

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {plans.length === 0 && (
          <div className="p-6 text-center text-sm text-gray-500">
            No plans yet. {canGenerate ? 'Click "Generate Plans" to create recovery options.' : 'A manager must generate plans.'}
          </div>
        )}

        {plans.map((plan: any, idx: number) => (
          <div key={plan.id} className="relative">
            <button
              onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{plan.label || `Plan ${idx + 1}`}</span>
                    <PlanStatusBadge status={plan.status} />
                    {idx === 0 && plan.status === 'PROPOSED' && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full px-2 py-0.5">
                        Recommended
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{plan.actions?.length ?? 0} actions</span>
                    <span>Score: {typeof plan.score === 'number' ? plan.score.toFixed(1) : '—'}</span>
                    {plan.checks && (
                      <span className={plan.checks.every((c: any) => c.ok) ? 'text-green-600' : 'text-orange-600'}>
                        {plan.checks.filter((c: any) => c.ok).length}/{plan.checks.length} checks pass
                      </span>
                    )}
                  </div>
                </div>
                {expandedPlan === plan.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>

            {expandedPlan === plan.id && (
              <div className="px-4 pb-4 space-y-3">
                {/* Actions */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Actions</h4>
                  <div className="space-y-1">
                    {plan.actions?.map((a: any, i: number) => (
                      <div key={i} className="text-sm bg-gray-50 dark:bg-gray-800 rounded px-3 py-2 flex items-center gap-2">
                        <ActionIcon kind={a.kind} />
                        <ActionLabel action={a} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Constraint checks */}
                {plan.checks?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Deterministic Checks</h4>
                    <div className="space-y-1">
                      {plan.checks.map((c: any, i: number) => (
                        <div key={i} className={cn(
                          'text-xs rounded px-3 py-1.5 flex items-center gap-2',
                          c.ok
                            ? 'bg-green-50 dark:bg-green-900/10 text-green-800 dark:text-green-300'
                            : c.blocking
                              ? 'bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-300'
                              : 'bg-yellow-50 dark:bg-yellow-900/10 text-yellow-800 dark:text-yellow-300',
                        )}>
                          {c.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <XCircle className="w-3.5 h-3.5 text-red-600" />}
                          <span className="font-medium">{c.label}</span>
                          <span className="text-gray-500 dark:text-gray-400 ml-1">— {c.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Approve/Reject buttons */}
                {plan.status === 'PROPOSED' && canApprove && (
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => handleApprove(plan.id)}
                      disabled={approving === plan.id}
                      className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                    >
                      {approving === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      Approve & Execute
                    </button>
                    <button
                      onClick={() => setShowReject(showReject === plan.id ? null : plan.id)}
                      className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg px-4 py-2 text-sm font-medium transition-colors border border-red-200 dark:border-red-800"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                )}

                {showReject === plan.id && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason for rejection..."
                      className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm"
                    />
                    <button
                      onClick={() => handleReject(plan.id)}
                      disabled={approving === plan.id}
                      className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 text-sm font-medium"
                    >
                      Confirm Reject
                    </button>
                  </div>
                )}

                {/* Rejection reason */}
                {plan.status === 'REJECTED' && plan.rejectionReason && (
                  <div className="text-sm bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg p-3">
                    <strong>Rejected:</strong> {plan.rejectionReason}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PROPOSED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    EXECUTED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    STALE: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    EXPIRED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    WITHDRAWN: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  };
  return (
    <span className={cn('status-badge', styles[status] ?? 'bg-gray-100 text-gray-700')}>
      {status}
    </span>
  );
}

function ActionIcon({ kind }: { kind: string }) {
  const icons: Record<string, string> = {
    RELOCATE_ACTIVITY: '🏠',
    SPLIT_ACTIVITY: '✂️',
    REASSIGN_STAFF: '👤',
    RESERVE_PART: '📦',
    RESERVE_EQUIPMENT: '🔧',
    SERVICE_WORKAROUND: '⚡',
    PROCURE_PART: '🛒',
  };
  return <span>{icons[kind] ?? '•'}</span>;
}

function ActionLabel({ action }: { action: any }) {
  switch (action.kind) {
    case 'RELOCATE_ACTIVITY':
      return <span>Relocate activity to <strong>{action.toRoomCode}</strong></span>;
    case 'SPLIT_ACTIVITY':
      return <span>Split across {action.parts?.map((p: any) => p.roomCode).join(', ')}</span>;
    case 'REASSIGN_STAFF':
      return <span>Assign <strong>{action.staffName}</strong> ({action.role})</span>;
    case 'RESERVE_PART':
      return <span>Reserve {action.qty}× <strong>{action.sku}</strong></span>;
    case 'RESERVE_EQUIPMENT':
      return <span>Deploy spare equipment: {action.sku}</span>;
    case 'SERVICE_WORKAROUND':
      return <span>Workaround: {action.note}</span>;
    case 'PROCURE_PART':
      return <span>Purchase {action.qty}× {action.sku} (₹{action.amount})</span>;
    default:
      return <span>{action.kind}</span>;
  }
}
