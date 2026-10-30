'use client';

import React from 'react';
import { Shield, User, Wrench, Plus, RotateCcw, AlertTriangle } from 'lucide-react';
import type { UserRole } from '@/lib/domain/enums';

interface NavbarProps {
  currentRole: UserRole;
  onOpenLogin: (subdivision: 'student' | 'management') => void;
  onOpenReport: () => void;
  onResetDemo: () => void;
  onOpenChaos: () => void;
  activeCount: number;
}

export const BrutalNavbar: React.FC<NavbarProps> = ({
  currentRole,
  onOpenLogin,
  onOpenReport,
  onResetDemo,
  onOpenChaos,
  activeCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F5]/90 backdrop-blur-sm border-b-2 border-[#18181B] px-4 lg:px-8 py-3.5">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo & Name matching Reference Image 1 & 3 */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FDE047] border-2 border-[#18181B] rounded-xl flex items-center justify-center shadow-brutal-sm">
            <Shield className="w-5 h-5 text-[#18181B] stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-[#18181B]">
                aegis<span className="text-[#F472B6]"> '26</span>
              </span>
              <span className="badge-sticker bg-[#86EFAC] text-[#18181B] text-[10px]">
                LIVE GRID
              </span>
            </div>
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider hidden sm:block">
              Verified Campus Recovery
            </p>
          </div>
        </div>

        {/* Center / Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Disruption Pill */}
          <div
            onClick={onOpenChaos}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white border-2 border-[#18181B] rounded-lg shadow-brutal-sm cursor-pointer hover:bg-zinc-50"
            title="Active disruptions needing recovery"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] animate-ping" />
            <span className="text-xs font-bold text-[#18181B] font-mono">
              {activeCount} AT RISK
            </span>
          </div>

          {/* Quick Report Button */}
          <button
            onClick={onOpenReport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FDA4AF] border-2 border-[#18181B] rounded-lg text-xs font-extrabold text-[#18181B] shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] transition-transform"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span className="hidden sm:inline">REPORT</span>
          </button>

          {/* TWO MAIN LOGIN PORTALS REQUESTED BY USER */}
          <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l-2 border-[#18181B]/20">
            {/* 1. Student / Requester Portal */}
            <button
              onClick={() => onOpenLogin('student')}
              className="btn-brutal-yellow px-3 sm:px-4 py-1.5 text-xs font-extrabold flex items-center gap-1.5 uppercase tracking-tight"
            >
              <User className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Student / Faculty</span>
            </button>

            {/* 2. Management Portal */}
            <button
              onClick={() => onOpenLogin('management')}
              className="btn-brutal-green px-3 sm:px-4 py-1.5 text-xs font-extrabold flex items-center gap-1.5 uppercase tracking-tight"
            >
              <Wrench className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Management</span>
            </button>
          </div>

          {/* Reset Demo Button */}
          <button
            onClick={onResetDemo}
            className="p-1.5 bg-white border-2 border-[#18181B] rounded-lg shadow-brutal-sm hover:bg-zinc-100 transition-colors"
            title="Reset Campus Demo State"
          >
            <RotateCcw className="w-4 h-4 text-[#18181B]" />
          </button>
        </div>
      </div>
    </header>
  );
};
