'use client';

import { useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';

interface ReportModalProps {
  onSubmit: (text: string, roomHint?: string) => Promise<any>;
  onClose: () => void;
}

export function ReportModal({ onSubmit, onClose }: ReportModalProps) {
  const [text, setText] = useState('');
  const [roomHint, setRoomHint] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const data = await onSubmit(text, roomHint || undefined);
      if (data?.incident) {
        setResult(data);
      }
    } catch {
      // error handled by parent
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold">Report an Issue</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {result ? (
          <div className="p-5 space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                ✅ Report submitted — {result.incident?.code}
              </p>
            </div>

            {result.extraction && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Category</span>
                  <span className="font-medium">{result.extraction.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Severity</span>
                  <span className={`severity-${result.incident?.severity} status-badge`}>
                    {result.incident?.severity}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Source</span>
                  <span>{result.extraction.source}</span>
                </div>
                {result.extraction.confidence !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Confidence</span>
                    <span>{Math.round(result.extraction.confidence * 100)}%</span>
                  </div>
                )}
              </div>
            )}

            {result.clarifyingQuestion && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-sm border border-yellow-200 dark:border-yellow-800">
                <p className="font-medium text-yellow-800 dark:text-yellow-300">❓ Follow-up needed:</p>
                <p className="text-yellow-700 dark:text-yellow-400">{result.clarifyingQuestion}</p>
              </div>
            )}

            {result.blastRadius && result.blastRadius.affectedActivities > 0 && (
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-sm border border-orange-200 dark:border-orange-800">
                <p className="font-medium text-orange-800 dark:text-orange-300">
                  ⚠ Blast radius: {result.blastRadius.affectedActivities} activities, {result.blastRadius.affectedPeople} people affected
                </p>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Describe the issue in natural language
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. The lights went off in room B-204 and there's an exam in 45 minutes with 120 students..."
                rows={4}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Room code <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={roomHint}
                onChange={(e) => setRoomHint(e.target.value)}
                placeholder="e.g. B-204"
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={!text.trim() || submitting}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing & Creating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Report
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
