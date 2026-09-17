import type { Request, Response } from 'express';
import { advanceClock, getClockNow, setClockNow } from '../services/clockService.js';
import { prisma } from '../db.js';
import { runExpirationJob } from '../services/expirationService.js';

function parseRequestedTime(body: Record<string, unknown>, current: Date): Date | null {
  const value = body.now ?? body.at ?? body.date ?? body.iso;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) throw new Error('Invalid clock timestamp.');
    return parsed;
  }

  const durationUnits: Array<[string, number]> = [
    ['advanceDays', 86400000],
    ['advanceHours', 3600000],
    ['advanceMinutes', 60000],
    ['advanceSeconds', 1000]
  ];
  for (const [key, multiplier] of durationUnits) {
    if (body[key] !== undefined) {
      const amount = Number(body[key]);
      if (!Number.isFinite(amount)) throw new Error(`Invalid ${key}.`);
      return new Date(current.getTime() + amount * multiplier);
    }
  }
  return null;
}

export async function postClockController(req: Request, res: Response) {
  const current = await getClockNow(prisma);
  const requested = parseRequestedTime((req.body ?? {}) as Record<string, unknown>, current);
  const updated = requested ? await setClockNow(prisma, requested) : current;
  const result = await runExpirationJob(prisma, updated);
  res.json({ success: true, clock: result.now, expirationJob: result });
}
