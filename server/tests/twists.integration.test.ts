import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { prisma } from '../src/db.js';

const hasDatabase = Boolean(process.env.DATABASE_URL && process.env.RUN_DB_TESTS === 'true');

describe.skipIf(!hasDatabase)('updated challenge twist integration tests', () => {
  let userId = '';
  const createdMemberIds: string[] = [];

  beforeAll(async () => {
    const email = `twist-test-${Date.now()}@example.test`;
    const passwordHash = await bcrypt.hash('TwistTest123!', 4);
    const user = await prisma.user.create({ data: { name: 'Twist Test Staff', email, passwordHash, role: 'STAFF' } });
    userId = user.id;
    await prisma.clockState.upsert({ where: { id: 1 }, update: { currentTime: new Date() }, create: { id: 1, currentTime: new Date() } });
  });

  afterAll(async () => {
    if (createdMemberIds.length) {
      await prisma.outboxEvent.deleteMany({ where: { aggregateId: { in: createdMemberIds } } });
      await prisma.pointLedger.deleteMany({ where: { memberId: { in: createdMemberIds } } });
      await prisma.pointLot.deleteMany({ where: { memberId: { in: createdMemberIds } } });
      await prisma.purchase.deleteMany({ where: { memberId: { in: createdMemberIds } } });
      await prisma.redemption.deleteMany({ where: { memberId: { in: createdMemberIds } } });
      await prisma.member.deleteMany({ where: { id: { in: createdMemberIds } } });
    }
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it('crosses Gold -> Platinum and emits one outbox event', async () => {
    const member = await prisma.member.create({
      data: {
        fullName: 'Platinum Crossing Test',
        phoneNumber: `+1 555 ${Date.now().toString().slice(-7)}`,
        normalizedPhoneNumber: `1555${Date.now().toString().slice(-7)}`,
        lifetimeEarnedPoints: 4990,
        currentPointsBalance: 0,
        currentTier: 'GOLD'
      }
    });
    createdMemberIds.push(member.id);

    const clientRequestId = `platinum-cross-${member.id}`;
    const first = await request(app)
      .post(`/api/members/${member.id}/purchases`)
      .set('Cookie', [])
      .send({ amount: '7.00', currency: 'INR', clientRequestId });

    // Authenticate-free endpoint is not allowed, so seed a valid auth cookie through login.
    expect(first.status).toBe(401);

    const seededUser = await prisma.user.findFirst({ where: { email: 'staff@cafepoints.demo' } });
    if (!seededUser) throw new Error('Run the database seed before the twist integration suite.');
    const login = await request(app).post('/api/auth/login').send({ email: 'staff@cafepoints.demo', password: 'DemoPass123!' });
    expect(login.status).toBe(200);
    const cookies = login.headers['set-cookie'];

    const response = await request(app)
      .post(`/api/members/${member.id}/purchases`)
      .set('Cookie', cookies)
      .send({ amount: '7.00', currency: 'INR', clientRequestId });
    expect(response.status).toBe(200);
    expect(response.body.member.currentTier).toBe('PLATINUM');
    expect(response.body.purchase.tierAtPurchase).toBe('GOLD');
    expect(response.body.purchase.pointsEarned).toBe(10);
    expect(response.body.tierChanged).toBe(true);
    expect(response.body.notificationQueued).toBe(true);

    const replay = await request(app)
      .post(`/api/members/${member.id}/purchases`)
      .set('Cookie', cookies)
      .send({ amount: '7.00', currency: 'INR', clientRequestId });
    expect(replay.status).toBe(200);
    expect(replay.body.purchase.id).toBe(response.body.purchase.id);

    const events = await prisma.outboxEvent.findMany({ where: { aggregateId: member.id, eventType: 'MEMBER_TIER_CHANGED' } });
    expect(events).toHaveLength(1);
  });

  it('expires an old point lot when /clock advances past its expiry', async () => {
    const now = new Date();
    const member = await prisma.member.create({
      data: {
        fullName: 'Expiry Test',
        phoneNumber: `+1 556 ${Date.now().toString().slice(-7)}`,
        normalizedPhoneNumber: `1556${Date.now().toString().slice(-7)}`,
        lifetimeEarnedPoints: 100,
        currentPointsBalance: 100,
        currentTier: 'BRONZE'
      }
    });
    createdMemberIds.push(member.id);
    await prisma.pointLot.create({
      data: {
        memberId: member.id,
        sourceType: 'PURCHASE_EARN',
        originalPoints: 100,
        remainingPoints: 100,
        earnedAt: new Date(now.getTime() - 91 * 86400000),
        expiresAt: new Date(now.getTime() - 1 * 86400000)
      }
    });
    const response = await request(app).post('/clock').send({ now: now.toISOString() });
    expect(response.status).toBe(200);
    expect(response.body.expirationJob.expiredPoints).toBeGreaterThanOrEqual(100);
    const updated = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(updated.currentPointsBalance).toBe(0);
    expect(updated.lifetimeEarnedPoints).toBe(100);
    const ledger = await prisma.pointLedger.findFirst({ where: { memberId: member.id, transactionType: 'EXPIRATION' } });
    expect(ledger?.pointsDelta).toBe(-100);
  });
});
