'use client';

import { Shield, Plus, RotateCcw, ChevronDown } from 'lucide-react';
import { USER_ROLES, type UserRole } from '@/lib/domain/enums';
import { EXPERIENCE_LABELS, experienceForActor } from '@/lib/governance/rbac';

interface NavbarProps {
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
  onReport: () => void;
  onReset: () => void;
}

export function Navbar({ role, onRoleChange, onReport, onReset }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-[1600px] mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-600" />
          <span className="font-bold text-lg tracking-tight">Aegis</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">Campus Recovery</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Role switcher (demo only) */}
          <div className="relative">
            <select
              value={role}
              onChange={(e) => onRoleChange(e.target.value as UserRole)}
              className="appearance-none bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-1.5 pr-8 text-sm font-medium border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {USER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
          </div>

          <button
            onClick={onReport}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Report
          </button>

          <button
            onClick={onReset}
            className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors border border-gray-200 dark:border-gray-700"
            title="Reset demo data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </nav>
  );
}
