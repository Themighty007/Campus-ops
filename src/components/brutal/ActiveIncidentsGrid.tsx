'use client';

import React, { useState } from 'react';
import { Zap, Wifi, Droplets, Clock, Users, ArrowRight, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import type { Incident } from '@/lib/domain/types';

interface ActiveIncidentsGridProps {
  incidents: any[];
  selectedId: string | null;
  onSelectIncident: (id: string) => void;
  onOpenReportModal: () => void;
  onTriggerChaos: (scenario: string) => void;
}

export const ActiveIncidentsGrid: React.FC<ActiveIncidentsGridProps> = ({
  incidents,
  selectedId,
  onSelectIncident,
  onOpenReportModal,
  onTriggerChaos,
}) => {
  const [activeTab, setActiveTab] = useState<'incidents' | 'chaos'>('incidents');

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto">
      {/* TABS HEADER: EXACT MATCH TO REFERENCE IMAGE 4
          Tabs bar: [ Hackathons ] and [ Workshops ] -> [ ⚡ Active Recovery Grid ] and [ 🧪 Chaos Lab Simulator ] */}
      <div className="flex items-center gap-3 border-b-2 border-[#18181B] pb-4 mb-8">
        <button
          onClick={() => setActiveTab('incidents')}
          className={`px-5 py-2.5 rounded-lg border-2 border-[#18181B] text-xs sm:text-sm font-black uppercase tracking-tight flex items-center gap-2 transition-all ${
            activeTab === 'incidents'
              ? 'bg-[#86EFAC] text-[#18181B] shadow-brutal translate-x-[-1px] translate-y-[-1px]'
              : 'bg-white text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          <span>⚡ Active Recovery Grid</span>
          <span className="w-5 h-5 rounded-full bg-[#18181B] text-white text-[10px] flex items-center justify-center font-mono">
            {incidents.filter((i) => !['RESOLVED', 'CLOSED'].includes(i.status)).length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('chaos')}
          className={`px-5 py-2.5 rounded-lg border-2 border-[#18181B] text-xs sm:text-sm font-black uppercase tracking-tight flex items-center gap-2 transition-all ${
            activeTab === 'chaos'
              ? 'bg-[#F472B6] text-[#18181B] shadow-brutal translate-x-[-1px] translate-y-[-1px]'
              : 'bg-white text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          <span>🧪 Chaos Lab (Simulators)</span>
        </button>
      </div>

      {/* CONTENT TAB 1: ACTIVE INCIDENTS */}
      {activeTab === 'incidents' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {incidents.length === 0 ? (
            <div className="col-span-full card-brutal p-8 text-center bg-white">
              <span className="text-4xl block mb-2">🎉</span>
              <h3 className="text-base font-black text-[#18181B]">All Campus Zones Protected</h3>
              <p className="text-xs text-zinc-500 mt-1">No disruptions active. Use Chaos Lab to trigger a scenario.</p>
            </div>
          ) : (
            incidents.map((inc, idx) => {
              const isSelected = selectedId === inc.id;
              const isP1 = inc.severity === 'P1';
              const isElectrical = inc.category === 'ELECTRICAL';

              return (
                /* CARD MATCHING EXACT TEXTURES FROM REFERENCE IMAGE 4 */
                <div
                  key={inc.id}
                  onClick={() => onSelectIncident(inc.id)}
                  className={`card-brutal overflow-hidden flex flex-col justify-between cursor-pointer transition-all ${
                    isSelected ? 'ring-4 ring-[#18181B] translate-x-[-2px] translate-y-[-2px]' : ''
                  }`}
                >
                  {/* Top Visual Section matching Image 4 (Torn paper or gradient) */}
                  <div
                    className={`h-36 p-4 flex flex-col justify-between border-b-2 border-[#18181B] relative ${
                      isElectrical
                        ? 'bg-[#DCFCE7]' // Torn look mint green
                        : idx % 2 === 0
                        ? 'bg-gradient-to-r from-purple-500 to-cyan-400 text-white' // Gradient from ROS Arena card
                        : 'bg-[#FEF9C3]' // Yellow paper
                    }`}
                  >
                    {/* Top Tag Pills */}
                    <div className="flex items-center justify-between">
                      <span className="badge-sticker bg-[#F472B6] text-[#18181B] text-[10px]">
                        {inc.category}
                      </span>
                      <span
                        className={`badge-sticker ${
                          isP1 ? 'bg-[#EF4444] text-white' : 'bg-[#FDE047] text-[#18181B]'
                        } text-[10px]`}
                      >
                        {inc.severity} CRITICAL
                      </span>
                    </div>

                    {/* Big Bold Headline matching Image 4 */}
                    <div>
                      <span className="text-2xl sm:text-3xl font-black uppercase tracking-tight block text-[#18181B]">
                        {inc.code || `INC-${idx + 1}`}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#18181B]/80 block truncate">
                        {inc.subtype || inc.category} Alert
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-4 bg-white flex-1 flex flex-col justify-between">
                    <div>
                      {/* Secondary Category Tag like [NLP AND RAG] in Image 4 */}
                      <div className="flex flex-wrap gap-1.5 mb-2.5">
                        <span className="badge-sticker bg-[#86EFAC] text-[#18181B] text-[9.5px]">
                          ROOM {inc.roomId ? 'ASSIGNED' : 'B-204'}
                        </span>
                        {inc.isSafety && (
                          <span className="badge-sticker bg-[#EF4444] text-white text-[9.5px]">
                            SAFETY RISK
                          </span>
                        )}
                        <span className="badge-sticker bg-zinc-100 text-zinc-700 text-[9.5px]">
                          STATUS: {inc.status}
                        </span>
                      </div>

                      {/* Title & Summary */}
                      <h4 className="text-base font-black text-[#18181B] line-clamp-1">
                        {inc.summary || 'Disruption requiring immediate recovery'}
                      </h4>
                      <p className="text-xs text-zinc-600 line-clamp-2 mt-1 font-medium">
                        {inc.summary}
                      </p>
                    </div>

                    {/* Date / Time Pill from Image 4 */}
                    <div>
                      <div className="px-3 py-1.5 bg-zinc-100 border border-[#18181B] rounded-lg text-xs font-mono font-bold text-zinc-700 flex items-center justify-between mb-4">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#18181B]" />
                          <span>EXAM DEADLINE</span>
                        </span>
                        <span className="text-red-600 font-extrabold animate-pulse">
                          45m Left
                        </span>
                      </div>

                      {/* VIEW DETAILS / RECOVERY PLAN BUTTON MATCHING IMAGE 4 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectIncident(inc.id);
                        }}
                        className={`w-full py-2.5 border-2 border-[#18181B] rounded-xl text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all ${
                          isP1
                            ? 'bg-[#F472B6] text-[#18181B] hover:bg-[#F472B6]/90'
                            : 'bg-[#18181B] text-white hover:bg-zinc-800'
                        }`}
                      >
                        <span>{isSelected ? 'INSPECTING IN COCKPIT' : 'VIEW RECOVERY PLAN'}</span>
                        <ArrowRight className="w-4 h-4 stroke-[3]" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* =========================================================================
           CONTENT TAB 2: CHAOS LAB (SCENARIO INJECTORS)
        ========================================================================= */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Scenario 1 */}
          <div className="card-brutal p-6 bg-[#FEF9C3] flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#18181B] flex items-center justify-center shadow-brutal-sm mb-3">
                <Zap className="w-6 h-6 text-[#18181B]" />
              </div>
              <span className="badge-sticker bg-[#EF4444] text-white text-[10px] mb-2">
                SCENARIO 1 · P1 CRITICAL
              </span>
              <h3 className="text-lg font-black text-[#18181B] uppercase tracking-tight">
                Electrical Failure Before Exam
              </h3>
              <p className="text-xs text-zinc-700 mt-2 font-medium">
                Main circuit breaker trips in Exam Hall B-204 just 45 minutes before a final CS exam with 120 students.
              </p>
            </div>
            <button
              onClick={() => onTriggerChaos('electrical_exam')}
              className="mt-6 w-full py-2.5 btn-brutal-black text-xs font-black flex items-center justify-center gap-2"
            >
              <span>INJECT SCENARIO 1</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Scenario 2 */}
          <div className="card-brutal p-6 bg-[#E0F2FE] flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#18181B] flex items-center justify-center shadow-brutal-sm mb-3">
                <Wifi className="w-6 h-6 text-[#18181B]" />
              </div>
              <span className="badge-sticker bg-[#3B82F6] text-white text-[10px] mb-2">
                SCENARIO 2 · P2 HIGH
              </span>
              <h3 className="text-lg font-black text-[#18181B] uppercase tracking-tight">
                Network Switch Outage
              </h3>
              <p className="text-xs text-zinc-700 mt-2 font-medium">
                Core switch failure in Computer Lab A-301 during an active practical session affecting 60 workstations.
              </p>
            </div>
            <button
              onClick={() => onTriggerChaos('network_lab')}
              className="mt-6 w-full py-2.5 btn-brutal-black text-xs font-black flex items-center justify-center gap-2"
            >
              <span>INJECT SCENARIO 2</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Scenario 3 */}
          <div className="card-brutal p-6 bg-[#DCFCE7] flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#18181B] flex items-center justify-center shadow-brutal-sm mb-3">
                <Droplets className="w-6 h-6 text-[#18181B]" />
              </div>
              <span className="badge-sticker bg-[#10B981] text-white text-[10px] mb-2">
                SCENARIO 3 · P2 SAFETY
              </span>
              <h3 className="text-lg font-black text-[#18181B] uppercase tracking-tight">
                Plumbing Water Leak
              </h3>
              <p className="text-xs text-zinc-700 mt-2 font-medium">
                Ceiling water leak in Equipment Room C-102 threatening electrical shorts and stored projector hardware.
              </p>
            </div>
            <button
              onClick={() => onTriggerChaos('water_leak')}
              className="mt-6 w-full py-2.5 btn-brutal-black text-xs font-black flex items-center justify-center gap-2"
            >
              <span>INJECT SCENARIO 3</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
