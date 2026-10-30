'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Wrench,
  Search,
  Filter,
  Camera,
  MapPin,
  Send,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { PersonaProfile } from '@/types/personas';

export interface WorkOrderItem {
  id: string;
  trackingId: string;
  title: string;
  description: string;
  category: 'ELECTRICAL' | 'NETWORK' | 'HVAC' | 'PLUMBING' | 'HARDWARE';
  room: string;
  requesterName: string;
  requesterRole: string;
  status: 'REPORTED' | 'TRIAGED' | 'IN_PROGRESS' | 'RESOLVED' | 'BLOCKED';
  urgency: 'NORMAL' | 'URGENT' | 'EXAM_BLOCKING';
  assignedTech?: string;
  slaDeadline: string;
  photoUrl?: string;
  aiDiagnostic: string;
  requiredPart?: string;
  resolutionNote?: string;
  createdAt: string;
}

interface WorkOrdersQueriesViewProps {
  persona: PersonaProfile;
  onOpenReport?: () => void;
  onOpenCockpit?: () => void;
}

export const WorkOrdersQueriesView: React.FC<WorkOrdersQueriesViewProps> = ({
  persona,
  onOpenReport,
  onOpenCockpit,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED' | 'EXAM'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Core list of tickets
  const [orders, setOrders] = useState<WorkOrderItem[]>([
    {
      id: 'wo-1',
      trackingId: 'INC-204',
      title: 'Hall B-204 Main Power Tripped 30m Before Exam',
      description: 'Total loss of lighting and projection power in Hall B-204. 180 students arriving for EE301 exam.',
      category: 'ELECTRICAL',
      room: 'Hall B-204 (B Block, Fl 2)',
      requesterName: 'Dr. K. Raman',
      requesterRole: 'Faculty HOD',
      status: 'RESOLVED',
      urgency: 'EXAM_BLOCKING',
      assignedTech: 'Rajesh Kumar (Lead Tech)',
      slaDeadline: 'Target: 45 mins (Resolved in 34m)',
      photoUrl: '/assets/aistudio/image_7671df28.png',
      aiDiagnostic: 'Gemini Telemetry: Phase-2 current overload (84.2A). Breaker tripped thermally. Recommended: Swap 63A switch from Stores.',
      requiredPart: 'MCB-63A-3P (Qty: 1)',
      resolutionNote: 'Continuity restored in Library Hall A. New 63A MCB switch installed and calibrated.',
      createdAt: 'Today, 21:15',
    },
    {
      id: 'wo-2',
      trackingId: 'INC-208',
      title: 'Hostel Block C-302 Wi-Fi Access Point Dropping',
      description: 'Signal keeps resetting every 10 minutes following evening voltage sag.',
      category: 'NETWORK',
      room: 'Hostel Block C-302',
      requesterName: 'Aarav Patel',
      requesterRole: 'Student (Roll #22CS045)',
      status: 'IN_PROGRESS',
      urgency: 'NORMAL',
      assignedTech: 'Rajesh Kumar (Lead Tech)',
      slaDeadline: '02h 15m remaining',
      photoUrl: '/assets/aistudio/image_8cc91da7.png',
      aiDiagnostic: 'Cat6 patch cable intermittent impedance spike. Replace connector.',
      requiredPart: 'CAT6-PATCH-3M',
      createdAt: 'Today, 18:30',
    },
    {
      id: 'wo-3',
      trackingId: 'INC-212',
      title: 'Server C-1 Secondary Chiller Ambient Temp Warning',
      description: 'Chiller CRAC-2 sensor reporting 27.2°C. Backup fan cycling continuously.',
      category: 'HVAC',
      room: 'Server Room C-1',
      requesterName: 'System Monitor BMS',
      requesterRole: 'Automated Webhook',
      status: 'TRIAGED',
      urgency: 'URGENT',
      assignedTech: 'Facilities Rapid Response',
      slaDeadline: '01h 10m remaining',
      aiDiagnostic: 'Compressor thermal cut-off engaged. Inspect R410A refrigerant pressure.',
      requiredPart: 'R410A-11KG',
      createdAt: 'Today, 20:00',
    },
    {
      id: 'wo-4',
      trackingId: 'INC-198',
      title: 'Mechanical Workshop Foundry Water Cooler Tap Leak',
      description: 'Filtration unit lower valve dripping onto workshop concrete floor.',
      category: 'PLUMBING',
      room: 'Mechanical Ground Workshop',
      requesterName: 'Vikram Singh',
      requesterRole: 'Student (Mech Engg)',
      status: 'RESOLVED',
      urgency: 'NORMAL',
      assignedTech: 'Civil & Plumbing Division',
      slaDeadline: 'Resolved within SLA',
      aiDiagnostic: 'Pressure valve diaphragm wear detected. Replaced valve washer and certified seal.',
      resolutionNote: 'Valve washer replaced; filtration test passed.',
      createdAt: 'Yesterday, 14:20',
    },
  ]);

  // Handle action buttons
  const handleUpdateTicket = (id: string, newStatus: 'RESOLVED' | 'BLOCKED' | 'IN_PROGRESS', note?: string) => {
    setOrders(
      orders.map((o) => (o.id === id ? { ...o, status: newStatus, resolutionNote: note || o.resolutionNote } : o))
    );
    setFeedbackToast(`✓ Ticket ${id} updated to ${newStatus}! Logged in audit trail.`);
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  const filteredOrders = orders.filter((o) => {
    if (filter === 'ACTIVE') return o.status !== 'RESOLVED';
    if (filter === 'RESOLVED') return o.status === 'RESOLVED';
    if (filter === 'EXAM') return o.urgency === 'EXAM_BLOCKING';
    return true;
  }).filter((o) => {
    if (!search) return true;
    return (
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      o.room.toLowerCase().includes(search.toLowerCase()) ||
      o.trackingId.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Toast */}
      {feedbackToast && (
        <div className="card-brutal p-3 bg-[#DCFCE7] border-2 border-[#18181B] text-xs font-bold text-emerald-900 flex items-center gap-2 shadow-brutal-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="card-brutal p-5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#FDE047] border-2 border-[#18181B] flex items-center justify-center font-black text-sm shadow-brutal-sm">
              📋
            </span>
            <h2 className="text-lg font-black text-[#18181B] uppercase tracking-tight">
              Work Orders & Queries Management
            </h2>
          </div>
          <p className="text-xs text-zinc-600 mt-1 font-medium">
            Live queue of student queries, AI-generated work orders, and technician dispatches across the campus.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenReport && (
            <button
              onClick={onOpenReport}
              className="btn-brutal-green px-4 py-2 text-xs font-black flex items-center gap-1.5 shadow-brutal-sm"
            >
              <span>+ New Disruption Report</span>
            </button>
          )}
          {onOpenCockpit && (
            <button
              onClick={onOpenCockpit}
              className="btn-brutal-pink px-4 py-2 text-xs font-black flex items-center gap-1.5 shadow-brutal-sm"
            >
              <span>Blast Radius Cockpit</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg border-2 border-[#18181B] text-xs font-black transition-all ${
              filter === 'ALL' ? 'bg-[#18181B] text-white shadow-brutal-sm' : 'bg-white text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            All Tickets ({orders.length})
          </button>
          <button
            onClick={() => setFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg border-2 border-[#18181B] text-xs font-black transition-all ${
              filter === 'ACTIVE' ? 'bg-[#FEF9C3] text-amber-950 shadow-brutal-sm' : 'bg-white text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            Active In-Progress (2)
          </button>
          <button
            onClick={() => setFilter('RESOLVED')}
            className={`px-3 py-1.5 rounded-lg border-2 border-[#18181B] text-xs font-black transition-all ${
              filter === 'RESOLVED' ? 'bg-[#DCFCE7] text-emerald-950 shadow-brutal-sm' : 'bg-white text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            Resolved (2)
          </button>
          <button
            onClick={() => setFilter('EXAM')}
            className={`px-3 py-1.5 rounded-lg border-2 border-[#18181B] text-xs font-black transition-all ${
              filter === 'EXAM' ? 'bg-[#FDA4AF] text-red-950 shadow-brutal-sm' : 'bg-white text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            🚨 Exam Blocking (1)
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets by ID, room..."
            className="w-full bg-white border-2 border-[#18181B] rounded-lg pl-8 pr-3 py-1 text-xs focus:outline-none"
          />
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {filteredOrders.map((order) => {
          const isResolved = order.status === 'RESOLVED';
          const isExam = order.urgency === 'EXAM_BLOCKING';

          return (
            <div
              key={order.id}
              className={`card-brutal p-5 bg-white border-2 border-[#18181B] space-y-3.5 ${
                isExam ? 'ring-2 ring-red-400 ring-offset-2' : ''
              }`}
            >
              {/* Top Row: IDs, Category, Urgency, Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b-2 border-zinc-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="badge-sticker bg-[#FEF9C3] text-xs font-mono font-bold">
                    {order.trackingId}
                  </span>
                  <span className="badge-sticker bg-zinc-100 text-[10px]">{order.category}</span>
                  <span className="flex items-center gap-1 text-xs font-bold text-zinc-700">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{order.room}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-zinc-500 font-bold">{order.slaDeadline}</span>
                  <span
                    className={`badge-sticker text-xs py-0.5 px-2 ${
                      isResolved
                        ? 'bg-[#86EFAC] text-emerald-950 font-black'
                        : isExam
                        ? 'bg-[#FDA4AF] text-red-950 animate-pulse font-black'
                        : 'bg-[#FEF9C3] text-amber-950 font-black'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="text-base font-black text-[#18181B]">{order.title}</h3>
                <p className="text-xs text-zinc-700 mt-1 leading-relaxed">{order.description}</p>
                <div className="mt-1 text-[11px] text-zinc-500 font-mono">
                  Reported by: <span className="font-bold text-zinc-800">{order.requesterName}</span> ({order.requesterRole}) · {order.createdAt}
                </div>
              </div>

              {/* AI Diagnostic Rationale & Evidence Photo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <div className="md:col-span-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-black uppercase text-zinc-600 mb-1">
                    <Sparkles className="w-3 h-3 text-[#F472B6]" />
                    <span>Gemini AI Diagnostic Telemetry:</span>
                  </div>
                  <p className="text-zinc-800 font-medium">{order.aiDiagnostic}</p>
                  {order.requiredPart && (
                    <div className="mt-1 text-[11px] font-mono font-bold text-emerald-800">
                      ↳ Required Part: {order.requiredPart}
                    </div>
                  )}
                  {order.resolutionNote && (
                    <div className="mt-2 p-2 bg-[#DCFCE7] rounded border border-emerald-300 text-emerald-950 font-bold text-[11px]">
                      ✓ Resolution Proof: {order.resolutionNote}
                    </div>
                  )}
                </div>

                {/* Evidence Photo Preview */}
                <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-black uppercase text-zinc-600 block mb-1">
                      Evidence Photo
                    </span>
                    {order.photoUrl ? (
                      <div
                        onClick={() => setSelectedPhoto(order.photoUrl || null)}
                        className="h-20 bg-zinc-800 rounded-lg overflow-hidden relative cursor-pointer group border border-black/20"
                      >
                        <div className="w-full h-full bg-linear-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-white text-[9px] font-mono p-1 text-center">
                          ⚡ PANEL DB-2B FAULT
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity">
                          Click to Zoom
                        </div>
                      </div>
                    ) : (
                      <div className="h-20 bg-zinc-100 rounded-lg border border-dashed border-zinc-300 flex items-center justify-center text-[10px] font-mono text-zinc-400">
                        No photo attached
                      </div>
                    )}
                  </div>

                  <span className="text-[9px] font-mono text-zinc-500 mt-1">
                    Assigned: {order.assignedTech || 'Unassigned'}
                  </span>
                </div>
              </div>

              {/* Action Buttons Tailored by Persona */}
              <div className="pt-2 border-t-2 border-zinc-100 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-zinc-500">
                  Dual-Track Audit ID: #DT-{order.id.slice(0, 6)}
                </span>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Technician Controls */}
                  {persona.role === 'TECHNICIAN' && !isResolved && (
                    <>
                      <button
                        onClick={() => handleUpdateTicket(order.id, 'RESOLVED', 'Replaced breaker; power confirmed 230V.')}
                        className="btn-brutal-green py-1.5 px-3 text-xs font-black shadow-brutal-sm"
                      >
                        ✓ Mark Completed
                      </button>
                      <button
                        onClick={() => handleUpdateTicket(order.id, 'BLOCKED', 'Waiting for Stores to dispatch part.')}
                        className="btn-brutal-yellow py-1.5 px-3 text-xs font-black shadow-brutal-sm"
                      >
                        ⏳ Need Part
                      </button>
                    </>
                  )}

                  {/* Super Admin Controls */}
                  {persona.role === 'FACILITIES_ADMIN' && (
                    <>
                      <button
                        onClick={() => handleUpdateTicket(order.id, 'RESOLVED', 'Executive sign-off by Facilities Admin.')}
                        className="btn-brutal-green py-1.5 px-3 text-xs font-black shadow-brutal-sm"
                      >
                        Approve Resolution
                      </button>
                      <button
                        onClick={onOpenCockpit}
                        className="btn-brutal-pink py-1.5 px-3 text-xs font-black shadow-brutal-sm"
                      >
                        Open AI Cockpit
                      </button>
                    </>
                  )}

                  {/* Student / Faculty Controls */}
                  {['REQUESTER', 'DEPARTMENT_MANAGER'].includes(persona.role) && (
                    <button
                      onClick={() => {
                        setFeedbackToast('Nudge sent to Rajesh Kumar via campus SMS.');
                        setTimeout(() => setFeedbackToast(null), 3000);
                      }}
                      className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 border-2 border-[#18181B] rounded-lg text-xs font-bold text-[#18181B]"
                    >
                      🔔 Nudge Technician
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Photo Zoom Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-white border-[3px] border-[#18181B] rounded-2xl shadow-brutal-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b-2 border-black">
              <span className="font-black text-sm uppercase">Incident Evidence Photo Viewer</span>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="w-7 h-7 rounded-lg bg-zinc-100 border-2 border-black flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>
            <div className="my-4 bg-zinc-900 rounded-xl p-6 text-center text-white font-mono">
              <div className="w-full h-56 bg-linear-to-br from-zinc-700 to-zinc-950 rounded-lg flex flex-col justify-between p-4 border border-zinc-600">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-amber-400 font-bold">PANEL DB-2B TELEMETRY (HALL B-204)</span>
                  <span className="bg-red-600 px-2 py-0.5 rounded text-[10px] font-bold">OVERLOAD TRIP</span>
                </div>
                <div className="text-center my-auto">
                  <span className="text-4xl font-black text-red-500">63A TRIP</span>
                  <p className="text-xs text-zinc-300 mt-1">Fault Signature: Thermal Strip Deflection</p>
                </div>
                <div className="text-[10px] text-zinc-400">
                  File: hall_b204_mcb_panel_evidence.jpg · Timestamp: 21:15
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="w-full py-2 btn-brutal-yellow text-xs font-black uppercase shadow-brutal-sm"
            >
              Close Photo Viewer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
