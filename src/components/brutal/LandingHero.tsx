'use client';

import React from 'react';
import { ArrowRight, Sparkles, Shield, Zap, Wrench, CheckCircle2 } from 'lucide-react';

interface LandingHeroProps {
  onOpenStudentLogin: () => void;
  onOpenManagementLogin: () => void;
  onScrollToIncidents: () => void;
  onOpenPersonaDashboard?: (personaId: 'student' | 'teacher' | 'technician' | 'superadmin' | 'inventory') => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onOpenStudentLogin,
  onOpenManagementLogin,
  onScrollToIncidents,
  onOpenPersonaDashboard,
}) => {
  return (
    <section className="relative pt-8 pb-12 px-4 sm:px-6 lg:px-8 overflow-hidden select-none">
      <div className="max-w-[1280px] mx-auto text-center">
        {/* Polished Dual-Track Recovery Header Badge (Removed Hackathon text as requested) */}
        <div className="inline-flex items-center gap-2 mb-5">
          <span className="badge-sticker bg-[#86EFAC] text-[#18181B] text-xs font-black tracking-tight">
            ⚡ DUAL-TRACK CAMPUS RECOVERY ENGINE
          </span>
          <span className="badge-sticker bg-[#FEF9C3] text-[#18181B] text-xs font-mono hidden sm:inline-flex">
            VERIFIED DETERMINISTIC SAFETY · 99.8% UPTIME
          </span>
        </div>

        {/* HERO TITLE: EXACT MATCH TO REFERENCE IMAGE 3
            "VERIFIED CAMPUS RECOVERY, OUT OF THE BOX" */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-[#18181B] tracking-tight leading-[1.08] max-w-5xl mx-auto uppercase">
          Verified Campus Recovery,{' '}
          <span className="relative inline-block mt-1 sm:mt-0">
            {/* Pink Marker Highlighter Stroke Box from Image 3 */}
            <span className="absolute inset-0 bg-[#F472B6]/30 border-2 border-[#F472B6] -rotate-1 rounded-sm -skew-x-2 -z-0 translate-y-1 scale-105" />
            <span className="relative z-10 px-2 py-0.5 text-[#18181B]">
              Out of the Box
            </span>
          </span>
        </h1>

        {/* Operational Status Subtitle from Image 3 */}
        <p className="mt-4 text-xs sm:text-sm font-mono font-extrabold tracking-widest text-zinc-600 uppercase">
          Protect the Activity · Repair the Cause · Prove Every Decision
        </p>

        {/* DUAL ACTION BUTTONS: Launch Portals with direct access */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onOpenStudentLogin}
            className="btn-brutal-yellow px-6 sm:px-8 py-3.5 text-sm sm:text-base font-black flex items-center gap-2 tracking-tight shadow-brutal hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
          >
            <span>🎓 STUDENT / FACULTY PORTAL</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>

          <button
            onClick={onOpenManagementLogin}
            className="btn-brutal-green px-6 sm:px-8 py-3.5 text-sm sm:text-base font-black flex items-center gap-2 tracking-tight shadow-brutal hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
          >
            <span>🛡️ MANAGEMENT COCKPIT</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* =========================================================================
            CASSETTE / VHS TAPE EQUALIZER GRAPHIC: EXACT RECREATION OF REFERENCE IMAGE 3
            Cleaned up: Removed smiley emoji as requested; removed horizontal scrollbar!
        ========================================================================= */}
        <div className="relative mt-12 max-w-4xl mx-auto pt-6">
          {/* Polished Neo-Brutalist Sticker Badge (Emoji removed per user request) */}
          <div className="absolute -top-3 left-4 sm:left-12 z-20 hidden sm:flex items-center justify-center">
            <div className="relative w-18 h-18 rounded-full bg-[#FDE047] border-[2.5px] border-[#18181B] shadow-brutal flex flex-col items-center justify-center rotate-[-10deg] hover:rotate-0 transition-transform">
              <Shield className="w-5 h-5 text-[#18181B] stroke-[2.5]" />
              <span className="text-[7.5px] font-black uppercase text-center mt-0.5 leading-tight tracking-tighter">
                PROTECT<br />FIRST
              </span>
            </div>
          </div>

          {/* Giant pink exclamation mark sticker from Image 3 */}
          <div className="absolute -top-6 right-8 sm:right-16 z-20 hidden sm:flex flex-col items-center rotate-[8deg]">
            <div className="w-7 h-14 bg-[#F472B6] border-[2.5px] border-[#18181B] rounded-full shadow-brutal flex items-center justify-center">
              <span className="text-white font-black text-2xl">!</span>
            </div>
            <div className="w-4 h-4 bg-[#F472B6] border-[2.5px] border-[#18181B] rounded-full shadow-brutal mt-1" />
          </div>

          {/* The 7 Cassettes Container — strictly overflow-hidden, NO horizontal scrollbar! */}
          <div className="flex items-end justify-center gap-2.5 sm:gap-4 px-2 pb-0 overflow-hidden">
            {/* Cassette 1: Sky Blue, Tilted -6deg */}
            <div className="w-12 sm:w-20 h-44 sm:h-64 bg-[#E0F2FE] border-[2.5px] border-[#18181B] rounded-sm shadow-brutal flex flex-col justify-between p-1.5 sm:p-2 rotate-[-6deg] origin-bottom-right shrink-0">
              <div className="text-[8px] sm:text-[9px] font-mono font-bold text-center border-b border-black/40 pb-1">
                HALL B-204
              </div>
              <div className="text-center my-auto">
                <span className="text-sm sm:text-base">⚡</span>
                <p className="text-[7px] sm:text-[8px] font-mono font-black mt-0.5 text-red-600">TRIPPED</p>
              </div>
              <div className="border-t border-black/40 pt-1 text-[7px] sm:text-[8px] font-mono text-center">
                120 EXAM
              </div>
            </div>

            {/* Cassette 2: Pink */}
            <div className="w-12 sm:w-20 h-36 sm:h-52 bg-[#FCE7F3] border-[2.5px] border-[#18181B] rounded-sm shadow-brutal flex flex-col justify-between p-1.5 sm:p-2 shrink-0">
              <div className="text-[8px] sm:text-[9px] font-mono font-bold text-center border-b border-black/40 pb-1">
                LAB A-301
              </div>
              <div className="text-center my-auto">
                <span className="text-xs sm:text-sm text-pink-600 font-bold">✴</span>
                <p className="text-[7px] sm:text-[8px] font-mono font-bold mt-0.5">CS LAB</p>
              </div>
              <div className="border-t border-black/40 pt-1 text-[7px] sm:text-[8px] font-mono text-center">
                60 SEATS
              </div>
            </div>

            {/* Cassette 3: Lime Green */}
            <div className="w-12 sm:w-20 h-48 sm:h-68 bg-[#DCFCE7] border-[2.5px] border-[#18181B] rounded-sm shadow-brutal flex flex-col justify-between p-1.5 sm:p-2 shrink-0">
              <div className="text-[8px] sm:text-[9px] font-mono font-bold text-center border-b border-black/40 pb-1">
                AUD-WEST
              </div>
              <div className="text-center my-auto">
                <span className="text-xs sm:text-sm">✳</span>
                <p className="text-[7px] sm:text-[8px] font-mono font-bold text-emerald-700 mt-0.5">FREE</p>
              </div>
              <div className="border-t border-black/40 pt-1 text-[7px] sm:text-[8px] font-mono text-center">
                150 CAP
              </div>
            </div>

            {/* Cassette 4: Center White, Taller (AEGIS '26 The Core Story) */}
            <div className="w-14 sm:w-24 h-56 sm:h-80 bg-white border-[3px] border-[#18181B] rounded-sm shadow-brutal-lg flex flex-col justify-between p-2 sm:p-2.5 shrink-0 z-10">
              <div className="text-[9px] sm:text-[10px] font-mono font-black text-center border-b-2 border-black pb-1">
                AEGIS '26
              </div>
              <div className="text-center my-auto py-1 sm:py-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto bg-[#FDE047] border-2 border-black rounded-lg flex items-center justify-center shadow-brutal-sm mb-1 sm:mb-2">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-black stroke-[2.5]" />
                </div>
                <span className="text-[8px] sm:text-[10px] font-mono font-black uppercase text-black block">
                  THE ENGINE
                </span>
                <span className="text-[7px] sm:text-[8px] font-mono text-zinc-500">
                  DETERMINISTIC
                </span>
              </div>
              <div className="border-t-2 border-black pt-1 bg-[#FEF9C3] -mx-2 -mb-2 sm:-mx-2.5 sm:-mb-2.5 p-1 text-[7px] sm:text-[8px] font-mono font-black text-center">
                DUAL-TRACK 00
              </div>
            </div>

            {/* Cassette 5: Lime Green */}
            <div className="w-12 sm:w-20 h-48 sm:h-68 bg-[#DCFCE7] border-[2.5px] border-[#18181B] rounded-sm shadow-brutal flex flex-col justify-between p-1.5 sm:p-2 shrink-0">
              <div className="text-[8px] sm:text-[9px] font-mono font-bold text-center border-b border-black/40 pb-1">
                MECH GND
              </div>
              <div className="text-center my-auto">
                <span className="text-xs sm:text-sm">✳</span>
                <p className="text-[7px] sm:text-[8px] font-mono font-bold text-emerald-700 mt-0.5">ONLINE</p>
              </div>
              <div className="border-t border-black/40 pt-1 text-[7px] sm:text-[8px] font-mono text-center">
                100 CAP
              </div>
            </div>

            {/* Cassette 6: Pink */}
            <div className="w-12 sm:w-20 h-40 sm:h-60 bg-[#FCE7F3] border-[2.5px] border-[#18181B] rounded-sm shadow-brutal flex flex-col justify-between p-1.5 sm:p-2 shrink-0">
              <div className="text-[8px] sm:text-[9px] font-mono font-bold text-center border-b border-black/40 pb-1">
                SERVER C-1
              </div>
              <div className="text-center my-auto">
                <span className="text-xs sm:text-sm text-pink-600 font-bold">✴</span>
                <p className="text-[7px] sm:text-[8px] font-mono font-bold mt-0.5">UPS OK</p>
              </div>
              <div className="border-t border-black/40 pt-1 text-[7px] sm:text-[8px] font-mono text-center">
                40 KVA
              </div>
            </div>

            {/* Cassette 7: Sky Blue */}
            <div className="w-12 sm:w-20 h-44 sm:h-64 bg-[#E0F2FE] border-[2.5px] border-[#18181B] rounded-sm shadow-brutal flex flex-col justify-between p-1.5 sm:p-2 shrink-0">
              <div className="text-[8px] sm:text-[9px] font-mono font-bold text-center border-b border-black/40 pb-1">
                STORES
              </div>
              <div className="text-center my-auto">
                <span className="text-xs sm:text-sm">📦</span>
                <p className="text-[7px] sm:text-[8px] font-mono font-bold mt-0.5">PARTS</p>
              </div>
              <div className="border-t border-black/40 pt-1 text-[7px] sm:text-[8px] font-mono text-center">
                24 IN STOCK
              </div>
            </div>
          </div>

          {/* Thick Ground Line from Image 3 */}
          <div className="w-full h-2.5 bg-[#18181B] rounded-full mt-0" />
        </div>

        {/* =========================================================================
            DEMO DESCRIPTIONS AREA (Added per user request)
            High-impact Dual-Track breakdown explaining Track 1 vs Track 2
        ========================================================================= */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
          {/* Track 1 Card: Academic Continuity */}
          <div className="card-brutal p-5 bg-[#DCFCE7] relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 rounded-lg bg-[#86EFAC] border-2 border-[#18181B] flex items-center justify-center font-black text-xs shadow-brutal-sm">
                ⚡
              </span>
              <span className="badge-sticker bg-white text-[#18181B] text-[10px]">TRACK 1</span>
              <h3 className="font-black text-[#18181B] text-sm uppercase">Academic Activity Continuity</h3>
            </div>
            <p className="text-xs text-zinc-700 leading-relaxed font-medium">
              Protects students and faculty when critical infrastructure fails. Aegis runs 4 deterministic checks (Capacity, Scheduling, Deadlines, and Invigilator ratios) to execute guaranteed room relocations in under 12 minutes—with zero exam cancellations.
            </p>
            <div className="mt-3 pt-2 border-t border-[#18181B]/20 flex items-center justify-between text-[11px] font-mono font-bold text-emerald-900">
              <span>Goal: Zero Lost Teaching Hours</span>
              <span className="bg-white px-2 py-0.5 rounded border border-black text-[10px]">VERIFIED PASS</span>
            </div>
          </div>

          {/* Track 2 Card: Physical Asset Resolution */}
          <div className="card-brutal p-5 bg-[#FEF9C3] relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 rounded-lg bg-[#FDE047] border-2 border-[#18181B] flex items-center justify-center font-black text-xs shadow-brutal-sm">
                🔧
              </span>
              <span className="badge-sticker bg-white text-[#18181B] text-[10px]">TRACK 2</span>
              <h3 className="font-black text-[#18181B] text-sm uppercase">Physical Asset Resolution</h3>
            </div>
            <p className="text-xs text-zinc-700 leading-relaxed font-medium">
              Concurrently dispatches certified technicians, checks live inventory stock, reserves replacement parts, and enforces photographic evidence before closing work orders—never blocking academic schedules.
            </p>
            <div className="mt-3 pt-2 border-t border-[#18181B]/20 flex items-center justify-between text-[11px] font-mono font-bold text-amber-900">
              <span>Goal: Zero Stale Work Orders</span>
              <span className="bg-white px-2 py-0.5 rounded border border-black text-[10px]">IMMUTABLE AUDIT</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
