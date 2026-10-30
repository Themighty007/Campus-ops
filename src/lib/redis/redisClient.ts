/**
 * Aegis Redis Multi-Instance & Cross-Role Synchronizer
 * 
 * Provides 5 isolated Redis namespaces/boxes for the 5 campus roles:
 *  1. student    -> aegis:box:student    (channel: aegis:channel:student)
 *  2. staff      -> aegis:box:teacher    (channel: aegis:channel:teacher)
 *  3. technician -> aegis:box:technician (channel: aegis:channel:technician)
 *  4. superadmin -> aegis:box:superadmin (channel: aegis:channel:superadmin)
 *  5. depthead   -> aegis:box:depthead   (channel: aegis:channel:depthead)
 * 
 * Features:
 *  - Real ioredis client integration if REDIS_URL is provided in environment.
 *  - High-performance, zero-crash in-memory persistent pub/sub bus for local dev.
 *  - Shared globalThis singleton ensuring events propagate instantaneously across all API calls and sessions.
 */

import Redis from 'ioredis';

export type RedisBoxId = 'student' | 'staff' | 'technician' | 'superadmin' | 'depthead';

export interface RedisBoxConfig {
  id: RedisBoxId;
  name: string;
  role: string;
  keyPrefix: string;
  channel: string;
  description: string;
}

export const REDIS_BOXES: Record<RedisBoxId, RedisBoxConfig> = {
  student: {
    id: 'student',
    name: 'Student Box (Aarav Patel)',
    role: 'REQUESTER',
    keyPrefix: 'aegis:box:student',
    channel: 'aegis:channel:student',
    description: 'Receives ticket receipts, status progression, and the final resolution notification: "This issue has been solved. Thank you for notifying us."',
  },
  staff: {
    id: 'staff',
    name: 'Staff & Faculty Box (Dr. Raman / Prof. Sen)',
    role: 'DEPARTMENT_MANAGER',
    keyPrefix: 'aegis:box:teacher',
    channel: 'aegis:channel:teacher',
    description: 'Receives room power alerts, academic continuity notices, and exam shield activations.',
  },
  technician: {
    id: 'technician',
    name: 'Field Technician Box (Rajesh Kumar)',
    role: 'TECHNICIAN',
    keyPrefix: 'aegis:box:technician',
    channel: 'aegis:channel:technician',
    description: 'Receives dispatched work orders with student-submitted photo evidence and parts requisition approvals.',
  },
  superadmin: {
    id: 'superadmin',
    name: 'Super Admin Command Box (Chief Controller)',
    role: 'FACILITIES_ADMIN',
    keyPrefix: 'aegis:box:superadmin',
    channel: 'aegis:channel:superadmin',
    description: 'Receives incoming student query reports with uploaded photos for immediate YES/NO Human-in-the-Loop approval.',
  },
  depthead: {
    id: 'depthead',
    name: 'Department In-Charge Box (EEE Dept Head)',
    role: 'DEPARTMENT_MANAGER',
    keyPrefix: 'aegis:box:depthead',
    channel: 'aegis:channel:depthead',
    description: 'Receives departmental-only incident streams, lab health metrics, and electrical grid status.',
  },
};

export interface RedisEvent {
  id: string;
  box: RedisBoxId;
  type: string;
  timestamp: string;
  payload: any;
}

// Global In-Memory Singleton Store across hot reloads & worker threads
interface GlobalRedisStore {
  boxes: Record<RedisBoxId, RedisEvent[]>;
  listeners: Record<string, ((event: RedisEvent) => void)[]>;
  ioRedisClient: Redis | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __AEGIS_REDIS_STORE__: GlobalRedisStore | undefined;
}

