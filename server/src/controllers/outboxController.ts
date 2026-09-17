import type { Request, Response } from 'express';
import { prisma } from '../db.js';
import { getClockNow } from '../services/clockService.js';

export async function listOutboxController(req: Request, res: Response) {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 100)));
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const items = await prisma.outboxEvent.findMany({
    where: status === 'processed' ? { status: 'PROCESSED' } : status === 'all' ? undefined : { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { id: true, eventType: true, aggregateType: true, aggregateId: true, payload: true, status: true, attempts: true, availableAt: true, createdAt: true, processedAt: true }
  });
  res.json({ items, count: items.length });
}

export async function acknowledgeOutboxController(req: Request, res: Response) {
  const body = req.body as { id?: string; ids?: string[] };
  const ids = body.ids ?? (body.id ? [body.id] : []);
  if (ids.length === 0) {
    res.status(400).json({ error: { code: 'OUTBOX_IDS_REQUIRED', message: 'Provide id or ids.' } });
    return;
  }
  const now = await getClockNow(prisma);
  const result = await prisma.outboxEvent.updateMany({
    where: { id: { in: ids }, status: 'PENDING' },
    data: { status: 'PROCESSED', processedAt: now, attempts: { increment: 1 } }
  });
  res.json({ success: true, processed: result.count });
}
