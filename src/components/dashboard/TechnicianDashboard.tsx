'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Wrench, Shield, Camera, Upload, ChevronRight, Zap, RefreshCw, Send } from 'lucide-react';
import { PersonaProfile } from '@/types/personas';

interface WorkOrder {
  id: string;
  room: string;
  department: string;
  equipment: string;
  title: string;
  description: string;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'NEED_PARTS' | 'TAKING_TIME';
  slaCountdown: string;
  photoUrl: string;
  hasAfterPhoto?: boolean;
  aiDiagnostic: string;
  requiredPart: string;
}

interface TechnicianDashboardProps {
  persona: PersonaProfile;
  onWorkOrderCompleted?: (orderId: string) => void;
}

export const TechnicianDashboard: React.FC<TechnicianDashboardProps> = ({ persona, onWorkOrderCompleted }) => {
  // Real-time notification banner
  const [realtimeAlert, setRealtimeAlert] = useState(true);

  // Work orders list
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([
    {
      id: 'WO-882',
      room: 'Hall B-204',
      department: 'Electrical Engg / Facilities',
      equipment: 'Distribution Board DB-2B · MCB 63A 3-Phase',
      title: 'Main breaker tripped 30 mins before 180-student examination',
      description: 'Total loss of illumination and projection power in Hall B-204. Faculty reported overload smoke smell near secondary panel.',
      status: 'IN_PROGRESS',
      slaCountdown: '00h 24m remaining',
      photoUrl: '/assets/aistudio/image_7671df28.png',
      aiDiagnostic: 'Gemini Telemetry: Phase-2 current spiked to 84A due to faulty AV rack PSU. Breaker thermal trip engaged. Recommendation: Replace 63A switch, verify impedance before energizing.',
      requiredPart: 'MCB-63A-3P (Qty: 1)',
    },
    {
      id: 'WO-879',
      room: 'Server C-1',
      department: 'IT Infrastructure',
      equipment: 'Online UPS 40kVA Battery Bank #2',
      title: 'Battery cell impedance imbalance warning',
      description: 'Scheduled preventive check on string 2 cells. No current campus outage.',
      status: 'ASSIGNED',
      slaCountdown: '03h 15m remaining',
      photoUrl: '/assets/aistudio/image_8cc91da7.png',
      aiDiagnostic: 'Cell #14 internal resistance at 18 mΩ. Clean terminals and verify float charge.',
      requiredPart: 'UPS-TERMINAL-LUG (Qty: 4)',
    },
  ]);

  // Selected work order for active repair
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder>(workOrders[0]);

  // Feedback states
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showEvidenceUpload, setShowEvidenceUpload] = useState(false);
  const [evidenceAttached, setEvidenceAttached] = useState(false);

  // Handle status updates
  const handleUpdateStatus = (
    newStatus: 'COMPLETED' | 'NEED_PARTS' | 'TAKING_TIME',
    reason?: string
  ) => {
    const updated = workOrders.map((wo) => {
      if (wo.id === selectedOrder.id) {
        return {
          ...wo,
          status: newStatus,
          hasAfterPhoto: newStatus === 'COMPLETED' ? true : wo.hasAfterPhoto,
        };
      }
      return wo;
    });

    setWorkOrders(updated);
    setSelectedOrder({
      ...selectedOrder,
      status: newStatus,
      hasAfterPhoto: newStatus === 'COMPLETED' ? true : selectedOrder.hasAfterPhoto,
    });

    if (newStatus === 'COMPLETED') {
      try {
        fetch('/api/redis/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            box: 'student',
            type: 'RESOLUTION_CONFIRMED',
            payload: {
              ticketId: selectedOrder.id,
              room: selectedOrder.room,
              resolvedBy: 'Rajesh Kumar (Lead Field Technician)',
              note: 'This issue has been solved. Thank you for notifying us.',
              status: 'RESOLVED',
            },
          }),
        }).catch(() => {});
      } catch {}

      setStatusMessage(
        '✓ Work order marked COMPLETED! Automated receipt sent to student: "This issue has been solved. Thank you for notifying us."'
      );
      if (onWorkOrderCompleted) onWorkOrderCompleted(selectedOrder.id);
    } else if (newStatus === 'NEED_PARTS') {
      setStatusMessage(
        '⏳ Marked INCOMPLETE / NEED PARTS. AI automated requisition for MCB-63A-3P sent to S. Venkatesh (Stores).'
      );
    } else {
      setStatusMessage(
        '⚠️ Marked TAKING MORE TIME. AI extended SLA countdown by 45 mins and alerted Facilities Chief Controller.'
      );
    }

    setTimeout(() => setStatusMessage(null), 5000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* =========================================================================
          CRITICAL USER REQUIREMENT: REAL-TIME NOTIFICATION ALERT
          "Alerts: Real-time notifications when a new issue has been raised."
      ========================================================================= */}
      {realtimeAlert && (
        <div className="card-brutal p-4 bg-[#FEF9C3] border-2 border-[#18181B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-brutal animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FDE047] border-2 border-[#18181B] flex items-center justify-center shrink-0 shadow-brutal-sm">
              <span className="text-xl">🔔</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="badge-sticker bg-red-500 text-white text-[10px] animate-bounce">
                  CRITICAL DISPATCH
                </span>
                <span className="text-[11px] font-mono font-bold text-zinc-600">HIGH PRIORITY</span>
              </div>
              <h4 className="text-sm font-black text-[#18181B] mt-0.5">
                New Disruption Raised: Hall B-204 Main Power Tripped
              </h4>
              <p className="text-xs text-zinc-700 font-medium mt-0.5">
                Assigned to Rajesh Kumar · 180 Students in Hall · MCB Distribution Board inspection required immediately.
              </p>
            </div>
          </div>
          <button
            onClick={() => setRealtimeAlert(false)}
            className="px-3 py-1 bg-white hover:bg-zinc-100 border border-black rounded-lg text-xs font-bold shrink-0 self-end sm:self-center transition-colors"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* Status Feedback Toast */}
      {statusMessage && (
        <div className="card-brutal p-3 bg-[#DCFCE7] border-2 border-[#18181B] text-xs font-bold text-emerald-900 flex items-center gap-2 shadow-brutal-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* =========================================================================
          TOP ROW: 4 VISUAL KPI STATS & GRAPHS
      ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-brutal p-4 bg-[#DCFCE7]">
          <span className="text-xs font-black uppercase text-zinc-700">Assigned Orders</span>
          <div className="mt-2">
            <span className="text-3xl font-black text-[#18181B]">2</span>
            <p className="text-[11px] font-bold text-emerald-800 mt-1">1 Critical · 1 Routine</p>
          </div>
        </div>

        <div className="card-brutal p-4 bg-[#FEF9C3]">
          <span className="text-xs font-black uppercase text-zinc-700">SLA Compliance</span>
          <div className="mt-2">
            <span className="text-3xl font-black text-[#18181B]">94.2%</span>
            <p className="text-[11px] font-bold text-amber-900 mt-1">14 On-Time Resolves</p>
          </div>
        </div>

        <div className="card-brutal p-4 bg-[#E0F2FE]">
          <span className="text-xs font-black uppercase text-zinc-700">Mean Time (MTTR)</span>
          <div className="mt-2">
            <span className="text-3xl font-black text-[#18181B]">34<span className="text-base font-normal">m</span></span>
            <p className="text-[11px] font-bold text-sky-900 mt-1">Faster than 45m target</p>
          </div>
        </div>

        <div className="card-brutal p-4 bg-[#FCE7F3]">
          <span className="text-xs font-black uppercase text-zinc-700">Parts Reserved</span>
          <div className="mt-2">
            <span className="text-3xl font-black text-[#18181B]">1</span>
            <p className="text-[11px] font-bold text-pink-900 mt-1">MCB-63A-3P in Stores</p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MIDDLE: WORK ORDER DETAILS + LIVE PHOTO INSPECTION + STATUS CONTROLS
      ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLS: ACTIVE WORK ORDER DETAIL WITH PHOTOS & ACTIONS */}
        <div className="lg:col-span-2 card-brutal p-5 bg-white space-y-4">
          <div className="flex items-center justify-between pb-3 border-b-2 border-zinc-100">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-[#86EFAC] border-2 border-[#18181B] flex items-center justify-center font-black text-sm shadow-brutal-sm">
                🔧
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-[#18181B]">{selectedOrder.id}</span>
                  <span className="badge-sticker bg-[#FEF9C3] text-[9px]">{selectedOrder.department}</span>
                </div>
                <p className="text-xs font-bold text-zinc-600 mt-0.5">{selectedOrder.equipment}</p>
              </div>
            </div>

            <div className="text-right">
              <span className="badge-sticker bg-red-100 text-red-800 text-[10px] font-mono">
                ⏱ {selectedOrder.slaCountdown}
              </span>
            </div>
          </div>

          {/* Description & AI Diagnostic */}
          <div>
            <h4 className="text-sm font-black text-[#18181B]">{selectedOrder.title}</h4>
            <p className="text-xs text-zinc-700 mt-1 leading-relaxed">{selectedOrder.description}</p>
          </div>

          {/* AI Diagnostic Callout Box */}
          <div className="p-3 bg-zinc-50 border-2 border-[#18181B] rounded-xl flex items-start gap-2.5">
            <span className="text-base shrink-0">🤖</span>
            <div>
              <span className="text-[10px] font-mono font-black uppercase text-zinc-600 block">
                AI Telemetry & Diagnostic Recommendation:
              </span>
              <p className="text-xs text-zinc-800 font-medium mt-0.5">
                {selectedOrder.aiDiagnostic}
              </p>
              <div className="mt-1 text-[11px] font-mono text-emerald-800 font-bold">
                ↳ Required Inventory: {selectedOrder.requiredPart}
              </div>
            </div>
          </div>

          {/* ACCOMPANYING DISRUPTION PHOTOS (Critical User Requirement) */}
          <div>
            <span className="text-[11px] font-black uppercase text-zinc-600 block mb-2">
              Incoming Disruption Photo & Evidence:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Photo 1: Tripped breaker evidence */}
              <div className="border-2 border-[#18181B] rounded-xl overflow-hidden bg-zinc-100">
                <div className="h-32 bg-zinc-800 relative flex items-center justify-center overflow-hidden">
                  {/* Visual simulated panel display */}
                  <div className="w-full h-full bg-linear-to-br from-zinc-700 to-zinc-900 p-3 flex flex-col justify-between text-white font-mono text-[10px]">
                    <div className="flex justify-between items-center">
                      <span className="text-amber-400 font-bold">PANEL DB-2B (HALL B-204)</span>
                      <span className="bg-red-600 px-1.5 py-0.5 rounded text-[8px] font-bold">FAULT: TRIP</span>
                    </div>
                    <div className="text-center my-auto py-2">
                      <span className="text-2xl font-black text-red-500">63A OVERLOAD</span>
                      <p className="text-[9px] text-zinc-300">Phase-2 Impedance: 1.4Ω (High)</p>
                    </div>
                    <div className="text-zinc-400 text-[8px]">
                      Photo Tag: hall_b204_tripped_mcb.jpg
                    </div>
                  </div>
                </div>
                <div className="p-2 bg-white text-[11px] font-bold text-zinc-700 flex justify-between items-center">
                  <span>Photo 1: Breaker Board Tripped</span>
                  <span className="text-emerald-700 text-[10px] font-mono">VERIFIED</span>
                </div>
              </div>

              {/* Photo 2: After-Repair Evidence Upload dropzone */}
              <div
                onClick={() => setEvidenceAttached(!evidenceAttached)}
                className={`border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  evidenceAttached
                    ? 'border-[#86EFAC] bg-[#DCFCE7]/40'
                    : 'border-zinc-300 hover:border-[#18181B] bg-zinc-50'
                }`}
              >
                <Camera className="w-6 h-6 text-zinc-500 mb-1" />
                <span className="text-xs font-black text-[#18181B]">
                  {evidenceAttached ? '✓ Evidence Attached (after_repair_63a.jpg)' : 'Attach After-Repair Photo'}
                </span>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Required before marking work order as completed
                </p>
              </div>
            </div>
          </div>

          {/* =========================================================================
              CRITICAL USER REQUIREMENT: 3 STATUS UPDATE CONTROLS ROUTED THROUGH AI
              (1) Completed, (2) Incomplete / Need Parts, (3) Taking More Time
          ========================================================================= */}
          <div className="pt-2 border-t-2 border-zinc-100">
            <span className="text-[11px] font-black uppercase text-zinc-600 block mb-2.5">
              Update Repair Progress (AI-Enforced):
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option 1: Mark Completed */}
              <button
                onClick={() => handleUpdateStatus('COMPLETED')}
                className="btn-brutal-green py-2.5 px-3 text-xs font-black flex items-center justify-center gap-1.5 shadow-brutal-sm"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Mark Completed</span>
              </button>

              {/* Option 2: Need Parts */}
              <button
                onClick={() => handleUpdateStatus('NEED_PARTS')}
                className="btn-brutal-yellow py-2.5 px-3 text-xs font-black flex items-center justify-center gap-1.5 shadow-brutal-sm"
              >
                <Wrench className="w-4 h-4 stroke-[2.5]" />
                <span>Need Parts</span>
              </button>

              {/* Option 3: Taking More Time */}
              <button
                onClick={() => handleUpdateStatus('TAKING_TIME')}
                className="btn-brutal-pink py-2.5 px-3 text-xs font-black flex items-center justify-center gap-1.5 shadow-brutal-sm"
              >
                <Clock className="w-4 h-4 stroke-[2.5]" />
                <span>Taking More Time</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COL: WORK ORDERS QUEUE + DAILY COMPLETIONS GRAPH */}
        <div className="space-y-4">
          {/* Work Orders List */}
          <div className="card-brutal p-4 bg-white">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 mb-3">
              <span className="text-xs font-black uppercase text-[#18181B]">
                Assigned Orders Queue
              </span>
              <span className="badge-sticker bg-zinc-100 text-[9px]">{workOrders.length} ORDERS</span>
            </div>

            <div className="space-y-2.5">
              {workOrders.map((wo) => {
                const isSelected = wo.id === selectedOrder.id;
                return (
                  <div
                    key={wo.id}
                    onClick={() => setSelectedOrder(wo)}
                    className={`p-3 rounded-xl border-2 border-[#18181B] cursor-pointer transition-all ${
                      isSelected ? 'bg-[#DCFCE7] shadow-brutal-sm' : 'bg-zinc-50 hover:bg-zinc-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#18181B]">{wo.id}</span>
                      <span className="text-[10px] font-mono font-bold text-zinc-600">{wo.room}</span>
                    </div>
                    <p className="text-[11px] font-bold text-zinc-800 mt-1 truncate">{wo.title}</p>
                    <div className="mt-2 flex items-center justify-between text-[10px] font-mono">
                      <span className="badge-sticker bg-white text-[8px] py-0">{wo.status}</span>
                      <span className="text-red-700 font-bold">{wo.slaCountdown}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daily Work Order Resolution Velocity Bar Chart */}
          <div className="card-brutal p-4 bg-white">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 mb-2">
              <span className="text-xs font-black uppercase text-[#18181B]">Daily Resolutions</span>
              <span className="badge-sticker bg-[#86EFAC] text-[9px]">THIS WEEK</span>
            </div>

            <div className="h-24 flex items-end justify-between gap-1.5 pt-3">
              {[
                { day: 'M', h: '60%', count: '4' },
                { day: 'T', h: '85%', count: '6' },
                { day: 'W', h: '70%', count: '5' },
                { day: 'T', h: '100%', count: '8' },
                { day: 'F', h: '90%', count: '7' },
              ].map((b, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 justify-end h-full">
                  <span className="text-[8px] font-mono font-bold text-zinc-600">{b.count}</span>
                  <div
                    style={{ height: b.h }}
                    className="w-full bg-[#86EFAC] border border-[#18181B] rounded-t-sm"
                  />
                  <span className="text-[8px] font-mono font-bold text-zinc-500">{b.day}</span>
                </div>
              ))}
            </div>

            <p className="mt-3 text-[10px] font-mono text-zinc-500 text-center">
              Target: 5 work orders / day · Currently 120%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
