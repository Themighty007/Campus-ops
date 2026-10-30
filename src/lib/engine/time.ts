export const MINUTE = 60_000;

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MINUTE);
}

export function minutesBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / MINUTE;
}

/** Half-open interval overlap: [aStart, aEnd) ∩ [bStart, bEnd) ≠ ∅ */
export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function coversWindow(
  shift: { startsAt: Date; endsAt: Date },
  start: Date,
  end: Date,
): boolean {
  return shift.startsAt <= start && shift.endsAt >= end;
}

export function isWithinWindow(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end;
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) return 'under a minute';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}
