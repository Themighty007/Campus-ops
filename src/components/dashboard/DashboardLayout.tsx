'use client';

import React from 'react';
import { Shield, User, Wrench, GraduationCap, Package, ArrowLeft, LogOut, Search, Bell, CheckCircle2 } from 'lucide-react';
import { DEMO_PERSONAS, PersonaId, PersonaProfile } from '@/types/personas';

interface DashboardLayoutProps {
  currentPersona: PersonaProfile;
  onSwitchPersona: (personaId: PersonaId) => void;
  onExitToLanding: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  currentPersona,
  onSwitchPersona,
  onExitToLanding,
  activeTab,
  onSelectTab,
  children,
}) => {
  const personasList = Object.values(DEMO_PERSONAS);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FAF9F5]">
      {/* =========================================================================
          LEFT SIDEBAR DOCK: EXACT MATCH TO SOCIAC & BRUDDLE CRM DASHBOARD IMAGES
          Dark pitch-black brutal sidebar with crisp pastel badges, counters, & navigation
      ========================================================================= */}
      <aside className="w-full md:w-64 bg-[#18181B] text-white flex flex-col justify-between p-4 border-r-2 border-[#18181B] shrink-0">
        <div>
          {/* Brand header */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#FDE047] border-2 border-white flex items-center justify-center font-black text-black shadow-brutal-sm">
                <Shield className="w-5 h-5 text-black stroke-[2.5]" />
              </div>
              <div>
                <span className="font-black text-lg tracking-tight text-white block leading-none">
                  aegis<span className="text-[#F472B6]"> '26</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  CAMPUS CRM
                </span>
              </div>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-[#86EFAC] animate-pulse" title="Grid Active" />
          </div>

          {/* Quick Search */}
          <div className="mt-4 relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search rooms, queries..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FDE047]"
            />
          </div>

          {/* Navigation Links */}
          <div className="mt-5 space-y-1">
            <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 px-2 mb-2 font-bold">
              PORTAL VIEWS
            </p>

            <button
              onClick={() => onSelectTab('overview')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'overview'
                  ? 'bg-[#86EFAC] text-[#18181B] shadow-brutal-sm'
                  : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-sm">📊</span>
                <span>CRM Overview</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                activeTab === 'overview' ? 'bg-[#18181B] text-[#86EFAC]' : 'bg-zinc-800 text-zinc-400'
              }`}>
                LIVE
              </span>
            </button>

            <button
              onClick={() => onSelectTab('queries')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'queries'
                  ? 'bg-[#FDE047] text-[#18181B] shadow-brutal-sm'
                  : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-sm">📋</span>
                <span>Work Orders & Queries</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-zinc-800 text-zinc-400">
                4
              </span>
            </button>

            <button
              onClick={() => onSelectTab('cockpit')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'cockpit'
                  ? 'bg-[#F472B6] text-[#18181B] shadow-brutal-sm'
                  : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-sm">⚡</span>
                <span>Blast Radius Cockpit</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-zinc-800 text-zinc-400">
                AI
              </span>
            </button>

            <button
              onClick={() => onSelectTab('status')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'status'
                  ? 'bg-[#7DD3FC] text-[#18181B] shadow-brutal-sm'
                  : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-sm">🏢</span>
                <span>Campus Rooms & Labs</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-zinc-800 text-zinc-400">
                7 Halls
              </span>
            </button>
          </div>
        </div>

        {/* Bottom Profile & Return to Landing Controls */}
        <div className="pt-4 border-t border-zinc-800 space-y-3">
          {/* Active Persona Mini Card */}
          <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${currentPersona.badgeBg} border border-black flex items-center justify-center text-lg shrink-0`}>
              {currentPersona.avatarEmoji}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-black text-white block truncate">
                {currentPersona.name}
              </span>
              <span className="text-[10px] font-mono text-zinc-400 block truncate">
                {currentPersona.identifier}
              </span>
            </div>
          </div>

          {/* Return to Landing Button */}
          <button
            onClick={onExitToLanding}
            className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-zinc-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Campus Landing</span>
          </button>
        </div>
      </aside>

      {/* =========================================================================
          MAIN CONTENT AREA
      ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* TOP BAR: Role Switcher & Judge Fast-Toggle */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b-2 border-[#18181B] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="badge-sticker bg-[#FEF9C3] text-[#18181B] text-xs font-mono">
              PORTAL: {currentPersona.title.toUpperCase()}
            </span>
            <div className="hidden sm:block text-xs text-zinc-600 font-medium">
              {currentPersona.department}
            </div>
          </div>

          {/* 5-Role 1-Click Fast Switcher for Presentation & Judges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono font-black uppercase text-zinc-500 mr-1 hidden lg:inline">
              SWITCH ROLE:
            </span>

            {personasList.map((p) => {
              const isActive = p.id === currentPersona.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onSwitchPersona(p.id)}
                  className={`px-2.5 py-1 rounded-lg border-2 border-[#18181B] text-[11px] font-black flex items-center gap-1 transition-all ${
                    isActive
                      ? `${p.badgeBg} text-[#18181B] shadow-brutal-sm scale-105`
                      : 'bg-white text-zinc-600 hover:bg-zinc-100 opacity-80 hover:opacity-100'
                  }`}
                  title={`Switch active login to ${p.name} (${p.title})`}
                >
                  <span>{p.avatarEmoji}</span>
                  <span className="hidden sm:inline">{p.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </header>

        {/* Dashboard Main Viewport */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};
