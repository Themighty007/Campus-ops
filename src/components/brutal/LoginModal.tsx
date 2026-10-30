'use client';

import React, { useState } from 'react';
import { X, User, Shield, Wrench, GraduationCap, CheckCircle2, ArrowRight, Lock, Key } from 'lucide-react';
import type { UserRole } from '@/lib/domain/enums';
import type { PersonaId } from '@/types/personas';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSubdivision?: 'student' | 'management';
  currentRole: UserRole;
  onSelectRole: (role: UserRole, personaId?: PersonaId) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  defaultSubdivision = 'student',
  currentRole,
  onSelectRole,
}) => {
  const [subdivision, setSubdivision] = useState<'student' | 'management'>(defaultSubdivision);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPersona = (role: UserRole, label: string, personaId?: PersonaId) => {
    setFeedback(`Opening CRM Portal for ${label}...`);
    setTimeout(() => {
      onSelectRole(role, personaId);
      setFeedback(null);
      onClose();
    }, 400);
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (subdivision === 'student') {
      handleSelectPersona('REQUESTER', 'Student (Aarav Patel)', 'student');
    } else {
      handleSelectPersona('FACILITIES_ADMIN', 'Super Admin (Chief Controller)', 'superadmin');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-[#FAF9F5] border-[3px] border-[#18181B] rounded-2xl shadow-brutal-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Yellow corner pin from Reference Image 1 */}
        <div className="pin-circle-yellow" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b-2 border-[#18181B]">
          <div className="flex items-center gap-2">
            <span className="badge-sticker bg-[#FDE047] text-[#18181B]">PORTAL ACCESS</span>
            <span className="text-sm font-extrabold text-[#18181B]">AEGIS IDENTITY GATE</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 border-2 border-[#18181B] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-[#18181B]" />
          </button>
        </div>

        {/* TWO TOP SUBDIVISIONS REQUESTED BY USER */}
        <div className="grid grid-cols-2 p-3 bg-zinc-100 border-b-2 border-[#18181B] gap-2">
          {/* Subdivision A: Student / Requester */}
          <button
            onClick={() => { setSubdivision('student'); setFeedback(null); }}
            className={`py-3 px-4 rounded-xl border-2 border-[#18181B] font-extrabold text-xs uppercase tracking-tight flex items-center justify-center gap-2 transition-all ${
              subdivision === 'student'
                ? 'bg-[#FDE047] text-[#18181B] shadow-brutal'
                : 'bg-white text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            <GraduationCap className="w-4 h-4 stroke-[2.5]" />
            <span>(A) Student / Faculty</span>
          </button>

          {/* Subdivision B: Management */}
          <button
            onClick={() => { setSubdivision('management'); setFeedback(null); }}
            className={`py-3 px-4 rounded-xl border-2 border-[#18181B] font-extrabold text-xs uppercase tracking-tight flex items-center justify-center gap-2 transition-all ${
              subdivision === 'management'
                ? 'bg-[#86EFAC] text-[#18181B] shadow-brutal'
                : 'bg-white text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            <Shield className="w-4 h-4 stroke-[2.5]" />
            <span>(B) Management</span>
          </button>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div className="px-6 py-2.5 bg-[#86EFAC] text-[#18181B] font-extrabold text-xs border-b-2 border-[#18181B] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedback}</span>
          </div>
        )}

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* SUBDIVISION CONTENT */}
          {subdivision === 'student' ? (
            /* =========================================================================
               SUBDIVISION A: STUDENT / REQUESTER / FACULTY
            ========================================================================= */
            <div className="space-y-5">
              <div>
                <span className="badge-sticker bg-[#FEF9C3] text-amber-900 mb-1">
                  STUDENTS & TEACHERS
                </span>
                <h3 className="text-lg font-black text-[#18181B] tracking-tight">
                  Student & Faculty Gate
                </h3>
                <p className="text-xs text-zinc-600 font-medium mt-0.5">
                  Access your personalized CRM dashboard, track query receipts, or review classroom continuity.
                </p>
              </div>

              {/* 1-Click Persona Quick Select (Instant Judge Login) */}
              <div className="space-y-2.5">
                <p className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
                  Instant Judge Personas (1-Click Launch)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Persona 1: Student */}
                  <div
                    onClick={() => handleSelectPersona('REQUESTER', 'Aarav Patel (Student)', 'student')}
                    className={`card-brutal p-3.5 bg-white cursor-pointer hover:bg-yellow-50/50 transition-all ${
                      currentRole === 'REQUESTER' ? 'ring-2 ring-[#FDE047] ring-offset-2' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#FEF9C3] border-2 border-[#18181B] flex items-center justify-center font-black text-sm">
                        🎓
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-[#18181B]">Aarav Patel</span>
                          <span className="badge-sticker bg-[#FEF9C3] text-[9px] py-0 px-1.5">STUDENT</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 font-mono">Roll #22CS045 · CSE</p>
                        <p className="text-[10px] text-emerald-700 font-bold mt-1">✓ Launch Student CRM</p>
                      </div>
                    </div>
                  </div>

                  {/* Persona 2: Faculty */}
                  <div
                    onClick={() => handleSelectPersona('DEPARTMENT_MANAGER', 'Dr. K. Raman (Faculty HOD)', 'teacher')}
                    className={`card-brutal p-3.5 bg-white cursor-pointer hover:bg-yellow-50/50 transition-all ${
                      currentRole === 'DEPARTMENT_MANAGER' ? 'ring-2 ring-[#FDE047] ring-offset-2' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#E0F2FE] border-2 border-[#18181B] flex items-center justify-center font-black text-sm">
                        👨‍🏫
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-[#18181B]">Dr. K. Raman</span>
                          <span className="badge-sticker bg-[#E0F2FE] text-[9px] py-0 px-1.5">FACULTY</span>
                        </div>
                        <p className="text-[11px] text-zinc-500 font-mono">HOD Electrical Eng</p>
                        <p className="text-[10px] text-blue-700 font-bold mt-1">✓ Launch Teacher CRM</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real Credentials / SSO Form */}
              <div className="pt-2 border-t-2 border-[#18181B]/10">
                <form onSubmit={handleManualLogin} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-black uppercase text-zinc-600 mb-1">
                      Campus Student / Faculty Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@ssn.edu.in or srigowv@gmail.com"
                      className="w-full px-3 py-2 text-xs input-brutal"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-zinc-600 mb-1">
                      Password / OTP
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 text-xs input-brutal"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 btn-brutal-yellow text-xs font-black flex items-center justify-center gap-2 uppercase tracking-wide"
                  >
                    <span>Log In to Student / Faculty CRM</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </button>
                </form>

                {/* University SSO Button */}
                <button
                  onClick={() => handleSelectPersona('REQUESTER', 'Aarav Patel (SSO)', 'student')}
                  className="w-full mt-2.5 py-2 btn-brutal-outline text-xs font-black flex items-center justify-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Sign in with Shiv Nadar / SSN Eduroam SSO</span>
                </button>
              </div>
            </div>
          ) : (
            /* =========================================================================
               SUBDIVISION B: MANAGEMENT (TECHNICIANS, SUPER ADMIN, IN-CHARGE)
            ========================================================================= */
            <div className="space-y-5">
              <div>
                <span className="badge-sticker bg-[#DCFCE7] text-emerald-900 mb-1">
                  FACILITIES & CONTROLLERS
                </span>
                <h3 className="text-lg font-black text-[#18181B] tracking-tight">
                  Management & Operations Gate
                </h3>
                <p className="text-xs text-zinc-600 font-medium mt-0.5">
                  Execute repairs, update stages, inspect AI decision proofs, and manage inventory requisitions.
                </p>
              </div>

              {/* 1-Click Persona Quick Select */}
              <div className="space-y-2.5">
                <p className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
                  Instant Judge Personas (1-Click Launch)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Persona 1: Technician */}
                  <div
                    onClick={() => handleSelectPersona('TECHNICIAN', 'Rajesh Kumar (Technician)', 'technician')}
                    className={`card-brutal p-3 bg-white cursor-pointer hover:bg-emerald-50/50 transition-all ${
                      currentRole === 'TECHNICIAN' ? 'ring-2 ring-[#86EFAC] ring-offset-2' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#DCFCE7] border-2 border-[#18181B] flex items-center justify-center font-black text-xs mb-2">
                      🔧
                    </div>
                    <span className="text-xs font-black text-[#18181B] block truncate">Rajesh Kumar</span>
                    <span className="badge-sticker bg-[#DCFCE7] text-[8px] py-0 px-1 mt-0.5">TECHNICIAN</span>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">Field Electrician</p>
                  </div>

                  {/* Persona 2: Super Admin */}
                  <div
                    onClick={() => handleSelectPersona('FACILITIES_ADMIN', 'Chief Controller (Super Admin)', 'superadmin')}
                    className={`card-brutal p-3 bg-white cursor-pointer hover:bg-emerald-50/50 transition-all ${
                      currentRole === 'FACILITIES_ADMIN' ? 'ring-2 ring-[#86EFAC] ring-offset-2' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#FDA4AF] border-2 border-[#18181B] flex items-center justify-center font-black text-xs mb-2">
                      🛡️
                    </div>
                    <span className="text-xs font-black text-[#18181B] block truncate">Chief Controller</span>
                    <span className="badge-sticker bg-[#FDA4AF] text-[8px] py-0 px-1 mt-0.5">SUPER ADMIN</span>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">Full Campus Radar</p>
                  </div>

                  {/* Persona 3: Procurement Approver */}
                  <div
                    onClick={() => handleSelectPersona('PROCUREMENT_APPROVER', 'S. Venkatesh (Inventory Lead)', 'inventory')}
                    className={`card-brutal p-3 bg-white cursor-pointer hover:bg-emerald-50/50 transition-all ${
                      currentRole === 'PROCUREMENT_APPROVER' ? 'ring-2 ring-[#86EFAC] ring-offset-2' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#FEF9C3] border-2 border-[#18181B] flex items-center justify-center font-black text-xs mb-2">
                      📦
                    </div>
                    <span className="text-xs font-black text-[#18181B] block truncate">S. Venkatesh</span>
                    <span className="badge-sticker bg-[#FEF9C3] text-[8px] py-0 px-1 mt-0.5">PROCUREMENT</span>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">Inventory Approver</p>
                  </div>
                </div>
              </div>

              {/* Real Management Form */}
              <div className="pt-2 border-t-2 border-[#18181B]/10">
                <form onSubmit={handleManualLogin} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-black uppercase text-zinc-600 mb-1">
                      Staff ID or Admin Account
                    </label>
                    <input
                      type="text"
                      placeholder="admin@aegis.demo or tech-elec@aegis.demo"
                      className="w-full px-3 py-2 text-xs input-brutal font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-zinc-600 mb-1">
                      Security Key
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 text-xs input-brutal"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 btn-brutal-green text-xs font-black flex items-center justify-center gap-2 uppercase tracking-wide"
                  >
                    <span>Enter Management Operations CRM</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
