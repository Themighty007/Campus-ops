'use client';

import React, { useState, useRef } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Upload,
  Plus,
  Camera,
  Sparkles,
  Send,
  MapPin,
  Tag,
  X,
  FileText,
  Shield,
  Zap,
  Users,
} from 'lucide-react';
import { PersonaProfile } from '@/types/personas';

interface StudentQuery {
  id: string;
  room: string;
  title: string;
  category: string;
  status: 'RESOLVED' | 'IN_PROGRESS' | 'SCHEDULED' | 'TRIAGED';
  date: string;
  urgency: 'NORMAL' | 'URGENT' | 'EXAM_BLOCKING';
  photoName?: string;
  photoUrl?: string;
  resolutionNote?: string;
  assignedTech?: string;
}

interface StudentDashboardProps {
  persona: PersonaProfile;
  onOpenReportModal?: () => void;
  onOpenCockpit?: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  persona,
  onOpenReportModal,
  onOpenCockpit,
}) => {
  // Notification banner visibility
  const [showResolvedAlert, setShowResolvedAlert] = useState(true);

  // Real-Time Redis Sync for Student Box
  React.useEffect(() => {
    let active = true;
    const pollRedis = async () => {
      try {
        const res = await fetch('/api/redis/sync?box=student');
        const data = await res.json();
        if (active && data.events && data.events.length > 0) {
          const resolvedEvt = data.events.find((e: any) => e.type === 'RESOLUTION_CONFIRMED');
          if (resolvedEvt) {
            setShowResolvedAlert(true);
            setQueries((prev) =>
              prev.map((q) =>
                q.id === 'QRY-2041' || q.status !== 'RESOLVED'
                  ? {
                      ...q,
                      status: 'RESOLVED',
                      resolutionNote: resolvedEvt.payload?.note || 'This issue has been solved. Thank you for notifying us.',
                    }
                  : q
              )
            );
          }
        }
      } catch {}
    };

    pollRedis();
    const interval = setInterval(pollRedis, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Interactive KPI modal state
  const [activeModal, setActiveModal] = useState<'queries' | 'resolution' | 'seats' | 'status' | null>(null);

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
      photoName: 'hall_b204_panel_tripped.jpg',
      photoUrl: '/assets/aistudio/image_7671df28.png',
      assignedTech: 'Rajesh Kumar (Lead Tech)',
      resolutionNote: 'Continuity relocated to Library Hall A; 63A MCB replaced & verified.',
    },
    {
      id: 'QRY-1092',
      room: 'Hostel Block C-302',
      title: 'Wi-Fi access point reboot loop after evening surge',
      category: 'NETWORK',
      status: 'IN_PROGRESS',
      date: 'Yesterday, 18:30',
      urgency: 'NORMAL',
      photoName: 'router_power_light.jpg',
      assignedTech: 'Rajesh Kumar (Lead Tech)',
      resolutionNote: 'Cat6 cable test scheduled · AP replacement on standby',
    },
    {
      id: 'QRY-0984',
      room: 'Mechanical Ground',
      title: 'Water cooler filtration tap leaking near workshop',
      category: 'PLUMBING',
      status: 'SCHEDULED',
      date: '28 Oct 2026',
      urgency: 'NORMAL',
      assignedTech: 'Civil Operations',
      resolutionNote: 'Replacement valve scheduled for weekend maintenance.',
    },
  ]);

  // Quick Query Form State
  const [formRoom, setFormRoom] = useState('Hall B-204');
  const [formCategory, setFormCategory] = useState('ELECTRICAL');
  const [formTitle, setFormTitle] = useState('');
  const [formUrgency, setFormUrgency] = useState<'NORMAL' | 'URGENT' | 'EXAM_BLOCKING'>('NORMAL');

  // Real File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedPhoto, setAttachedPhoto] = useState<{ name: string; url: string; size: string } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<string | null>(null);

  // Live End-to-End Walkthrough Simulator state
  const [simStep, setSimStep] = useState<number | null>(null);

  // File picker handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAttachedPhoto({
        name: file.name,
        url,
        size: `${(file.size / 1024).toFixed(1)} KB`,
      });
    }
  };

  // Sample photo attachment shortcut
  const handleSelectSamplePhoto = (sampleName: string) => {
    setAttachedPhoto({
      name: sampleName,
      url: '/assets/aistudio/image_7671df28.png',
      size: '245.8 KB',
    });
  };

  // Submit query
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
        photoName: attachedPhoto ? attachedPhoto.name : undefined,
        photoUrl: attachedPhoto ? attachedPhoto.url : undefined,
        assignedTech: 'Auto-Routing to Rajesh Kumar',
        resolutionNote: 'Gemini Triage completed: P1 Priority assigned',
      };
      setQueries([newQry, ...queries]);
      setFormTitle('');
      setAttachedPhoto(null);
      setSubmitting(false);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3500);
    }, 600);
  };

  // End-to-End Simulation Runner
  const runLiveSimulation = () => {
    setSimStep(1); // 1: Student submits
    setTimeout(() => {
      setSimStep(2); // 2: AI Evaluates Blast Radius
      setTimeout(() => {
        setSimStep(3); // 3: Supervisor Approves
        setTimeout(() => {
          setSimStep(4); // 4: Tech Replaces MCB
          setTimeout(() => {
            setSimStep(5); // 5: Completed Receipt
          }, 1200);
        }, 1200);
      }, 1200);
    }, 1000);
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
          TOP ROW: 4 SOCIAC-STYLE KPI CARDS (Clickable with interactive popups!)
      ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: My Queries (Clickable) */}
        <div
          onClick={() => setActiveModal('queries')}
          className="card-brutal p-4 bg-[#DCFCE7] flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform group"
          title="Click to view all your complaints & queries"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-zinc-700">My Queries</span>
            <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-black font-bold">
              CLICK 🔍
            </span>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black text-[#18181B]">{queries.length}</span>
            <p className="text-[11px] font-bold text-emerald-800 mt-1">1 Resolved · 1 Active</p>
          </div>
        </div>

        {/* Card 2: Avg Resolution (Clickable) */}
        <div
          onClick={() => setActiveModal('resolution')}
          className="card-brutal p-4 bg-[#FEF9C3] flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform group"
          title="Click to view resolution speed breakdown"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-zinc-700">Avg Resolution</span>
            <span className="text-xs font-mono font-bold text-amber-800">↓ 18%</span>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black text-[#18181B]">
              34<span className="text-base font-normal">m</span>
            </span>
            <p className="text-[11px] font-bold text-amber-900 mt-1">Under 45m SLA Target</p>
          </div>
        </div>

        {/* Card 3: Protected Seats (Clickable) */}
        <div
          onClick={() => setActiveModal('seats')}
          className="card-brutal p-4 bg-[#FCE7F3] flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform group"
          title="Click to view exam protection details"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-zinc-700">Protected Seats</span>
            <span className="text-xs">🛡️</span>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-black text-[#18181B]">180</span>
            <p className="text-[11px] font-bold text-pink-900 mt-1">EE301 Exam Seats Secured</p>
          </div>
        </div>

        {/* Card 4: Campus Status (Clickable) */}
        <div
          onClick={() => setActiveModal('status')}
          className="card-brutal p-4 bg-[#E0F2FE] flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-transform group"
          title="Click to view campus infrastructure health"
        >
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
            <button
              type="button"
              onClick={runLiveSimulation}
              className="badge-sticker bg-[#F472B6] text-white text-[10px] hover:scale-105 transition-transform"
              title="Test end-to-end incident lifecycle"
            >
              ⚡ DEMO SIMULATOR
            </button>
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

            {/* REAL PHOTO ATTACHMENT WITH NATIVE FILE PICKER */}
            <div className="pt-1">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />

              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-black uppercase text-zinc-600 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Attach Photo Evidence</span>
                  <span className="text-[10px] text-zinc-400 font-normal lowercase">(optional)</span>
                </label>

                {/* Quick sample photo shortcuts */}
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="text-zinc-400">Quick sample:</span>
                  <button
                    type="button"
                    onClick={() => handleSelectSamplePhoto('tripped_mcb_panel.jpg')}
                    className="underline text-zinc-600 hover:text-black font-mono"
                  >
                    MCB Panel
                  </button>
                  <span className="text-zinc-300">·</span>
                  <button
                    type="button"
                    onClick={() => handleSelectSamplePhoto('wifi_router_fail.jpg')}
                    className="underline text-zinc-600 hover:text-black font-mono"
                  >
                    Router
                  </button>
                </div>
              </div>

              {/* Dropzone that opens real OS file picker */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all ${
                  attachedPhoto
                    ? 'border-[#86EFAC] bg-[#DCFCE7]/40'
                    : 'border-zinc-300 hover:border-[#18181B] bg-zinc-50'
                }`}
              >
                {attachedPhoto ? (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📸</span>
                      <div className="text-left">
                        <span className="font-bold text-[#18181B] block">{attachedPhoto.name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{attachedPhoto.size} · Ready to submit</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAttachedPhoto(null);
                      }}
                      className="px-2 py-0.5 bg-white border border-black rounded text-[10px] font-bold text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-xs text-zinc-600">
                    <Upload className="w-4 h-4 text-zinc-500" />
                    <span>
                      <strong className="text-[#18181B]">Click to browse files</strong> on your device (JPG, PNG)
                    </span>
                  </div>
                )}
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

        {/* RIGHT: TOP CORNER VISUAL GRAPH WIDGET */}
        <div className="card-brutal p-4 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <span className="text-xs font-black uppercase text-[#18181B]">
                Response Speed
              </span>
              <span className="badge-sticker bg-[#FEF9C3] text-[9px]">LAST 7 DAYS</span>
            </div>

            <div className="mt-4">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xl font-black text-[#18181B]">
                  34m <span className="text-[10px] text-emerald-600 font-bold">Avg</span>
                </span>
                <span className="text-[10px] font-mono text-zinc-500">Fastest: 12m</span>
              </div>

              {/* Bar Columns */}
              <div className="h-28 w-full bg-[#FAF9F5] border border-zinc-200 rounded-lg p-2 relative flex items-end justify-between gap-1">
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
                    {q.photoName ? (
                      <button
                        onClick={() => setSelectedPhotoModal(q.photoUrl || '/assets/aistudio/image_7671df28.png')}
                        className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 hover:bg-emerald-100"
                      >
                        📷 {q.photoName.slice(0, 10)}...
                      </button>
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

      {/* =========================================================================
          INTERACTIVE POPUPS FOR THE 4 TOP KPI BOXES
      ========================================================================= */}
      {/* 1. My Queries Modal */}
      {activeModal === 'queries' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-[#FAF9F5] border-[3px] border-[#18181B] rounded-2xl shadow-brutal-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b-2 border-black">
              <span className="font-black text-sm uppercase">My Disruption Queries ({queries.length})</span>
              <button
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-lg bg-zinc-100 border-2 border-black flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>
            <div className="py-4 space-y-2.5 max-h-72 overflow-y-auto">
              {queries.map((q) => (
                <div key={q.id} className="p-3 bg-white border-2 border-black rounded-xl">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono font-bold text-black">{q.id} · {q.room}</span>
                    <span className="badge-sticker bg-[#DCFCE7] text-[9px]">{q.status}</span>
                  </div>
                  <p className="text-xs font-bold mt-1 text-zinc-800">{q.title}</p>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{q.resolutionNote}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2 btn-brutal-yellow text-xs font-black uppercase shadow-brutal-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 2. Avg Resolution Modal */}
      {activeModal === 'resolution' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-[#FAF9F5] border-[3px] border-[#18181B] rounded-2xl shadow-brutal-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b-2 border-black">
              <span className="font-black text-sm uppercase">SLA Resolution Performance</span>
              <button
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-lg bg-zinc-100 border-2 border-black flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>
            <div className="py-4 space-y-3 text-xs">
              <div className="p-3 bg-[#FEF9C3] rounded-xl border border-black">
                <span className="font-black block">Campus SLA Target: 45 Minutes</span>
                <p className="text-zinc-700 mt-1">Your queries are resolved in an average of 34 minutes (18% faster than SLA target).</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-black space-y-1 text-[11px] font-mono">
                <div>Fastest Relocation: <strong>12 minutes (Hall B-204)</strong></div>
                <div>Technician On-Site Time: <strong>8 minutes</strong></div>
                <div>Verified Resolution Rate: <strong>100%</strong></div>
              </div>
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2 btn-brutal-yellow text-xs font-black uppercase shadow-brutal-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 3. Protected Seats Modal */}
      {activeModal === 'seats' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-[#FAF9F5] border-[3px] border-[#18181B] rounded-2xl shadow-brutal-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b-2 border-black">
              <span className="font-black text-sm uppercase">Academic Activity Continuity</span>
              <button
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-lg bg-zinc-100 border-2 border-black flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>
            <div className="py-4 space-y-3 text-xs">
              <div className="p-3 bg-[#FCE7F3] rounded-xl border border-black">
                <span className="font-black block text-pink-950">180 Students Protected</span>
                <p className="text-zinc-700 mt-1">When Hall B-204 experienced power failure, 180 EE301 examination candidates were relocated seamlessly.</p>
              </div>
              <div className="p-3 bg-white rounded-xl border border-black text-[11px] font-mono space-y-1">
                <div>Origin Room: <strong>Hall B-204 (Tripped)</strong></div>
                <div>Destination Room: <strong>Library Hall A (220 Cap)</strong></div>
                <div>Exam Delay: <strong>0 Minutes (Exam On-Time)</strong></div>
              </div>
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2 btn-brutal-pink text-xs font-black uppercase shadow-brutal-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 4. Campus Status Modal */}
      {activeModal === 'status' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-[#FAF9F5] border-[3px] border-[#18181B] rounded-2xl shadow-brutal-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b-2 border-black">
              <span className="font-black text-sm uppercase">Campus Grid Reliability</span>
              <button
                onClick={() => setActiveModal(null)}
                className="w-7 h-7 rounded-lg bg-zinc-100 border-2 border-black flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>
            <div className="py-4 space-y-2 text-xs">
              <div className="p-2.5 bg-white rounded-lg border border-black flex justify-between">
                <span>Electrical Distribution Grid</span>
                <span className="font-bold text-emerald-700">99.8% Uptime</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-black flex justify-between">
                <span>Campus Wi-Fi & Backbone LAN</span>
                <span className="font-bold text-emerald-700">99.9% Uptime</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-black flex justify-between">
                <span>HVAC & Climate Control</span>
                <span className="font-bold text-sky-700">99.1% Uptime</span>
              </div>
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2 btn-brutal-yellow text-xs font-black uppercase shadow-brutal-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {selectedPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white border-[3px] border-black rounded-2xl shadow-brutal-xl p-5">
            <div className="flex items-center justify-between pb-2 border-b-2 border-black">
              <span className="font-black text-xs uppercase">Photo Evidence Preview</span>
              <button
                onClick={() => setSelectedPhotoModal(null)}
                className="w-7 h-7 rounded-lg bg-zinc-100 border-2 border-black flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>
            <div className="my-4 bg-zinc-900 rounded-xl p-4 text-center text-white font-mono text-xs">
              <div className="h-44 bg-zinc-800 rounded flex flex-col justify-between p-3 border border-zinc-700">
                <span className="text-amber-400 font-bold">PANEL DB-2B (HALL B-204)</span>
                <span className="text-2xl text-red-500 font-black">63A TRIP</span>
                <span className="text-[10px] text-zinc-400">Attached by Requester</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedPhotoModal(null)}
              className="w-full py-2 btn-brutal-yellow text-xs font-black uppercase shadow-brutal-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* End-to-End Simulation Modal */}
      {simStep !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-[#FAF9F5] border-[3px] border-black rounded-2xl shadow-brutal-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-black">
              <div className="flex items-center gap-2">
                <span className="badge-sticker bg-[#FDE047] text-xs">LIVE END-TO-END DEMO</span>
                <h3 className="font-black text-sm uppercase">Incident Lifecycle Engine</h3>
              </div>
              <button
                onClick={() => setSimStep(null)}
                className="w-7 h-7 rounded-lg bg-zinc-100 border-2 border-black flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Step 1 */}
              <div className={`p-3 rounded-xl border-2 border-black flex items-center gap-3 ${simStep >= 1 ? 'bg-[#DCFCE7]' : 'bg-zinc-100'}`}>
                <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center font-mono font-bold text-xs">1</span>
                <div>
                  <span className="font-bold text-[#18181B] block">Student Report Ingested</span>
                  <span className="text-zinc-600 text-[11px]">"Power off in B-204. Exam in 30 mins."</span>
                </div>
              </div>

              {/* Step 2 */}
              <div className={`p-3 rounded-xl border-2 border-black flex items-center gap-3 ${simStep >= 2 ? 'bg-[#DCFCE7]' : 'bg-zinc-100'}`}>
                <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center font-mono font-bold text-xs">2</span>
                <div>
                  <span className="font-bold text-[#18181B] block">AI Calculates Blast Radius & Plans</span>
                  <span className="text-zinc-600 text-[11px]">Library Hall A evaluated; passes 4 constraints.</span>
                </div>
              </div>

              {/* Step 3 */}
              <div className={`p-3 rounded-xl border-2 border-black flex items-center gap-3 ${simStep >= 3 ? 'bg-[#DCFCE7]' : 'bg-zinc-100'}`}>
                <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center font-mono font-bold text-xs">3</span>
                <div>
                  <span className="font-bold text-[#18181B] block">Human-in-the-Loop Supervisor Approves</span>
                  <span className="text-zinc-600 text-[11px]">Chief Controller executes atomic DB commit.</span>
                </div>
              </div>

              {/* Step 4 */}
              <div className={`p-3 rounded-xl border-2 border-black flex items-center gap-3 ${simStep >= 4 ? 'bg-[#DCFCE7]' : 'bg-zinc-100'}`}>
                <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center font-mono font-bold text-xs">4</span>
                <div>
                  <span className="font-bold text-[#18181B] block">Technician Dispatched with Reserved MCB</span>
                  <span className="text-zinc-600 text-[11px]">Rajesh Kumar completes repair & posts photo.</span>
                </div>
              </div>

              {/* Step 5 */}
              <div className={`p-3 rounded-xl border-2 border-black flex items-center gap-3 ${simStep >= 5 ? 'bg-[#FEF9C3]' : 'bg-zinc-100'}`}>
                <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center font-mono font-bold text-xs">5</span>
                <div>
                  <span className="font-bold text-emerald-950 block">Student Receives Resolution Receipt</span>
                  <span className="text-emerald-900 text-[11px]">"This issue has been solved. Thank you for notifying us."</span>
                </div>
              </div>
            </div>

            {simStep === 5 ? (
              <button
                onClick={() => setSimStep(null)}
                className="w-full py-2 btn-brutal-green text-xs font-black uppercase shadow-brutal-sm"
              >
                Simulation Complete · Return to Dashboard
              </button>
            ) : (
              <div className="text-center font-mono text-xs text-zinc-500 animate-pulse">
                Running automated campus recovery pipeline...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
