'use client';

import React, { useState } from 'react';
import { CheckCircle2, Clock, AlertTriangle, Upload, Plus, Camera, Sparkles, Send, MapPin, Tag } from 'lucide-react';
import { PersonaProfile } from '@/types/personas';

interface StudentQuery {
  id: string;
  room: string;
  title: string;
  category: string;
  status: 'RESOLVED' | 'IN_PROGRESS' | 'SCHEDULED' | 'TRIAGED';
  date: string;
  urgency: 'NORMAL' | 'URGENT' | 'EXAM_BLOCKING';
  hasPhoto?: boolean;
  resolutionNote?: string;
}

interface StudentDashboardProps {
  persona: PersonaProfile;
  onOpenReportModal?: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ persona }) => {
  // Notification banner visibility
  const [showResolvedAlert, setShowResolvedAlert] = useState(true);

  // Queries list
  const [queries, setQueries] = useState<StudentQuery[]>([
    {
      id: 'QRY-2041',
      room: 'Hall B-204',
      title: 'Power tripped 30 mins before EE301 Midterm Exam',
      category: 'ELECTRICAL',
      status: 'RESOLVED',
      date: 'Today, 21:15',
      urgency: 'EXAM_BLOCKING',
      hasPhoto: true,
      resolutionNote: 'Continuity relocated to Library Hall; 63A MCB replaced by Tech Rajesh.',
    },
    {
      id: 'QRY-1092',
      room: 'Hostel Block C-302',
      title: 'Wi-Fi access point reboot loop after evening surge',
      category: 'NETWORK',
      status: 'IN_PROGRESS',
      date: 'Yesterday, 18:30',
      urgency: 'NORMAL',
      hasPhoto: false,
      resolutionNote: 'Assigned to Tech Anand · Cat6 cable test scheduled',
    },
    {
      id: 'QRY-0984',
      room: 'Mechanical Ground',
      title: 'Water cooler filtration tap leaking near workshop',
      category: 'PLUMBING',
      status: 'SCHEDULED',
      date: '28 Oct 2026',
      urgency: 'NORMAL',
      hasPhoto: true,
    },
  ]);

  // Quick Query Form State
  const [formRoom, setFormRoom] = useState('Hall B-204');
  const [formCategory, setFormCategory] = useState('ELECTRICAL');
  const [formTitle, setFormTitle] = useState('');
  const [formUrgency, setFormUrgency] = useState<'NORMAL' | 'URGENT' | 'EXAM_BLOCKING'>('NORMAL');
  const [formPhotoAttached, setFormPhotoAttached] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmitQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    setSubmitting(true);
    setTimeout(() => {
      const newQry: StudentQuery = {
        id: `QRY-${Math.floor(1000 + Math.random() * 9000)}`,
        room: formRoom,
        title: formTitle,
        category: formCategory,
        status: 'TRIAGED',
        date: 'Just now',
        urgency: formUrgency,
        hasPhoto: formPhotoAttached,
        resolutionNote: 'AI Triage completed: Routed to Facilities queue',
      };
      setQueries([newQry, ...queries]);
      setFormTitle('');
      setFormPhotoAttached(false);
      setSubmitting(false);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* =========================================================================
          CRITICAL USER REQUIREMENT: RESOLUTION NOTIFICATION BANNER
          "This issue has been solved. Thank you for notifying us."
      ========================================================================= */}
      {showResolvedAlert && (
        <div className="card-brutal p-4 bg-[#DCFCE7] border-2 border-[#18181B] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-brutal animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#86EFAC] border-2 border-[#18181B] flex items-center justify-center shrink-0 shadow-brutal-sm">
              <CheckCircle2 className="w-6 h-6 text-[#18181B] stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="badge-sticker bg-white text-[#18181B] text-[10px]">
                  OFFICIAL RESOLUTION RECEIPT
                </span>
                <span className="text-[11px] font-mono font-bold text-zinc-600">QRY-2041</span>
              </div>
              <h4 className="text-sm font-black text-[#18181B] mt-0.5">
                This issue has been solved. Thank you for notifying us.
              </h4>
              <p className="text-xs text-zinc-700 font-medium mt-0.5">
                Hall B-204 power outage was repaired by Lead Tech Rajesh Kumar. Academic exam was successfully relocated to Library Hall with zero delay.
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

      {/* =========================================================================
          TOP ROW: 4 SOCIAC-STYLE KPI CARDS (Mint, Yellow, Pink, Cyan)
      ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Mint Green */}
        <div className="card-brutal p-4 bg-[#DCFCE7] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-zinc-700">My Queries</span>
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black text-[#18181B]">{queries.length}</span>
            <p className="text-[11px] font-bold text-emerald-800 mt-1">1 Resolved · 1 Active</p>
          </div>
        </div>

        {/* Card 2: Pastel Yellow */}
        <div className="card-brutal p-4 bg-[#FEF9C3] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-zinc-700">Avg Resolution</span>
            <span className="text-xs font-mono font-bold text-amber-800">↓ 18%</span>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black text-[#18181B]">34<span className="text-base font-normal">m</span></span>
            <p className="text-[11px] font-bold text-amber-900 mt-1">Under 45m SLA Target</p>
          </div>
        </div>

        {/* Card 3: Pastel Pink */}
        <div className="card-brutal p-4 bg-[#FCE7F3] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-zinc-700">Protected Seats</span>
            <span className="text-xs">🛡️</span>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black text-[#18181B]">180</span>
            <p className="text-[11px] font-bold text-pink-900 mt-1">EE301 Exam Seats Secured</p>
          </div>
        </div>

        {/* Card 4: Pastel Cyan */}
        <div className="card-brutal p-4 bg-[#E0F2FE] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-zinc-700">Campus Status</span>
            <span className="badge-sticker bg-white text-[9px]">NORMAL</span>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black text-[#18181B]">99.8%</span>
            <p className="text-[11px] font-bold text-sky-900 mt-1">Academic Grid Uptime</p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MIDDLE ROW: COMPACT QUERY FORM + TOP CORNER VISUAL GRAPH
      ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT / CENTER: SMALL SIMPLE "REGISTER NEW QUERY" CARD */}
        <div className="lg:col-span-2 card-brutal p-5 bg-white">
          <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-zinc-100">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#FEF9C3] border-2 border-[#18181B] flex items-center justify-center font-black text-xs shadow-brutal-sm">
                ✍️
              </span>
              <div>
                <h3 className="font-black text-sm text-[#18181B] uppercase tracking-tight">
                  Register a Disruption Query
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Quick reporting for students · Non-mandatory photo attachment
                </p>
              </div>
            </div>
            <span className="badge-sticker bg-[#86EFAC] text-[10px]">AI TRIAGED</span>
          </div>

          <form onSubmit={handleSubmitQuery} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-black uppercase text-zinc-600 mb-1">
                What is the issue?
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g., Projector bulb exploded in Hall B-204, or AC leaking water"
                className="w-full px-3 py-2 text-xs input-brutal"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Room Selector */}
              <div>
                <label className="block text-[11px] font-black uppercase text-zinc-600 mb-1">
                  Room / Location
                </label>
                <select
                  value={formRoom}
                  onChange={(e) => setFormRoom(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs input-brutal bg-white"
                >
                  <option value="Hall B-204">Hall B-204 (B-Wing)</option>
                  <option value="Lab A-301">Lab A-301 (CS Wing)</option>
                  <option value="Aud-West">Aud-West</option>
                  <option value="Hostel Block C-302">Hostel C-302</option>
                  <option value="Library Hall">Library Hall 3rd Fl</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[11px] font-black uppercase text-zinc-600 mb-1">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs input-brutal bg-white"
                >
                  <option value="ELECTRICAL">⚡ Electrical / Power</option>
                  <option value="NETWORK">📶 Wi-Fi / Network</option>
                  <option value="HVAC">❄️ AC / Ventilation</option>
                  <option value="PLUMBING">🚰 Water / Plumbing</option>
                  <option value="HARDWARE">🖥️ Hardware / AV</option>
                </select>
              </div>

              {/* Urgency */}
              <div>
                <label className="block text-[11px] font-black uppercase text-zinc-600 mb-1">
                  Urgency Level
                </label>
                <select
                  value={formUrgency}
                  onChange={(e) => setFormUrgency(e.target.value as any)}
                  className="w-full px-2.5 py-2 text-xs input-brutal bg-white font-bold"
                >
                  <option value="NORMAL">Normal Priority</option>
                  <option value="URGENT">⚠️ Urgent (Class in 1h)</option>
                  <option value="EXAM_BLOCKING">🚨 Exam Blocking</option>
                </select>
              </div>
            </div>

            {/* Photo Attachment (Optional) */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-black uppercase text-zinc-600 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Attach Photo Evidence</span>
                  <span className="text-[10px] text-zinc-400 font-normal lowercase">(optional)</span>
                </label>
                {formPhotoAttached && (
                  <span className="text-[10px] font-mono text-emerald-700 font-bold">
                    ✓ Photo Attached (tripped_breaker.jpg)
                  </span>
                )}
              </div>

              <div
                onClick={() => setFormPhotoAttached(!formPhotoAttached)}
                className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all ${
                  formPhotoAttached
                    ? 'border-[#86EFAC] bg-[#DCFCE7]/40'
                    : 'border-zinc-300 hover:border-[#18181B] bg-zinc-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2 text-xs text-zinc-600">
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {formPhotoAttached
                      ? 'Click to remove attached photo'
                      : 'Click to attach disruption photo (or use sample preview)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-1">
              {submitSuccess ? (
                <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Query registered & assigned!
                </span>
              ) : (
                <span className="text-[11px] text-zinc-500">
                  Routed via Gemini 3.8 Flash triage model
                </span>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn-brutal-yellow px-5 py-2 text-xs font-black flex items-center gap-2 uppercase tracking-tight shadow-brutal-sm"
              >
                <span>{submitting ? 'Submitting...' : 'Submit Query'}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT: TOP CORNER VISUAL GRAPH WIDGET (Sociac / Bruddle Style) */}
        <div className="card-brutal p-4 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <span className="text-xs font-black uppercase text-[#18181B]">
                Response Speed
              </span>
              <span className="badge-sticker bg-[#FEF9C3] text-[9px]">LAST 7 DAYS</span>
            </div>

            {/* Mini SVG Line & Bar Chart */}
            <div className="mt-4">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xl font-black text-[#18181B]">34m <span className="text-[10px] text-emerald-600 font-bold">Avg</span></span>
                <span className="text-[10px] font-mono text-zinc-500">Fastest: 12m</span>
              </div>

              {/* Clean Responsive SVG Curve */}
              <div className="h-28 w-full bg-[#FAF9F5] border border-zinc-200 rounded-lg p-2 relative flex items-end justify-between gap-1">
                {/* Visual Bar Columns */}
                {[
                  { day: 'Mon', h: '60%', val: '45m' },
                  { day: 'Tue', h: '45%', val: '38m' },
                  { day: 'Wed', h: '80%', val: '52m' },
                  { day: 'Thu', h: '35%', val: '28m' },
                  { day: 'Fri', h: '50%', val: '36m' },
                  { day: 'Sat', h: '30%', val: '22m' },
                  { day: 'Sun', h: '40%', val: '34m' },
                ].map((b, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                    <div
                      style={{ height: b.h }}
                      className={`w-full rounded-t-sm transition-all border border-[#18181B] ${
                        idx === 6 ? 'bg-[#F472B6]' : 'bg-[#86EFAC]'
                      }`}
                    />
                    <span className="text-[8px] font-mono font-bold text-zinc-500">{b.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-zinc-100 text-[10px] font-mono text-zinc-500 flex items-center justify-between">
            <span>Verified by Technicians</span>
            <span className="text-emerald-700 font-bold">● 100% on SLA</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM ROW: PREVIOUS COMPLAINTS / QUERIES TABLE
      ========================================================================= */}
      <div className="card-brutal p-5 bg-white">
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-zinc-100">
          <div className="flex items-center gap-2">
            <span className="font-black text-sm text-[#18181B] uppercase">
              My Previous Complaints & Queries
            </span>
            <span className="badge-sticker bg-zinc-100 text-zinc-700 text-[10px]">
              {queries.length} TOTAL
            </span>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">Live Status Feed</span>
        </div>

        {/* Clean Sociac Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b-2 border-[#18181B] bg-zinc-50 text-[10px] font-mono font-black uppercase text-zinc-600">
                <th className="py-2.5 px-3">Query ID</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Submitted</th>
                <th className="py-2.5 px-3">Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {queries.map((q) => (
                <tr key={q.id} className="hover:bg-zinc-50/80 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-[#18181B]">
                    {q.id}
                  </td>
                  <td className="py-3 px-3 font-bold text-zinc-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{q.room}</span>
                  </td>
                  <td className="py-3 px-3 max-w-xs">
                    <p className="font-bold text-[#18181B] truncate">{q.title}</p>
                    {q.resolutionNote && (
                      <p className="text-[10px] text-emerald-800 font-mono mt-0.5 truncate">
                        ↳ {q.resolutionNote}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span className="badge-sticker bg-zinc-100 text-zinc-800 text-[9px] py-0">
                      {q.category}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {q.status === 'RESOLVED' && (
                      <span className="badge-sticker bg-[#DCFCE7] text-emerald-900 text-[10px]">
                        ✓ RESOLVED
                      </span>
                    )}
                    {q.status === 'IN_PROGRESS' && (
                      <span className="badge-sticker bg-[#FEF9C3] text-amber-900 text-[10px]">
                        ⏳ IN PROGRESS
                      </span>
                    )}
                    {q.status === 'SCHEDULED' && (
                      <span className="badge-sticker bg-[#E0F2FE] text-sky-900 text-[10px]">
                        📅 SCHEDULED
                      </span>
                    )}
                    {q.status === 'TRIAGED' && (
                      <span className="badge-sticker bg-[#FCE7F3] text-pink-900 text-[10px]">
                        ⚡ TRIAGED
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-zinc-500 text-[11px]">
                    {q.date}
                  </td>
                  <td className="py-3 px-3">
                    {q.hasPhoto ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                        📷 Attached
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-400">None</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
