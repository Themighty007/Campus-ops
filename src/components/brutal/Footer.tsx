'use client';

import React from 'react';
import { Shield, ArrowRight, Heart } from 'lucide-react';

export const BrutalFooter: React.FC = () => {
  return (
    <footer className="w-full bg-[#0A0A0A] bg-grid-dark text-white border-t-[3px] border-[#18181B] pt-14 pb-10 px-4 sm:px-6 lg:px-8 mt-16 select-none">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Column: Brand & Tagline */}
        <div className="md:col-span-4 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FDE047] border-2 border-white flex items-center justify-center">
              <Shield className="w-4 h-4 text-black stroke-[3]" />
            </div>
            <span className="text-xl font-black tracking-tight text-white uppercase">
              aegis <span className="text-[#F472B6]">'26</span>
            </span>
          </div>

          <p className="text-xs text-zinc-400 font-mono leading-relaxed max-w-sm">
            Intelligent campus operations platform. Dual-track recovery protecting human activity while physical repair proceeds in parallel.
          </p>

          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 pt-2">
            <span>SHIV NADAR UNIVERSITY CHENNAI</span>
            <span>·</span>
            <span>HACKATHON PS2</span>
          </div>
        </div>

        {/* Center Columns: Links matching Reference Image 2 */}
        <div className="md:col-span-5 grid grid-cols-3 gap-6 text-xs font-mono">
          {/* Col 1 */}
          <div>
            <span className="text-[11px] font-black uppercase text-white block mb-3 border-b border-zinc-800 pb-1">
              RECOVERY
            </span>
            <ul className="space-y-2 text-zinc-400">
              <li className="hover:text-white cursor-pointer transition-colors">Blast Radius</li>
              <li className="hover:text-white cursor-pointer transition-colors">Two Clocks</li>
              <li className="hover:text-white cursor-pointer transition-colors">Deterministic Plans</li>
              <li className="hover:text-white cursor-pointer transition-colors">SoD Governance</li>
            </ul>
          </div>

          {/* Col 2 */}
          <div>
            <span className="text-[11px] font-black uppercase text-white block mb-3 border-b border-zinc-800 pb-1">
              HUBS
            </span>
            <ul className="space-y-2 text-zinc-400">
              <li className="hover:text-white cursor-pointer transition-colors">Hall B-204</li>
              <li className="hover:text-white cursor-pointer transition-colors">Lab A-301</li>
              <li className="hover:text-white cursor-pointer transition-colors">Auditorium West</li>
              <li className="hover:text-white cursor-pointer transition-colors">Central Stores</li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <span className="text-[11px] font-black uppercase text-white block mb-3 border-b border-zinc-800 pb-1">
              OPS DESK
            </span>
            <ul className="space-y-2 text-zinc-400">
              <li className="hover:text-white cursor-pointer transition-colors">BMS Webhook</li>
              <li className="hover:text-white cursor-pointer transition-colors">WhatsApp Alerts</li>
              <li className="hover:text-white cursor-pointer transition-colors">SLA Escalation</li>
              <li className="hover:text-white cursor-pointer transition-colors">Demo Reset</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Pixel Art Graphic Poster matching Reference Image 2 */}
        <div className="md:col-span-3 flex justify-start md:justify-end">
          <div className="w-48 bg-white border-2 border-white p-2.5 rounded-xl shadow-[4px_4px_0px_#FFFFFF] text-black">
            <div className="h-40 bg-[#FAF9F5] border-2 border-black rounded-lg flex flex-col items-center justify-center p-3 text-center">
              <div className="text-4xl mb-2">💡</div>
              <span className="text-[10px] font-mono font-black uppercase tracking-tight block">
                AEGIS VERIFIED
              </span>
              <span className="text-[9px] font-mono text-zinc-500 block mt-0.5">
                0 HALTED EXAMS
              </span>
              <div className="mt-3 px-2 py-0.5 bg-[#86EFAC] border border-black rounded text-[8px] font-black">
                100% AUDIT PROOF
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-[1400px] mx-auto border-t border-zinc-900 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-zinc-600">
        <p>© 2026 Aegis Campus Operations. Built for Hackathon PS2.</p>
        <p className="flex items-center gap-1">
          Crafted with Neo-Brutalist discipline for <span className="text-[#F472B6] font-bold">Invente '26</span>
        </p>
      </div>
    </footer>
  );
};
