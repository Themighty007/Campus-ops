'use client';

import React, { useState } from 'react';
import { Package, CheckCircle2, Clock, AlertTriangle, ArrowRight, Plus, RefreshCw, BarChart2 } from 'lucide-react';
import { PersonaProfile } from '@/types/personas';

interface InventoryDashboardProps {
  persona: PersonaProfile;
}

export const InventoryDashboard: React.FC<InventoryDashboardProps> = ({ persona }) => {
  // Inventory Stock
  const [parts, setParts] = useState([
    {
      sku: 'MCB-63A-3P',
      name: 'Triple Pole 63A Miniature Circuit Breaker (10kA)',
      category: 'ELECTRICAL',
      inStock: 2,
      reserved: 1,
      minThreshold: 2,
      unitCost: '₹1,450',
      status: 'RESERVED_ACTIVE',
    },
    {
      sku: 'CAT6-50M-SHLD',
      name: 'Shielded Twisted Pair Cat6 Ethernet Cable Drum',
      category: 'NETWORK',
      inStock: 14,
      reserved: 0,
      minThreshold: 5,
      unitCost: '₹3,200',
      status: 'SUFFICIENT',
    },
    {
      sku: 'R410A-11KG',
      name: 'Eco-Friendly Refrigerant Gas Cylinder (HVAC Chiller)',
      category: 'HVAC',
      inStock: 4,
      reserved: 0,
      minThreshold: 2,
      unitCost: '₹8,500',
      status: 'SUFFICIENT',
    },
    {
      sku: 'DG-FILTER-40KVA',
      name: 'Diesel Generator High-Flow Oil Filter Cartridge',
      category: 'POWER',
      inStock: 3,
      reserved: 0,
      minThreshold: 2,
      unitCost: '₹980',
      status: 'SUFFICIENT',
    },
  ]);

  // Requisitions from technicians
  const [requisitions, setRequisitions] = useState([
    {
      id: 'REQ-8821',
      technician: 'Rajesh Kumar (Lead Tech)',
      sku: 'MCB-63A-3P',
      quantity: 1,
      targetIncident: 'Hall B-204 Main Power Outage',
      urgency: 'HIGH_EXAM',
      status: 'AWAITING_STORES_APPROVAL',
    },
  ]);

  const [toast, setToast] = useState<string | null>(null);

  const handleApproveRequisition = (reqId: string) => {
    setRequisitions(
      requisitions.map((r) => (r.id === reqId ? { ...r, status: 'DISPATCHED_TO_TECH' } : r))
    );
    setToast('✓ Requisition REQ-8821 approved! MCB-63A-3P dispatched to Rajesh Kumar.');
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="card-brutal p-3 bg-[#DCFCE7] border-2 border-[#18181B] text-xs font-bold text-emerald-900 flex items-center gap-2 shadow-brutal-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-brutal p-4 bg-[#FEF9C3]">
          <span className="text-xs font-black uppercase text-zinc-700">SKUs Monitored</span>
          <div className="mt-2">
            <span className="text-3xl font-black text-[#18181B]">{parts.length}</span>
            <p className="text-[11px] font-bold text-amber-900 mt-1">Electrical, HVAC, LAN</p>
          </div>
        </div>

        <div className="card-brutal p-4 bg-[#DCFCE7]">
          <span className="text-xs font-black uppercase text-zinc-700">Stock Availability</span>
          <div className="mt-2">
            <span className="text-3xl font-black text-[#18181B]">98.2%</span>
            <p className="text-[11px] font-bold text-emerald-800 mt-1">Zero Stockouts This Term</p>
          </div>
        </div>

        <div className="card-brutal p-4 bg-[#E0F2FE]">
          <span className="text-xs font-black uppercase text-zinc-700">Active Reservations</span>
          <div className="mt-2">
            <span className="text-3xl font-black text-[#18181B]">1</span>
            <p className="text-[11px] font-bold text-sky-900 mt-1">1x 63A MCB for B-204</p>
          </div>
        </div>

        <div className="card-brutal p-4 bg-[#FCE7F3]">
          <span className="text-xs font-black uppercase text-zinc-700">Procurement Budget</span>
          <div className="mt-2">
            <span className="text-2xl font-black text-[#18181B]">₹42,500</span>
            <p className="text-[11px] font-bold text-pink-900 mt-1">Remaining Monthly Cap</p>
          </div>
        </div>
      </div>

      {/* Technician Requisitions Approval Section */}
      <div className="card-brutal p-5 bg-white">
        <div className="flex items-center justify-between pb-3 border-b-2 border-zinc-100 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">📦</span>
            <div>
              <h3 className="font-black text-sm text-[#18181B] uppercase">
                Technician Part Requisitions
              </h3>
              <p className="text-xs text-zinc-500">
                Approvals for field repairs and spare parts allocation
              </p>
            </div>
          </div>
          <span className="badge-sticker bg-[#FEF9C3] text-[10px]">1 PENDING</span>
        </div>

        <div className="space-y-3">
          {requisitions.map((req) => (
            <div
              key={req.id}
              className="p-3.5 rounded-xl border-2 border-[#18181B] bg-zinc-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="badge-sticker bg-[#FDE047] text-[9px]">{req.id}</span>
                  <span className="text-xs font-black text-[#18181B]">{req.technician}</span>
                  <span className="badge-sticker bg-red-100 text-red-900 text-[9px]">
                    {req.urgency}
                  </span>
                </div>
                <p className="text-xs font-bold text-zinc-800 mt-1">
                  Requested: {req.quantity}x {req.sku}
                </p>
                <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                  Target: {req.targetIncident}
                </p>
              </div>

              {req.status === 'AWAITING_STORES_APPROVAL' ? (
                <button
                  onClick={() => handleApproveRequisition(req.id)}
                  className="btn-brutal-green px-4 py-2 text-xs font-black flex items-center gap-1.5 shadow-brutal-sm shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Approve & Dispatch</span>
                </button>
              ) : (
                <span className="badge-sticker bg-[#86EFAC] text-emerald-950 text-xs py-1 px-3">
                  ✓ DISPATCHED TO RAJESH
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Stores Stock Master Table + Depletion Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stores Master Table */}
        <div className="lg:col-span-2 card-brutal p-5 bg-white">
          <div className="flex items-center justify-between pb-3 border-b-2 border-zinc-100 mb-3">
            <h3 className="font-black text-sm text-[#18181B] uppercase">
              Central Engineering Stores Inventory
            </h3>
            <span className="badge-sticker bg-zinc-100 text-[10px]">ALL LOGGED</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-2 border-[#18181B] bg-zinc-50 text-[10px] font-mono uppercase text-zinc-500">
                  <th className="py-2 px-2.5">SKU</th>
                  <th className="py-2 px-2.5">Item Description</th>
                  <th className="py-2 px-2.5">Available</th>
                  <th className="py-2 px-2.5">Reserved</th>
                  <th className="py-2 px-2.5">Unit Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {parts.map((p, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50">
                    <td className="py-2.5 px-2.5 font-mono font-bold text-[#18181B]">{p.sku}</td>
                    <td className="py-2.5 px-2.5 font-medium text-zinc-800">{p.name}</td>
                    <td className="py-2.5 px-2.5 font-mono font-black text-emerald-700">{p.inStock}</td>
                    <td className="py-2.5 px-2.5 font-mono font-black text-amber-700">{p.reserved}</td>
                    <td className="py-2.5 px-2.5 font-mono text-zinc-600">{p.unitCost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Depletion Bar Chart */}
        <div className="card-brutal p-4 bg-white flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 mb-2">
              <span className="text-xs font-black uppercase text-[#18181B]">Category Usage</span>
              <span className="badge-sticker bg-[#FEF9C3] text-[9px]">30 DAYS</span>
            </div>

            <div className="space-y-3 mt-4">
              <div>
                <div className="flex justify-between text-[11px] font-mono font-bold mb-1">
                  <span>Electrical (MCBs, Fuses)</span>
                  <span className="text-emerald-700">62%</span>
                </div>
                <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden border border-black/20">
                  <div className="h-full bg-[#86EFAC]" style={{ width: '62%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono font-bold mb-1">
                  <span>Network (Cat6, RJ45)</span>
                  <span className="text-sky-700">24%</span>
                </div>
                <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden border border-black/20">
                  <div className="h-full bg-[#7DD3FC]" style={{ width: '24%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono font-bold mb-1">
                  <span>HVAC (Coolant, Filters)</span>
                  <span className="text-pink-700">14%</span>
                </div>
                <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden border border-black/20">
                  <div className="h-full bg-[#F472B6]" style={{ width: '14%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-zinc-100 text-[10px] font-mono text-zinc-500">
            Total Parts Dispatched: 38 items
          </div>
        </div>
      </div>
    </div>
  );
};
