'use client';

import React, { useState } from 'react';
import { MapPin, Zap, Wind, Wifi, Users, CheckCircle2, AlertTriangle, Shield, RefreshCw } from 'lucide-react';
import { PersonaProfile } from '@/types/personas';

interface RoomData {
  id: string;
  code: string;
  name: string;
  building: string;
  floor: string;
  capacity: number;
  status: 'OPERATIONAL' | 'RELOCATED' | 'ALERT' | 'STANDBY';
  power: string;
  temperature: string;
  network: string;
  activeCourse?: string;
  activeProctors?: string;
  notes: string;
}

interface CampusRoomsLabsViewProps {
  persona: PersonaProfile;
  onOpenCockpit?: () => void;
}

export const CampusRoomsLabsView: React.FC<CampusRoomsLabsViewProps> = ({ persona, onOpenCockpit }) => {
  const [rooms, setRooms] = useState<RoomData[]>([
    {
      id: 'room-1',
      code: 'B-204',
      name: 'Lecture Theatre B-204',
      building: 'B Block',
      floor: '2nd Floor',
      capacity: 200,
      status: 'RELOCATED',
      power: '⚡ 0V (Breaker Tripped)',
      temperature: '25.4°C (Nominal)',
      network: '📶 AP-B204 (Online)',
      activeCourse: 'CS301 / EE301 Midterm Examination',
      activeProctors: 'Dr. K. Raman + 2 Invigilators',
      notes: 'Continuity relocated to Library Hall A. Technician Rajesh Kumar replacing 63A MCB.',
    },
    {
      id: 'room-2',
      code: 'LIB-HALL',
      name: 'Library Hall A (Target Relocation)',
      building: 'Library Block',
      floor: '3rd Floor',
      capacity: 220,
      status: 'OPERATIONAL',
      power: '⚡ 230V Stable (Dual Feed)',
      temperature: '21.5°C (Chilled)',
      network: '📶 802.11ax High Density',
      activeCourse: 'EE301 Midterm Examination (Relocated Session)',
      activeProctors: 'Dr. K. Raman (Active)',
      notes: 'Passed all 4 deterministic safety checks. 180 students accommodated with zero delay.',
    },
    {
      id: 'room-3',
      code: 'LAB-A301',
      name: 'Electrical Machines & Power Lab',
      building: 'Engineering Block',
      floor: '1st Floor',
      capacity: 60,
      status: 'OPERATIONAL',
      power: '⚡ 415V 3-Phase Calibrated',
      temperature: '22.0°C',
      network: '📶 Gigabit Ethernet LAN',
      activeCourse: 'EE204 Machines Practical',
      notes: 'Motor test bench #4 recalibrated by Facilities.',
    },
    {
      id: 'room-4',
      code: 'AUD-WEST',
      name: 'Auditorium West (Cultural & Lecture)',
      building: 'Main Block',
      floor: 'Ground Floor',
      capacity: 150,
      status: 'STANDBY',
      power: '⚡ 230V Nominal',
      temperature: '21.0°C',
      network: '📶 Public Wi-Fi Active',
      activeCourse: 'Vacant (Available for Afternoon Session)',
      notes: 'Backup hall option. Setup lead time: 15 minutes.',
    },
    {
      id: 'room-5',
      code: 'MECH-GND',
      name: 'Mechanical Heavy Machinery Workshop',
      building: 'Workshop Yard',
      floor: 'Ground Floor',
      capacity: 100,
      status: 'OPERATIONAL',
      power: '⚡ Sub-station Transformer Feeder #1',
      temperature: '26.1°C',
      network: '📶 Industrial Wi-Fi Mesh',
      activeCourse: 'ME102 Foundry & Welding Lab',
      notes: 'Water filtration line inspected today.',
    },
    {
      id: 'room-6',
      code: 'SRV-C1',
      name: 'Campus Primary Data Center C-1',
      building: 'IT Tower',
      floor: '1st Floor',
      capacity: 20,
      status: 'OPERATIONAL',
      power: '⚡ 40kVA Online UPS (N+1 Redundant)',
      temperature: '19.8°C (Precision CRAC)',
      network: '📶 10Gbps Dark Fibre Backbone',
      activeCourse: 'Campus Core Infrastructure Hosting',
      notes: 'Battery bank float voltage optimal at 13.6V per jar.',
    },
    {
      id: 'room-7',
      code: 'STORES-ENG',
      name: 'Central Engineering Stores & Spare Parts',
      building: 'Administrative Block',
      floor: 'Basement Floor',
      capacity: 30,
      status: 'OPERATIONAL',
      power: '⚡ 230V Dedicated',
      temperature: '23.0°C (Dehumidified)',
      network: '📶 Stores ERP Scanner Network',
      activeCourse: 'Inventory Logistics Management',
      notes: '42 SKUs logged. 1x 63A MCB currently reserved for Hall B-204 work order.',
    },
  ]);

  const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSimulateCircuitTest = (roomCode: string) => {
    setToastMessage(`⚡ Circuit telemetry pinged for ${roomCode}: Voltage 230.4V ± 1.2%, Load 42% nominal.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="card-brutal p-3 bg-[#DCFCE7] border-2 border-[#18181B] text-xs font-bold text-emerald-900 flex items-center gap-2 shadow-brutal-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="card-brutal p-5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#7DD3FC] border-2 border-[#18181B] flex items-center justify-center font-black text-sm shadow-brutal-sm">
              🏢
            </span>
            <h2 className="text-lg font-black text-[#18181B] uppercase tracking-tight">
              Campus Rooms, Labs & Infrastructure Radar
            </h2>
          </div>
          <p className="text-xs text-zinc-600 mt-1 font-medium">
            Live telemetry, power circuits, HVAC climate metrics, and room reservations across all 7 monitored campus zones.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="badge-sticker bg-[#86EFAC] text-xs font-mono">
            6 / 7 OPERATIONAL
          </span>
          {onOpenCockpit && (
            <button
              onClick={onOpenCockpit}
              className="btn-brutal-pink px-3 py-1.5 text-xs font-black flex items-center gap-1.5"
            >
              <span>Blast Radius AI</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of 7 Campus Locations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {rooms.map((room) => {
          const isRelocated = room.status === 'RELOCATED';
          const isOperational = room.status === 'OPERATIONAL';

          return (
            <div
              key={room.id}
              className={`card-brutal p-4 flex flex-col justify-between transition-all ${
                isRelocated
                  ? 'bg-[#FEF9C3] border-amber-500'
                  : isOperational
                  ? 'bg-white hover:bg-emerald-50/30'
                  : 'bg-zinc-50'
              }`}
            >
              <div>
                {/* Top Location Header */}
                <div className="flex items-start justify-between pb-2 border-b-2 border-zinc-100">
                  <div>
                    <span className="text-[10px] font-mono font-black uppercase text-zinc-500">
                      {room.building} · {room.floor}
                    </span>
                    <h3 className="text-sm font-black text-[#18181B] mt-0.5">{room.code}</h3>
                    <p className="text-xs font-bold text-zinc-700">{room.name}</p>
                  </div>

                  <span
                    className={`badge-sticker text-[9px] py-0 px-2 ${
                      isRelocated
                        ? 'bg-amber-300 text-amber-950 font-black'
                        : isOperational
                        ? 'bg-[#86EFAC] text-emerald-950'
                        : 'bg-zinc-200 text-zinc-800'
                    }`}
                  >
                    {room.status}
                  </span>
                </div>

                {/* Capacity & Course */}
                <div className="my-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-zinc-600 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Capacity:</span>
                    </span>
                    <span className="font-mono font-bold text-[#18181B]">{room.capacity} seats</span>
                  </div>

                  {room.activeCourse && (
                    <div className="p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-[11px] font-medium text-zinc-800">
                      <span className="text-[9px] font-mono font-bold text-zinc-500 block">CURRENT SESSION:</span>
                      {room.activeCourse}
                    </div>
                  )}

                  {/* Telemetry Chips */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] font-mono font-bold">
                    <div className="p-1.5 rounded bg-zinc-100 border border-black/10 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-600 shrink-0" />
                      <span className="truncate">{room.power}</span>
                    </div>
                    <div className="p-1.5 rounded bg-zinc-100 border border-black/10 flex items-center gap-1">
                      <Wind className="w-3 h-3 text-sky-600 shrink-0" />
                      <span className="truncate">{room.temperature}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t-2 border-zinc-100 flex items-center justify-between">
                <button
                  onClick={() => setSelectedRoom(room)}
                  className="text-xs font-black text-[#18181B] hover:underline"
                >
                  View Telemetry Details →
                </button>
                <button
                  onClick={() => handleSimulateCircuitTest(room.code)}
                  className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 border border-black rounded text-[10px] font-mono font-bold"
                  title="Ping Power Circuit Telemetry"
                >
                  Test Grid
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Room Detail Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-[#FAF9F5] border-[3px] border-[#18181B] rounded-2xl shadow-brutal-xl p-6">
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#18181B]">
              <div className="flex items-center gap-2">
                <span className="badge-sticker bg-[#FEF9C3] text-xs font-mono">{selectedRoom.code}</span>
                <h3 className="text-base font-black text-[#18181B]">{selectedRoom.name}</h3>
              </div>
              <button
                onClick={() => setSelectedRoom(null)}
                className="w-7 h-7 rounded-lg bg-zinc-100 border-2 border-black flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 bg-white rounded border border-black">
                  <span className="text-zinc-500 block">POWER SUPPLY:</span>
                  <span className="font-bold text-[#18181B]">{selectedRoom.power}</span>
                </div>
                <div className="p-2 bg-white rounded border border-black">
                  <span className="text-zinc-500 block">CLIMATE / HVAC:</span>
                  <span className="font-bold text-[#18181B]">{selectedRoom.temperature}</span>
                </div>
                <div className="p-2 bg-white rounded border border-black">
                  <span className="text-zinc-500 block">NETWORK INFRA:</span>
                  <span className="font-bold text-[#18181B]">{selectedRoom.network}</span>
                </div>
                <div className="p-2 bg-white rounded border border-black">
                  <span className="text-zinc-500 block">RATED CAPACITY:</span>
                  <span className="font-bold text-[#18181B]">{selectedRoom.capacity} Occupants</span>
                </div>
              </div>

              <div className="p-3 bg-[#DCFCE7] rounded-xl border border-black text-xs">
                <span className="font-black text-emerald-950 block">OPERATIONAL LOG:</span>
                <p className="text-zinc-800 mt-1">{selectedRoom.notes}</p>
              </div>
            </div>

            <button
              onClick={() => setSelectedRoom(null)}
              className="w-full py-2 btn-brutal-yellow text-xs font-black uppercase shadow-brutal-sm"
            >
              Close Telemetry Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
