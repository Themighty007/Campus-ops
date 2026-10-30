'use client';

import React, { useState } from 'react';
import { X, Send, Sparkles, AlertCircle, Loader2 } from 'lucide-react';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string, roomHint?: string) => Promise<any>;
}

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [text, setText] = useState('');
  const [roomHint, setRoomHint] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [extractedPreview, setExtractedPreview] = useState<any>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await onSubmit(text, roomHint || undefined);
      if (res?.incident) {
        setExtractedPreview(res);
      }
    } catch {
      // Handled by parent
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-[#FAF9F5] border-[3px] border-[#18181B] rounded-2xl shadow-brutal-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Yellow corner pin from Reference Image 1 */}
        <div className="pin-circle-yellow" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b-2 border-[#18181B]">
          <div className="flex items-center gap-2">
            <span className="badge-sticker bg-[#FDA4AF] text-[#18181B]">INTAKE GATE</span>
            <span className="text-sm font-black text-[#18181B]">FILE CAMPUS DISRUPTION</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 border-2 border-[#18181B] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-[#18181B]" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {extractedPreview ? (
            /* SUCCESS CONFIRMATION & EXTRACTED ATTRIBUTES */
            <div className="space-y-4">
              <div className="p-4 bg-[#DCFCE7] border-2 border-[#18181B] rounded-xl shadow-brutal-sm">
                <span className="badge-sticker bg-[#86EFAC] text-emerald-950 text-[10px] mb-2">
                  INCIDENT LOGGED
                </span>
                <h4 className="text-base font-black text-[#18181B]">
                  Report Registered: {extractedPreview.incident?.code || 'INC-SUCCESS'}
                </h4>
                <p className="text-xs text-zinc-700 font-medium mt-1">
                  AI entity extraction verified room and triggered blast radius mapping.
                </p>
              </div>

              {extractedPreview.extraction && (
                <div className="p-4 bg-white border-2 border-[#18181B] rounded-xl space-y-2 text-xs font-mono">
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-zinc-500">CATEGORY:</span>
                    <span className="font-bold">{extractedPreview.extraction.category}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-zinc-500">URGENCY:</span>
                    <span className="font-bold text-red-600">{extractedPreview.extraction.urgency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">CONFIDENCE:</span>
                    <span className="font-bold">{Math.round((extractedPreview.extraction.confidence || 0.9) * 100)}%</span>
                  </div>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-2.5 btn-brutal-black text-xs font-black uppercase tracking-wide"
              >
                Return to Command Center
              </button>
            </div>
          ) : (
            /* INPUT FORM MATCHING REFERENCE IMAGE 1 */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-[#18181B] mb-1.5 flex items-center justify-between">
                  <span>Describe the issue in Natural Language</span>
                  <span className="text-[10px] text-zinc-500 font-mono">AI Parser Enabled</span>
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="e.g. Main power tripped in Hall B-204! CS301 final exam scheduled in 45 minutes with 120 students..."
                  rows={4}
                  className="w-full p-3 text-xs input-brutal resize-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-[#18181B] mb-1.5">
                  Room or Location Hint <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={roomHint}
                  onChange={(e) => setRoomHint(e.target.value)}
                  placeholder="e.g. B-204 or Lab A-301"
                  className="w-full px-3 py-2 text-xs input-brutal font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!text.trim() || submitting}
                  className="w-full py-3 btn-brutal-pink text-xs font-black flex items-center justify-center gap-2 uppercase tracking-wide disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Parsing with Gemini &amp; Mapping Blast Radius...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 stroke-[2.5]" />
                      <span>Submit Incident Report</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