function initGlobalStore(): GlobalRedisStore {
  if (!globalThis.__AEGIS_REDIS_STORE__) {
    // Attempt ioredis connection if REDIS_URL exists
    let ioClient: Redis | null = null;
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl && redisUrl.startsWith('redis')) {
      try {
        ioClient = new Redis(redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          retryStrategy: () => null, // don't hang if offline
        });
        ioClient.connect().catch(() => {
          // Fall back gracefully to memory bus
          ioClient = null;
        });
      } catch {
        ioClient = null;
      }
    }

    const initialBoxes: Record<RedisBoxId, RedisEvent[]> = {
      student: [
        {
          id: 'evt-init-stu-1',
          box: 'student',
          type: 'TICKET_SUBMITTED',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          payload: {
            ticketId: 'INC-01000',
            summary: 'Main circuit breaker tripped in Exam Hall B-204',
            roomCode: 'Hall B-204',
            status: 'REPORTED',
            photoUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop',
            note: 'Your report was received. Super Admin review in progress.',
          },
        },
      ],
      staff: [
        {
          id: 'evt-init-stf-1',
          box: 'staff',
          type: 'HALL_AT_RISK',
          timestamp: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
          payload: {
            roomCode: 'Hall B-204',
            course: 'EE301 Power Systems Exam',
            studentsCount: 120,
            status: 'STANDBY_RELOCATION',
            backupHall: 'Mech Audi 101',
          },
        },
      ],
      technician: [
        {
          id: 'evt-init-tech-1',
          box: 'technician',
          type: 'WORK_ORDER_DISPATCHED',
          timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          payload: {
            workOrderId: 'WO-8821',
            incidentId: 'INC-01000',
            title: 'Replace Tripped 63A MCB Breaker (Panel E-4)',
            roomCode: 'Hall B-204',
            priority: 'P1_CRITICAL',
            allocatedPart: 'MCB-63A-3P (3-Pole 10kA)',
            photoUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop',
            stage: 'ASSIGNED',
            assignedTo: 'Rajesh Kumar',
          },
        },
      ],
      superadmin: [
        {
          id: 'evt-init-adm-1',
          box: 'superadmin',
          type: 'NEW_INCIDENT_REPORTED',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          payload: {
            incidentId: 'INC-01000',
            reporter: 'Aarav Patel (Roll #22CS045)',
            roomCode: 'Hall B-204',
            category: 'ELECTRICAL',
            severity: 'P1',
            summary: 'Main circuit breaker tripped in Exam Hall B-204',
            photoUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&auto=format&fit=crop',
            aiTriageScore: 0.96,
            requiresApproval: true,
            proposedAction: 'Plan Alpha: Rapid Switch to Backup Generator + Dispatch Rajesh Kumar',
          },
        },
      ],
      depthead: [
        {
          id: 'evt-init-dept-1',
          box: 'depthead',
          type: 'EEE_POWER_TRIP',
          timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          payload: {
            department: 'Electrical & Electronics Engineering',
            affectedHall: 'Hall B-204',
            asset: 'Breaker Panel B-01',
            safetyClearance: 'PENDING_FIELD_INSPECTION',
          },
        },
      ],
    };

    globalThis.__AEGIS_REDIS_STORE__ = {
      boxes: initialBoxes,
      listeners: {},
      ioRedisClient: ioClient,
    };
  }

  return globalThis.__AEGIS_REDIS_STORE__;
}

/**
 * Publish an event to one of the 5 Redis boxes.
 */
export async function publishToRedisBox(
  boxId: RedisBoxId,
  type: string,
  payload: any
): Promise<RedisEvent> {
  const store = initGlobalStore();
  const config = REDIS_BOXES[boxId];
  if (!config) throw new Error(`Unknown Redis Box ID: ${boxId}`);

  const event: RedisEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    box: boxId,
    type,
    timestamp: new Date().toISOString(),
    payload,
  };

  // 1. In-memory append to the box queue (most recent first)
  if (!store.boxes[boxId]) {
    store.boxes[boxId] = [];
  }
  store.boxes[boxId].unshift(event);

  // Keep max 50 events per box to avoid memory bloat
  if (store.boxes[boxId].length > 50) {
    store.boxes[boxId] = store.boxes[boxId].slice(0, 50);
  }

  // 2. Trigger active in-memory listeners
  const channelListeners = store.listeners[config.channel] || [];
  channelListeners.forEach((fn) => {
    try {
      fn(event);
    } catch (err) {
      console.error(`Error in Redis subscriber for ${config.channel}:`, err);
    }
  });

  // 3. If real ioredis client is connected, publish over network
  if (store.ioRedisClient && store.ioRedisClient.status === 'ready') {
    try {
      await store.ioRedisClient.publish(config.channel, JSON.stringify(event));
      await store.ioRedisClient.lpush(`${config.keyPrefix}:events`, JSON.stringify(event));
      await store.ioRedisClient.ltrim(`${config.keyPrefix}:events`, 0, 49);
    } catch {
      // Non-blocking fallback
    }
  }

  return event;
}

/**
 * Read all events currently stored in a given Redis box.
 */
export function getRedisBoxEvents(boxId: RedisBoxId): RedisEvent[] {
  const store = initGlobalStore();
  return store.boxes[boxId] || [];
}

/**
 * Clear events in a box (e.g. for testing / demo reset).
 */
export function clearRedisBox(boxId: RedisBoxId): void {
  const store = initGlobalStore();
  store.boxes[boxId] = [];
}

/**
 * Reset all 5 Redis boxes to standard initial state.
 */
export function resetAllRedisBoxes(): void {
  delete globalThis.__AEGIS_REDIS_STORE__;
  initGlobalStore();
}
