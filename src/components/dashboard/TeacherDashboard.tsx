'use client';

import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, Shield, BookOpen, Users, MapPin, Send, Camera, Upload, Layers } from 'lucide-react';
import { PersonaProfile } from '@/types/personas';

interface TeacherDashboardProps {
  persona: PersonaProfile;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ persona }) => {
  // Notification banner visibility
  const [showResolvedAlert, setShowResolvedAlert] = useState(true);

  // Queries list
  const [queries, setQueries] = useState([
    {
      id: 'FAC-802',
      room: 'Hall B-204',
      title: 'Power tripped 30 mins before EE301 Midterm Exam',
      category: 'ELECTRICAL',
      status: 'RESOLVED',
      date: 'Today, 21:15',
      priority: 'FACULTY_EXAM_PRIORITY',
      resolution: 'Relocated to Library Hall (180 seats). Replacement 63A MCB installed.',
    },
    {
      id: 'FAC-781',
      room: 'Lab A-301 (Electrical Machines)',
      title: 'Phase-3 voltage fluctuation on motor test bench #4',
      category: 'ELECTRICAL',
      status: 'IN_PROGRESS',
      date: 'Today, 14:00',
      priority: 'LAB_EXPERIMENT',
      resolution: 'Assigned to Tech Rajesh · Calibrating transformer line',
    },
  ]);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formRoom, setFormRoom] = useState('Hall B-204');
  const [formCategory, setFormCategory] = useState('ELECTRICAL');
  const [formPriority, setFormPriority] = useState<'EXAM_BLOCKING' | 'LAB_WORK' | 'ROUTINE'>('EXAM_BLOCKING');
  const [photoAttached, setPhotoAttached] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    setSubmitting(true);
    setTimeout(() => {
      setQueries([
        {
          id: `FAC-${Math.floor(800 + Math.random() * 200)}`,
          room: formRoom,
          title: formTitle,
          category: formCategory,
          status: 'IN_PROGRESS',
          date: 'Just now',
          priority: formPriority === 'EXAM_BLOCKING' ? 'FACULTY_EXAM_PRIORITY' : 'LAB_WORK',
          resolution: 'Fast-tracked triage via HOD clearance key',
        },
        ...queries,
      ]);
      setFormTitle('');
      setPhotoAttached(false);
      setSubmitting(false);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* 1. OFFICIAL RESOLUTION NOTIFICATION BANNER */}
      {showResolvedAlert && (
        <div className="card-brutal p-4 bg-[#DCFCE7] border-2 border-[#18181B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-brutal">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#86EFAC] border-2 border-[#18181B] flex items-center justify-center shrink-0 shadow-brutal-sm">
              <CheckCircle2 className="w-6 h-6 text-[#18181B] stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="badge-sticker bg-white text-[#18181B] text-[10px]">
                  HOD DEPARTMENT RECEIPT
                </span>
                <span className="text-[11px] font-mono font-bold text-zinc-600">FAC-802</span>
              </div>
              <h4 className="text-sm font-black text-[#18181B] mt-0.5">
                This issue has been solved. Thank you for notifying us.
              </h4>
              <p className="text-xs text-zinc-700 font-medium mt-0.5">
                Hall B-204 mid-term exam was securely relocated to Library Hall. Roster for 180 students & invigilators verified intact.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowResolvedAlert(false)}
            className="px-3 py-1 bg-white hover:bg-zinc-100 border border-black rounded-lg text-xs font-bold shrink-0 self-end sm:self-center transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. TOP 4 KPI METRICS (Sociac / Bruddle Style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-brutal p-4 bg-[#E0F2FE]">
          <span className="text-xs font-black uppercase text-zinc-700">Dept Classrooms</span>
          <div className="mt-2">
            <span className="text-3xl font-black text-[#18181B]">6 / 7</span>
            <p className="text-[11px] font-bold text-sky-900 mt-1">B-Wing Operational</p>
          </div>
        </div>

        <div className="card-brutal p-4 bg-[#DCFCE7]">
          <span className="text-xs font-black uppercase text-zinc-700">Exam Protection</span>
          <div className="mt-2">
            <span className="text-3xl font-black text-[#18181B]">100%</span>
            <p className="text-[11px] font-bold text-emerald-900 mt-1">0 Cancelled Exams</p>
          </div>
        </div>

        <div className="card-brutal p-4 bg-[#FEF9C3]">
          <span className="text-xs font-black uppercase text-zinc-700">Active Lab Load</span>
          <div className="mt-2">
            <span className="text-3xl font-black text-[#18181B]">240</span>
            <p className="text-[11px] font-bold text-amber-900 mt-1">Students in Labs</p>
          </div>
        </div>

        <div className="card-brutal p-4 bg-[#FCE7F3]">
          <span className="text-xs font-black uppercase text-zinc-700">Uptime Score</span>
          <div className="mt-2">
            <span className="text-3xl font-black text-[#18181B]">99.4%</span>
            <p className="text-[11px] font-bold text-pink-900 mt-1">Electrical Infrastructure</p>
          </div>
        </div>
      </div>

      {/* 3. TEACHER SUPERPOWERS: DEPARTMENT CLASSROOM & LAB MATRIX */}
      <div className="card-brutal p-5 bg-white">
        <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-zinc-100">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#E0F2FE] border-2 border-[#18181B] flex items-center justify-center text-xs shadow-brutal-sm font-black">
              🏢
            </span>
            <div>
              <h3 className="font-black text-sm text-[#18181B] uppercase">
                B-Wing Facilities & Lab Real-time Status
              </h3>
              <p className="text-[11px] text-zinc-500">
                Live power, HVAC, and network connectivity across electrical department spaces
              </p>
            </div>
          </div>
          <span className="badge-sticker bg-[#86EFAC] text-[10px]">ALL MONITORED</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Hall B-201 */}
          <div className="p-3.5 rounded-xl border-2 border-[#18181B] bg-zinc-50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#18181B]">Hall B-201</span>
              <span className="badge-sticker bg-[#86EFAC] text-[9px] py-0">ONLINE</span>
            </div>
            <p className="text-[11px] text-zinc-600 mt-1">120 Seats · Power 230V Normal</p>
            <div className="mt-2 text-[10px] font-mono text-emerald-700 font-bold">
              ✓ Ready for Afternoon Lecture
            </div>
          </div>

          {/* Hall B-204 */}
          <div className="p-3.5 rounded-xl border-2 border-[#18181B] bg-[#DCFCE7]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#18181B]">Hall B-204</span>
              <span className="badge-sticker bg-white text-emerald-900 text-[9px] py-0 font-bold">
                CONTINUITY RESTORED
              </span>
            </div>
            <p className="text-[11px] text-zinc-700 mt-1">180 Seats · Exam Relocated</p>
            <div className="mt-2 text-[10px] font-mono text-emerald-800 font-bold">
              ↳ Exam Active in Library Hall
            </div>
          </div>

          {/* Lab A-301 */}
          <div className="p-3.5 rounded-xl border-2 border-[#18181B] bg-zinc-50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#18181B]">Lab A-301</span>
              <span className="badge-sticker bg-[#FEF9C3] text-amber-900 text-[9px] py-0">
                IN SERVICE
              </span>
            </div>
            <p className="text-[11px] text-zinc-600 mt-1">60 Workstations · Machines Lab</p>
            <div className="mt-2 text-[10px] font-mono text-amber-800 font-bold">
              ↳ Tech Rajesh calibrating bench 4
            </div>
          </div>
        </div>
      </div>

      {/* 4. MIDDLE ROW: FACULTY DISRUPTION FORM + CORNER VISUAL GRAPH */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Faculty Priority Complaint Form */}
        <div className="lg:col-span-2 card-brutal p-5 bg-white">
          <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-zinc-100">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#FDE047] border-2 border-[#18181B] flex items-center justify-center font-black text-xs shadow-brutal-sm">
                ⚡
              </span>
              <div>
                <h3 className="font-black text-sm text-[#18181B] uppercase tracking-tight">
                  Faculty Priority Disruption Dispatch
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Direct HOD triage routing · Non-mandatory photo evidence
                </p>
              </div>
            </div>
            <span className="badge-sticker bg-[#FDA4AF] text-[10px]">HOD FAST-TRACK</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-black uppercase text-zinc-600 mb-1">
                Disruption Description
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g., Transformer hum in Lab A-301; or projector failure before exam"
                className="w-full px-3 py-2 text-xs input-brutal"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-black uppercase text-zinc-600 mb-1">
                  Location
                </label>
                <select
                  value={formRoom}
                  onChange={(e) => setFormRoom(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs input-brutal bg-white"
                >
                  <option value="Hall B-204">Hall B-204 (180 Seats)</option>
                  <option value="Hall B-201">Hall B-201 (120 Seats)</option>
                  <option value="Lab A-301">Lab A-301 (Machines Lab)</option>
                  <option value="Faculty Wing 2nd Fl">Faculty Wing 204</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-zinc-600 mb-1">
                  System Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs input-brutal bg-white"
                >
                  <option value="ELECTRICAL">⚡ Electrical Supply</option>
                  <option value="HVAC">❄️ AC / Ventilation</option>
                  <option value="NETWORK">📶 Campus LAN / Wi-Fi</option>
                  <option value="AUDIO_VISUAL">📽️ AV & Projection</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-zinc-600 mb-1">
                  Academic Impact
                </label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as any)}
                  className="w-full px-2.5 py-2 text-xs input-brutal bg-white font-bold"
                >
                  <option value="EXAM_BLOCKING">🚨 Exam Blocking (Auto-Relocate)</option>
                  <option value="LAB_WORK">⚠️ Laboratory Course</option>
                  <option value="ROUTINE">Regular Lecture</option>
                </select>
              </div>
            </div>

            {/* Optional Photo Attachment */}
            <div className="pt-1">
              <div
                onClick={() => setPhotoAttached(!photoAttached)}
                className={`border-2 border-dashed rounded-xl p-2.5 text-center cursor-pointer transition-all ${
                  photoAttached
                    ? 'border-[#86EFAC] bg-[#DCFCE7]/40'
                    : 'border-zinc-300 hover:border-[#18181B] bg-zinc-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2 text-xs text-zinc-600">
                  <Camera className="w-3.5 h-3.5" />
                  <span>
                    {photoAttached
                      ? '✓ Evidence Attached (hall_b204_panel.jpg)'
                      : 'Attach room photo / fault meter reading (optional)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              {submitSuccess ? (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Priority dispatch sent to Facilities!
                </span>
              ) : (
                <span className="text-[11px] text-zinc-500 font-mono">
                  Enforces Segregation of Duties (SoD)
                </span>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn-brutal-green px-5 py-2 text-xs font-black flex items-center gap-2 uppercase tracking-tight shadow-brutal-sm"
              >
                <span>{submitting ? 'Dispatching...' : 'Dispatch Priority Work Order'}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

        {/* Corner Visual Graph: Faculty Uptime Breakdown */}
        <div className="card-brutal p-4 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <span className="text-xs font-black uppercase text-[#18181B]">
                Lab & Hall Uptime
              </span>
              <span className="badge-sticker bg-[#DCFCE7] text-[9px]">OCTOBER 2026</span>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-2xl font-black text-[#18181B]">99.4%</span>
                <span className="text-[10px] font-mono text-emerald-700 font-bold">Target: 98%</span>
              </div>

              {/* Sparkline & Donut Breakdown */}
              <div className="space-y-2 mt-3">
                <div>
                  <div className="flex justify-between text-[11px] font-mono font-bold mb-1">
                    <span>Lecture Halls</span>
                    <span className="text-emerald-700">99.8%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden border border-black/20">
                    <div className="h-full bg-[#86EFAC]" style={{ width: '99.8%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-mono font-bold mb-1">
                    <span>Electrical Labs</span>
                    <span className="text-sky-700">98.9%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden border border-black/20">
                    <div className="h-full bg-[#7DD3FC]" style={{ width: '98.9%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-mono font-bold mb-1">
                    <span>Exam Continuity</span>
                    <span className="text-pink-700">100%</span>
                  </div>
                  <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden border border-black/20">
                    <div className="h-full bg-[#F472B6]" style={{ width: '100%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-zinc-100 text-[10px] font-mono text-zinc-500 flex items-center justify-between">
            <span>Continuity Track Verified</span>
            <span className="text-emerald-700 font-bold">● Zero Lost Hours</span>
          </div>
        </div>
      </div>
    </div>
  );
};
