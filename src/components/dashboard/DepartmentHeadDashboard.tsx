'use client';

import React, { useState } from 'react';
import {
  Shield,
  Zap,
  Activity,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building,
  FileText,
  TrendingUp,
  Cpu,
  Power,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { PersonaProfile } from '@/types/personas';

interface DepartmentHeadDashboardProps {
  persona: PersonaProfile;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
}

export const DepartmentHeadDashboard: React.FC<DepartmentHeadDashboardProps> = ({
  persona,
  activeTab = 'overview',
  onSelectTab,
}) => {
  const [selectedHall, setSelectedHall] = useState<string>('Hall B-204');
  const [generatorRunning, setGeneratorRunning] = useState(false);
  const [generatorAlert, setGeneratorAlert] = useState<string | null>(null);

  const handleToggleGenerator = () => {
    setGeneratorRunning((prev) => !prev);
    setGeneratorAlert(
      !generatorRunning
        ? '✓ EEE Emergency Diesel Generator DG-2 (40kVA) started. Feeder B-204 synchronized with 0ms interruption.'
        : 'ℹ️ Generator standby stopped. Returned to campus main grid feeder.'
    );
    setTimeout(() => setGeneratorAlert(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          DEPARTMENT IN-CHARGE IDENTITY & SCOPE BANNER
      ========================================================================= */}
      <div className="card-brutal p-5 bg-[#FAF9F5] border-2 border-[#18181B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#FEF9C3] border-2 border-black flex items-center justify-center text-2xl shadow-brutal-sm">
            👨‍🏫
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="badge-sticker bg-[#FDE047] text-black text-[10px]">EEE BLOCK EXCLUSIVE</span>
              <span className="text-xs font-mono text-zinc-500 font-bold">HOD ID #EE-101</span>
            </div>
            <h1 className="text-xl font-black text-[#18181B] tracking-tight mt-0.5">
              Electrical & Electronics Engineering Command
            </h1>
            <p className="text-xs text-zinc-600 font-medium">
              Scoped strictly to EEE department rooms, research labs, high-voltage test bays, and departmental exams.
            </p>
          </div>
        </div>

        {/* Generator Quick Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleGenerator}
            className={`px-3 py-2 rounded-xl border-2 border-black font-black text-xs flex items-center gap-2 transition-all ${
              generatorRunning
                ? 'bg-[#86EFAC] text-black shadow-brutal-sm'
                : 'bg-white text-zinc-700 hover:bg-zinc-100 shadow-brutal-sm'
            }`}
          >
            <Power className="w-4 h-4 text-black" />
            <span>{generatorRunning ? 'DG-2 ONLINE (40kVA)' : 'ENGAGE BACKUP DG-2'}</span>
          </button>
        </div>
      </div>

      {generatorAlert && (
        <div className="p-3 bg-[#86EFAC] border-2 border-black rounded-xl font-black text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{generatorAlert}</span>
        </div>
      )}

      {/* =========================================================================
          TAB 1: EEE EXECUTIVE HEALTH & POWER RELIABILITY (OVERVIEW)
      ========================================================================= */}
      {(activeTab === 'overview' || !activeTab) && (
        <div className="space-y-6">
          {/* TOP KPI ROW: 4 EEE-SPECIFIC CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card-brutal p-4 bg-[#DCFCE7] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-zinc-700">EEE Power Uptime</span>
                <span className="text-xs font-mono font-bold text-emerald-800">99.4%</span>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-black text-[#18181B]">50.08 <span className="text-sm font-normal">Hz</span></span>
                <p className="text-[11px] font-bold text-emerald-800 mt-1">Grid Frequency Nominal</p>
              </div>
            </div>

            <div className="card-brutal p-4 bg-[#FEF9C3] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-zinc-700">Active EEE Labs</span>
                <span className="text-xs font-mono font-bold text-amber-800">4 / 4</span>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-black text-[#18181B]">100%</span>
                <p className="text-[11px] font-bold text-amber-900 mt-1">All Test Benches Operational</p>
              </div>
            </div>

            <div className="card-brutal p-4 bg-[#FCE7F3] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-zinc-700">Exam Protection</span>
                <span className="text-xs">🛡️</span>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-black text-[#18181B]">180</span>
                <p className="text-[11px] font-bold text-pink-900 mt-1">EE301 Students Shielded</p>
              </div>
            </div>

            <div className="card-brutal p-4 bg-[#E0F2FE] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-zinc-700">Dept Contingency</span>
                <span className="badge-sticker bg-white text-[9px]">READY</span>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-black text-[#18181B]">₹34,200</span>
                <p className="text-[11px] font-bold text-sky-900 mt-1">Available Emergency Pool</p>
              </div>
            </div>
          </div>

          {/* VISUAL ELECTRICAL LOAD & TELEMETRY CHART */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card-brutal p-5 bg-white space-y-4">
              <div className="flex items-center justify-between pb-3 border-b-2 border-zinc-100">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-black text-sm uppercase text-[#18181B]">
                    EEE Block Phase Power & Load Distribution
                  </h3>
                </div>
                <span className="text-[10px] font-mono bg-zinc-100 px-2 py-0.5 rounded border border-black font-bold">
                  LIVE TELEMETRY
                </span>
              </div>

              {/* Visual Multi-Phase SVG Graph */}
              <div className="h-44 w-full bg-[#FAF9F5] border-2 border-zinc-200 rounded-xl p-3 flex flex-col justify-between relative overflow-hidden">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span>Current Load: 42.4 kW (Nominal Cap: 60 kW)</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block" /> Phase R (230V)</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block" /> Phase Y (228V)</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-sky-500 rounded-full inline-block" /> Phase B (231V)</span>
                  </div>
                </div>

                {/* SVG Curves */}
                <svg className="w-full h-24 overflow-visible" viewBox="0 0 500 100">
                  <path
                    d="M 0,50 Q 70,20 140,55 T 280,45 T 420,30 T 500,40"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                  />
                  <path
                    d="M 0,65 Q 80,40 160,70 T 300,50 T 440,60 T 500,55"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                  />
                  <path
                    d="M 0,40 Q 60,60 130,35 T 260,65 T 400,45 T 500,35"
                    fill="none"
                    stroke="#0ea5e9"
                    strokeWidth="2"
                  />
                </svg>

                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 border-t border-zinc-200 pt-1">
                  <span>18:00</span>
                  <span>19:00</span>
                  <span>20:00</span>
                  <span>21:00 (Trip Incident)</span>
                  <span>21:15 (Relocated)</span>
                  <span>21:45 (Now)</span>
                </div>
              </div>

              {/* Status Note */}
              <div className="p-3 rounded-xl bg-amber-50 border-2 border-amber-300 text-xs text-amber-900 font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" />
                <span>
                  Exam Hall B-204 breaker tripped at 21:00 due to phase spike. Recovery plan executed: 180 students successfully relocated to Library Hall A.
                </span>
              </div>
            </div>

            {/* RIGHT: EEE QUICK ACTION & SUMMARY */}
            <div className="card-brutal p-5 bg-white space-y-4">
              <h3 className="font-black text-sm uppercase text-[#18181B] pb-2 border-b-2 border-zinc-100">
                Departmental Status
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase font-bold">Primary Exam Hall</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-black text-zinc-900">Hall B-204 (200 Cap)</span>
                    <span className="badge-sticker bg-[#FEF9C3] text-[9px]">RELOCATED</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase font-bold">Power Systems Lab</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-black text-zinc-900">Lab A-301 (60 Cap)</span>
                    <span className="badge-sticker bg-[#DCFCE7] text-[9px]">NORMAL</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase font-bold">On-Duty Field Tech</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-black text-zinc-900">Rajesh Kumar (#TK-808)</span>
                    <span className="text-[10px] text-emerald-700 font-bold">En Route</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: EEE ROOMS & LABS STATUS
      ========================================================================= */}
      {activeTab === 'hall-status' && (
        <div className="card-brutal p-6 bg-white space-y-5">
          <div className="flex items-center justify-between pb-3 border-b-2 border-zinc-100">
            <div>
              <h2 className="text-base font-black uppercase text-[#18181B]">
                EEE Department Rooms & Laboratories
              </h2>
              <p className="text-xs text-zinc-600 font-medium">
                Live monitoring of all instructional halls and high-voltage research facilities in B-Wing.
              </p>
            </div>
            <span className="badge-sticker bg-[#7DD3FC] text-black">4 MONITORED</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card-brutal p-4 bg-[#FEF9C3] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-black">Hall B-204</span>
                <span className="badge-sticker bg-red-400 text-black text-[9px]">BREAKER REPAIR</span>
              </div>
              <p className="text-xs text-zinc-700 font-medium">
                200-seat tier amphitheater. Main MCB tripped; student exam currently housed in Library Hall A.
              </p>
              <div className="text-[11px] font-mono text-zinc-600">
                Feeder: Panel E-4 · Status: Under Technician Repair · Backup Fed: Yes
              </div>
            </div>

            <div className="card-brutal p-4 bg-white border-2 border-black space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-black">Lab A-301 (Power Systems)</span>
                <span className="badge-sticker bg-[#86EFAC] text-black text-[9px]">HEALTHY</span>
              </div>
              <p className="text-xs text-zinc-700 font-medium">
                60-workstation simulated transmission line bench & digital relays.
              </p>
              <div className="text-[11px] font-mono text-zinc-600">
                Feeder: Panel E-2 · Voltage: 415V 3-Phase · Relays Calibrated
              </div>
            </div>

            <div className="card-brutal p-4 bg-white border-2 border-black space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-black">Lab A-305 (Microgrid & Solar)</span>
                <span className="badge-sticker bg-[#86EFAC] text-black text-[9px]">HEALTHY</span>
              </div>
              <p className="text-xs text-zinc-700 font-medium">
                45-workstation rooftop solar inverter and battery storage test bay.
              </p>
              <div className="text-[11px] font-mono text-zinc-600">
                Feeder: Panel E-3 · Solar Infeed: 12.8 kW Active · Battery: 94%
              </div>
            </div>

            <div className="card-brutal p-4 bg-white border-2 border-black space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-black">Smart Hall E-102</span>
                <span className="badge-sticker bg-[#86EFAC] text-black text-[9px]">IN USE</span>
              </div>
              <p className="text-xs text-zinc-700 font-medium">
                120-seat interactive lecture theater with dual laser projectors and acoustic baffling.
              </p>
              <div className="text-[11px] font-mono text-zinc-600">
                Lecture Active: EE202 Signals & Systems (Dr. S. Kabilan)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: EEE INCIDENT STREAM
      ========================================================================= */}
      {activeTab === 'dept-tickets' && (
        <div className="card-brutal p-6 bg-white space-y-5">
          <div className="flex items-center justify-between pb-3 border-b-2 border-zinc-100">
            <div>
              <h2 className="text-base font-black uppercase text-[#18181B]">
                EEE Department Disruption Log
              </h2>
              <p className="text-xs text-zinc-600 font-medium">
                All maintenance tickets and failure telemetry filed within Electrical & Electronics.
              </p>
            </div>
            <span className="badge-sticker bg-[#FDE047] text-black">2 ACTIVE</span>
          </div>

          <div className="space-y-3">
            <div className="card-brutal p-4 bg-[#FEF9C3] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="badge-sticker bg-red-400 text-black text-[9px]">P1 CRITICAL</span>
                  <span className="font-black text-xs text-black">INC-01000 · Hall B-204</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-600 font-bold">21:15 TODAY</span>
              </div>
              <p className="text-xs font-black text-black">
                Main 63A circuit breaker tripped before EE301 Midterm Exam
              </p>
              <p className="text-[11px] text-zinc-600">
                Assigned: Rajesh Kumar · Part: MCB-63A-3P · Status: Relocated & Active Repair
              </p>
            </div>

            <div className="card-brutal p-4 bg-white border-2 border-black space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="badge-sticker bg-amber-300 text-black text-[9px]">P3 ROUTINE</span>
                  <span className="font-black text-xs text-black">TKT-879 · Lab A-301</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-600 font-bold">14:00 TODAY</span>
              </div>
              <p className="text-xs font-black text-black">
                Phase-3 voltage fluctuation calibration on motor test bench #4
              </p>
              <p className="text-[11px] text-zinc-600">
                Transformer tap verification scheduled during evening non-instructional hours.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: EXAM CONTINUITY SHIELD
      ========================================================================= */}
      {activeTab === 'exam-protection' && (
        <div className="card-brutal p-6 bg-white space-y-5">
          <div className="flex items-center justify-between pb-3 border-b-2 border-zinc-100">
            <div>
              <h2 className="text-base font-black uppercase text-[#18181B]">
                Academic Continuity & Exam Shield
              </h2>
              <p className="text-xs text-zinc-600 font-medium">
                Deterministic guarantee that no student examination is interrupted or invalidated.
              </p>
            </div>
            <span className="badge-sticker bg-[#86EFAC] text-black">ACTIVE SHIELD</span>
          </div>

          <div className="card-brutal p-5 bg-[#DCFCE7] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-black text-sm text-black">EE301 Power Systems Analysis Mid-Term</span>
              <span className="badge-sticker bg-white text-black text-[9px]">180 REGISTERED</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-black">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block font-bold">Original Hall</span>
                <span className="font-black text-zinc-900">Hall B-204 (Outage)</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-black">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block font-bold">Shield Relocation</span>
                <span className="font-black text-emerald-800">Library Hall A (Confirmed)</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-black">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block font-bold">Proctors Assigned</span>
                <span className="font-black text-zinc-900">Prof. Ananya Sen + 3 Staff</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: FACULTY & PROCTOR ROSTER
      ========================================================================= */}
      {activeTab === 'faculty-roster' && (
        <div className="card-brutal p-6 bg-white space-y-5">
          <div className="flex items-center justify-between pb-3 border-b-2 border-zinc-100">
            <div>
              <h2 className="text-base font-black uppercase text-[#18181B]">
                EEE Department Faculty & Technical Roster
              </h2>
              <p className="text-xs text-zinc-600 font-medium">
                Active academic staff, lab instructors, and emergency invigilation proctors.
              </p>
            </div>
            <span className="badge-sticker bg-[#F472B6] text-black">12 ROSTERED</span>
          </div>

          <div className="divide-y-2 border-2 border-black rounded-xl overflow-hidden bg-white">
            {[
              { name: 'Dr. K. Raman', role: 'Professor & HOD', ext: '#401', office: 'EE-101', status: 'On Duty' },
              { name: 'Prof. Ananya Sen', role: 'Associate Professor', ext: '#405', office: 'EE-204', status: 'Exam Proctor (Library Hall A)' },
              { name: 'Dr. S. Kabilan', role: 'Assistant Professor', ext: '#412', office: 'EE-208', status: 'Lecture (Hall E-102)' },
              { name: 'M. Selvaraj', role: 'Senior Lab Instructor', ext: '#419', office: 'Lab A-301', status: 'Power Lab Standby' },
              { name: 'Dr. Priya Narayanan', role: 'Associate Professor', ext: '#422', office: 'EE-302', status: 'Research Bay' },
            ].map((member, i) => (
              <div key={i} className="p-3.5 flex items-center justify-between hover:bg-zinc-50 text-xs">
                <div>
                  <span className="font-black text-black">{member.name}</span>
                  <p className="text-[11px] text-zinc-500">{member.role} · Office {member.office} · Ext {member.ext}</p>
                </div>
                <span className="badge-sticker bg-zinc-100 border border-black text-[9px] font-bold">
                  {member.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
