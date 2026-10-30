import { NextRequest, NextResponse } from 'next/server';
import {
  REDIS_BOXES,
  RedisBoxId,
  getRedisBoxEvents,
  publishToRedisBox,
  resetAllRedisBoxes,
} from '@/lib/redis/redisClient';

/**
 * GET /api/redis/sync?box={student|staff|technician|superadmin|depthead}
 * Retrieves current queued events in the specified box.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const boxParam = searchParams.get('box') as RedisBoxId | null;

    if (!boxParam || !REDIS_BOXES[boxParam]) {
      // If no box specified, return a summary of all 5 boxes
      const summary = (Object.keys(REDIS_BOXES) as RedisBoxId[]).map((boxId) => ({
        box: boxId,
        name: REDIS_BOXES[boxId].name,
        channel: REDIS_BOXES[boxId].channel,
        eventCount: getRedisBoxEvents(boxId).length,
        latestEvent: getRedisBoxEvents(boxId)[0] || null,
      }));

      return NextResponse.json({
        status: 'OK',
        activeBoxes: 5,
        boxes: summary,
      });
    }

    const events = getRedisBoxEvents(boxParam);
    return NextResponse.json({
      box: boxParam,
      name: REDIS_BOXES[boxParam].name,
      channel: REDIS_BOXES[boxParam].channel,
      events,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/redis/sync
 * Publishes an event to a specified box and dispatches cross-box pipelines.
 * 
 * Body: { box: RedisBoxId, type: string, payload: any, action?: 'RESET' }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'RESET') {
      resetAllRedisBoxes();
      return NextResponse.json({ success: true, message: 'All 5 Redis boxes reset to initial state.' });
    }

    const { box, type, payload } = body;
    if (!box || !REDIS_BOXES[box as RedisBoxId]) {
      return NextResponse.json(
        { error: `Invalid or missing 'box'. Allowed: student, staff, technician, superadmin, depthead` },
        { status: 400 }
      );
    }
    if (!type || !payload) {
      return NextResponse.json(
        { error: `Both 'type' and 'payload' are required to publish an event.` },
        { status: 400 }
      );
    }

    const event = await publishToRedisBox(box as RedisBoxId, type, payload);

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
