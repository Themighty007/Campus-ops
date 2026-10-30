'use client';

import React from 'react';
import { ArrowRight, Sparkles, AlertCircle, Shield } from 'lucide-react';

interface LandingHeroProps {
  onOpenStudentLogin: () => void;
  onOpenManagementLogin: () => void;
  onScrollToIncidents: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onOpenStudentLogin,
  onOpenManagementLogin,
  onScrollToIncidents,
}) => {
  return (
    <section className="relative pt-10 pb-8 px-4 sm:px-6 lg:px-8 overflow-hidden select-none">
      <div className="max-w-[1280px] mx-auto text-center">
        {/* Top Floating Badge */}
        <div className="inline-flex items-center gap-2 mb-6">
          <span className="badge-sticker bg-[#FEF9C3] text-[#18181B] text-xs">
            HACKATHON PS2 · INTELLIGENT CAMPUS OPERATIONS
          </span>
          <span className="badge-sticker bg-[#86EFAC] text-[#18181B] text-xs hidden sm:inline-flex">
            DUAL-TRACK RECOVERY
          </span>
        </div>

        {/* HERO TITLE: EXACT MATCH TO REFERENCE IMAGE 3
            "A GIANT LEAP, OUT OF THE BOX" -> "VERIFIED CAMPUS RECOVERY, OUT OF THE BOX" */}
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

        {/* Date / Operational Status Subtitle from Image 3 */}
        <p className="mt-4 text-xs sm:text-sm font-mono font-extrabold tracking-widest text-zinc-600 uppercase">
          Protect the Activity · Repair the Cause · Prove Every Decision
        </p>

        {/* DUAL ACTION BUTTONS: EXACT MATCH TO REFERENCE IMAGE 3
            [ CAMPUS MAP -> ] and [ EVENTS -> ] */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onOpenStudentLogin}
            className="btn-brutal-green px-6 sm:px-8 py-3 text-sm sm:text-base font-black flex items-center gap-2 tracking-tight"
          >
            <span>STUDENT / FACULTY PORTAL</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>

          <button
            onClick={onOpenManagementLogin}
            className="btn-brutal-pink px-6 sm:px-8 py-3 text-sm sm:text-base font-black flex items-center gap-2 tracking-tight"
          >
            <span>MANAGEMENT COCKPIT</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* =========================================================================
            CASSETTE / VHS TAPE EQUALIZER GRAPHIC: EXACT RECREATION OF REFERENCE IMAGE 3
            7 colorful cassettes lined up along a thick ground line, with the tilted tape,
            smiley badge sticker, pink exclamation mark, and sunburst badges!
        ========================================================================= */}
        <div className="relative mt-14 max-w-4xl mx-auto pt-8">
          {/* Smiley sticker badge from Image 3 */}
          <div className="absolute -top-4 left-4 sm:left-12 z-20 hidden sm:flex items-center justify-center">
            <div className="relative w-20 h-20 rounded-full bg-[#FDE047] border-[2.5px] border-[#18181B] shadow-brutal flex flex-col items-center justify-center rotate-[-12deg] hover:rotate-0 transition-transform cursor-pointer">
              <span className="text-2xl leading-none">😊</span>
              <span className="text-[7.5px] font-black uppercase text-center mt-1 leading-tight tracking-tighter">
                PROTECT<br />FIRST
              </span>
            </div>
          </div>

          {/* Giant pink exclamation mark sticker from Image 3 */}
          <div className="absolute -top-6 right-8 sm:right-16 z-20 hidden sm:flex flex-col items-center rotate-[8deg]">
            <div className="w-8 h-16 bg-[#F472B6] border-[2.5px] border-[#18181B] rounded-full shadow-brutal flex items-center justify-center">
              <span className="text-white font-black text-3xl">!</span>
            </div>
            <div className="w-5 h-5 bg-[#F472B6] border-[2.5px] border-[#18181B] rounded-full shadow-brutal mt-1.5" />
          </div>

          {/* The 7 Cassettes Container */}
          <div className="flex items-end justify-center gap-3 sm:gap-4 px-4 pb-0 overflow-x-auto">
            {/* Cassette 1: Sky Blue, Tilted -6deg (matching Image 3) */}
            <div className="w-14 sm:w-20 h-52 sm:h-64 bg-[#E0F2FE] border-[2.5px] border-[#18181B] rounded-sm shadow-brutal flex flex-col justify-between p-2 rotate-[-6deg] origin-bottom-right shrink-0">
              <div className="text-[9px] font-mono font-bold text-center border-b border-black/40 pb-1">
                HALL B-204
              </div>
              <div className="text-center my-auto">
                <span className="text-lg">⚡</span>
                <p className="text-[8px] font-mono font-black mt-1 text-red-600">TRIPPED</p>
              </div>
              <div className="border-t border-black/40 pt-1 text-[8px] font-mono text-center">
                120 EXAM
              </div>
            </div>

            {/* Cassette 2: Pink */}
            <div className="w-14 sm:w-20 h-44 sm:h-52 bg-[#FCE7F3] border-[2.5px] border-[#18181B] rounded-sm shadow-brutal flex flex-col justify-between p-2 shrink-0">
              <div className="text-[9px] font-mono font-bold text-center border-b border-black/40 pb-1">
                LAB A-301
              </div>
              <div className="text-center my-auto">
                <span className="text-base text-pink-600 font-bold">✴</span>
                <p className="text-[8px] font-mono font-bold mt-1">CS LAB</p>
              </div>
              <div className="border-t border-black/40 pt-1 text-[8px] font-mono text-center">
                60 SEATS
              </div>
            </div>

            {/* Cassette 3: Lime Green */}
            <div className="w-14 sm:w-20 h-56 sm:h-68 bg-[#DCFCE7] border-[2.5px] border-[#18181B] rounded-sm shadow-brutal flex flex-col justify-between p-2 shrink-0">
              <div className="text-[9px] font-mono font-bold text-center border-b border-black/40 pb-1">
                AUD-WEST
              </div>
              <div className="text-center my-auto">
                <span className="text-base">✳</span>
                <p className="text-[8px] font-mono font-bold text-emerald-700 mt-1">FREE</p>
              </div>
              <div className="border-t border-black/40 pt-1 text-[8px] font-mono text-center">
                150 CAP
              </div>
            </div>

            {/* Cassette 4: Center White, Taller (AEGIS '26 The Core Story from Image 3) */}
            <div className="w-16 sm:w-24 h-64 sm:h-80 bg-white border-[3px] border-[#18181B] rounded-sm shadow-brutal-lg flex flex-col justify-between p-2.5 shrink-0 z-10">
              <div className="text-[10px] font-mono font-black text-center border-b-2 border-black pb-1">
                AEGIS '26
              </div>
              <div className="text-center my-auto py-2">
                <div className="w-10 h-10 mx-auto bg-[#FDE047] border-2 border-black rounded-lg flex items-center justify-center shadow-brutal-sm mb-2">
                  <Shield className="w-5 h-5 text-black stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-mono font-black uppercase text-black block">
                  THE ENGINE
                </span>
                <span className="text-[8px] font-mono text-zinc-500">
                  DETERMINISTIC
                </span>
              </div>
              <div className="border-t-2 border-black pt-1 bg-[#FEF9C3] -mx-2.5 -mb-2.5 p-1 text-[8px] font-mono font-black text-center">
                DUAL-TRACK 00
              </div>
            </div>

            {/* Cassette 5: Lime Green */}
            <div className="w-14 sm:w-20 h-56 sm:h-68 bg-[#DCFCE7] border-[2.5px] border-[#18181B] rounded-sm shadow-brutal flex flex-col justify-between p-2 shrink-0">
              <div className="text-[9px] font-mono font-bold text-center border-b border-black/40 pb-1">
                MECH GND
              </div>
              <div className="text-center my-auto">
                <span className="text-base">✳</span>
                <p className="text-[8px] font-mono font-bold text-emerald-700 mt-1">ONLINE</p>
              </div>
              <div className="border-t border-black/40 pt-1 text-[8px] font-mono text-center">
                100 CAP
              </div>
            </div>

            {/* Cassette 6: Pink */}
            <div className="w-14 sm:w-20 h-48 sm:h-60 bg-[#FCE7F3] border-[2.5px] border-[#18181B] rounded-sm shadow-brutal flex flex-col justify-between p-2 shrink-0">
              <div className="text-[9px] font-mono font-bold text-center border-b border-black/40 pb-1">
                SERVER C-1
              </div>
              <div className="text-center my-auto">
                <span className="text-base text-pink-600 font-bold">✴</span>
                <p className="text-[8px] font-mono font-bold mt-1">UPS OK</p>
              </div>
              <div className="border-t border-black/40 pt-1 text-[8px] font-mono text-center">
                40 KVA
              </div>
            </div>

            {/* Cassette 7: Sky Blue */}
            <div className="w-14 sm:w-20 h-52 sm:h-64 bg-[#E0F2FE] border-[2.5px] border-[#18181B] rounded-sm shadow-brutal flex flex-col justify-between p-2 shrink-0">
              <div className="text-[9px] font-mono font-bold text-center border-b border-black/40 pb-1">
                STORES
              </div>
              <div className="text-center my-auto">
                <span className="text-base">📦</span>
                <p className="text-[8px] font-mono font-bold mt-1">PARTS</p>
              </div>
              <div className="border-t border-black/40 pt-1 text-[8px] font-mono text-center">
                24 IN STOCK
              </div>
            </div>
          </div>

          {/* Thick Ground Line from Image 3 */}
          <div className="w-full h-2.5 bg-[#18181B] rounded-full mt-0" />
        </div>
      </div>
    </section>
  );
};
