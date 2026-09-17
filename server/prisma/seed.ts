import { Prisma, PrismaClient, Tier, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Decimal } from 'decimal.js';

const prisma = new PrismaClient();

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '');
}

function tierForLifetime(lifetime: number) {
  if (lifetime >= 5000) return Tier.PLATINUM;
  if (lifetime >= 1500) return Tier.GOLD;
  if (lifetime >= 500) return Tier.SILVER;
  return Tier.BRONZE;
}

async function consumeSeedLots(tx: Prisma.TransactionClient, memberId: string, points: number) {
  let remaining = points;
  const lots = await tx.pointLot.findMany({ where: { memberId, remainingPoints: { gt: 0 } }, orderBy: [{ expiresAt: 'asc' }, { earnedAt: 'asc' }] });
  for (const lot of lots) {
    if (remaining <= 0) break;
    const consumed = Math.min(remaining, lot.remainingPoints);
    await tx.pointLot.update({ where: { id: lot.id }, data: { remainingPoints: lot.remainingPoints - consumed } });
    remaining -= consumed;
  }
  if (remaining > 0) throw new Error(`Unable to seed redemption for member ${memberId}`);
}

async function main() {
  const seedNow = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.outboxEvent.deleteMany();
    await tx.pointLedger.deleteMany();
    await tx.pointLot.deleteMany();
    await tx.purchase.deleteMany();
    await tx.redemption.deleteMany();
    await tx.member.deleteMany();
    await tx.reward.deleteMany();
    await tx.loyaltyProgram.deleteMany();
    await tx.clockState.deleteMany();
    await tx.user.deleteMany();

    const passwordHash = await bcrypt.hash('DemoPass123!', 12);
    const [staff, manager] = await Promise.all([
      tx.user.create({ data: { name: 'Demo Staff', email: 'staff@cafepoints.demo', passwordHash, role: UserRole.STAFF } }),
      tx.user.create({ data: { name: 'Demo Manager', email: 'manager@cafepoints.demo', passwordHash, role: UserRole.ADMIN } })
    ]);

    await tx.clockState.create({ data: { id: 1, currentTime: seedNow } });

    const program = await tx.loyaltyProgram.create({
      data: {
        name: 'Default Café Programme',
        currency: 'INR',
        baseEarningRate: new Decimal('1.0000'),
        bronzeThreshold: 0,
        silverThreshold: 500,
        goldThreshold: 1500,
        platinumThreshold: 5000,
        bronzeMultiplier: new Decimal('1.00'),
        silverMultiplier: new Decimal('1.25'),
        goldMultiplier: new Decimal('1.50'),
        platinumMultiplier: new Decimal('0.30'),
        pointsExpiryDays: 90
      }
    });

    const rewards = await Promise.all([
      tx.reward.create({ data: { name: 'Free Coffee', description: 'Any standard hot coffee.', pointsCost: 100 } }),
      tx.reward.create({ data: { name: 'Free Pastry', description: 'One pastry from the daily selection.', pointsCost: 150 } }),
      tx.reward.create({ data: { name: 'Free Sandwich', description: 'One standard café sandwich.', pointsCost: 250 } }),
      tx.reward.create({ data: { name: 'Brunch Combo', description: 'Coffee plus a sandwich or pastry.', pointsCost: 400 } })
    ]);

    const memberTargets = [
      { fullName: 'Aarav Mehta', phone: '+91 90000 10001', email: 'aarav@example.test', lifetime: 1800, balance: 950 },
      { fullName: 'Diya Sharma', phone: '+91 90000 10002', email: 'diya@example.test', lifetime: 1540, balance: 640 },
      { fullName: 'Kabir Singh', phone: '+91 90000 10003', email: 'kabir@example.test', lifetime: 1200, balance: 500 },
      { fullName: 'Anaya Verma', phone: '+91 90000 10004', email: 'anaya@example.test', lifetime: 720, balance: 420 },
      { fullName: 'Rohan Gupta', phone: '+91 90000 10005', email: 'rohan@example.test', lifetime: 490, balance: 490 },
      { fullName: 'Meera Joshi', phone: '+91 90000 10006', email: 'meera@example.test', lifetime: 250, balance: 150 },
      { fullName: 'Ishaan Kapoor', phone: '+91 90000 19999', email: 'ishaan@example.test', lifetime: 5200, balance: 1200 }
    ];

    for (let i = 0; i < 44; i += 1) {
      const source = memberTargets[i % memberTargets.length];
      const name = i < memberTargets.length ? source.fullName : `${source.fullName} ${i + 1}`;
      const phone = i < memberTargets.length ? source.phone : `+91 90000 ${10100 + i}`;
      const lifetime = i < memberTargets.length ? source.lifetime : [80, 320, 510, 860, 1320, 1700, 5200][i % 7];
      const balance = i < memberTargets.length ? source.balance : Math.max(50, lifetime - ((i % 5) * 70));
      const tier = tierForLifetime(lifetime);
      const member = await tx.member.create({
        data: {
          fullName: name,
          phoneNumber: phone,
          normalizedPhoneNumber: normalizePhone(phone),
          email: i < memberTargets.length ? source.email : `member${i + 1}@example.test`,
          currentTier: tier,
          lifetimeEarnedPoints: lifetime,
          currentPointsBalance: balance,
          createdAt: new Date(seedNow.getTime() - (i % 30) * 86400000)
        }
      });

      const sampleEarn = Math.min(100, balance);
      const openingAdjustment = balance - sampleEarn;
      const openingEarnedAt = new Date(seedNow.getTime() - 30 * 86400000);
      const purchaseEarnedAt = new Date(seedNow.getTime() - 10 * 86400000);
      if (openingAdjustment > 0) {
        await tx.pointLot.create({
          data: {
            memberId: member.id,
            sourceType: 'ADJUSTMENT',
            originalPoints: openingAdjustment,
            remainingPoints: openingAdjustment,
            earnedAt: openingEarnedAt,
            expiresAt: new Date(openingEarnedAt.getTime() + program.pointsExpiryDays * 86400000),
            createdAt: openingEarnedAt
          }
        });
        await tx.pointLedger.create({
          data: {
            memberId: member.id,
            transactionType: 'ADJUSTMENT',
            pointsDelta: openingAdjustment,
            balanceAfter: openingAdjustment,
            description: 'Seeded opening balance for demo data.',
            createdById: manager.id,
            createdAt: openingEarnedAt
          }
        });
      }

      const purchase = await tx.purchase.create({
        data: {
          memberId: member.id,
          amount: new Decimal(sampleEarn.toFixed(2)),
          currency: 'INR',
          tierAtPurchase: Tier.BRONZE,
          earningMultiplier: new Decimal('1.00'),
          pointsEarned: sampleEarn,
          clientRequestId: `seed-purchase-${i + 1}`,
          notes: 'Seeded demo purchase',
          createdById: i % 2 === 0 ? staff.id : manager.id,
          createdAt: purchaseEarnedAt
        }
      });
      await tx.pointLot.create({
        data: {
          memberId: member.id,
          sourceType: 'PURCHASE_EARN',
          sourceId: purchase.id,
          originalPoints: sampleEarn,
          remainingPoints: sampleEarn,
          earnedAt: purchaseEarnedAt,
          expiresAt: new Date(purchaseEarnedAt.getTime() + program.pointsExpiryDays * 86400000),
          createdAt: purchaseEarnedAt
        }
      });
      await tx.pointLedger.create({
        data: {
          memberId: member.id,
          transactionType: 'PURCHASE_EARN',
          pointsDelta: sampleEarn,
          balanceAfter: balance,
          referenceId: purchase.id,
          referenceType: 'PURCHASE',
          description: 'Seeded demo purchase',
          createdById: i % 2 === 0 ? staff.id : manager.id,
          createdAt: purchaseEarnedAt
        }
      });

      if (i % 4 === 0 && balance >= rewards[0].pointsCost) {
        const redemptionAt = new Date(seedNow.getTime() - 5 * 86400000);
        const redemption = await tx.redemption.create({
          data: {
            memberId: member.id,
            rewardId: rewards[0].id,
            pointsUsed: rewards[0].pointsCost,
            clientRequestId: `seed-redemption-${i + 1}`,
            notes: 'Seeded demo redemption',
            createdById: staff.id,
            createdAt: redemptionAt
          }
        });
        await consumeSeedLots(tx, member.id, rewards[0].pointsCost);
        const newBalance = balance - rewards[0].pointsCost;
        await tx.member.update({ where: { id: member.id }, data: { currentPointsBalance: newBalance } });
        await tx.pointLedger.create({
          data: {
            memberId: member.id,
            transactionType: 'REDEMPTION',
            pointsDelta: -rewards[0].pointsCost,
            balanceAfter: newBalance,
            referenceId: redemption.id,
            referenceType: 'REDEMPTION',
            description: 'Seeded demo redemption',
            createdById: staff.id,
            createdAt: redemptionAt
          }
        });
      }
    }
  });

  console.log('Seed complete. Demo credentials: staff@cafepoints.demo / DemoPass123!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
