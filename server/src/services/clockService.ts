import type { Prisma, PrismaClient } from '@prisma/client';

const CLOCK_ID = 1;

type Db = Prisma.TransactionClient | PrismaClient;

export async function getClockNow(db: Db): Promise<Date> {
  const state = await db.clockState.findUnique({ where: { id: CLOCK_ID } });
  if (state) return state.currentTime;
  const created = await db.clockState.create({ data: { id: CLOCK_ID, currentTime: new Date() } });
  return created.currentTime;
}

export async function setClockNow(db: PrismaClient, currentTime: Date): Promise<Date> {
  const state = await db.clockState.upsert({
    where: { id: CLOCK_ID },
    update: { currentTime },
    create: { id: CLOCK_ID, currentTime }
  });
  return state.currentTime;
}

export async function advanceClock(db: PrismaClient, durationMs: number): Promise<Date> {
  const current = await getClockNow(db);
  return setClockNow(db, new Date(current.getTime() + durationMs));
}
