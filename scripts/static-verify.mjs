import fs from 'node:fs';
import path from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const required = [
  'README.md', 'REASONING.md', 'AI_LOGS.md', '.env.example', '.gitignore', 'docker-compose.yml',
  'client/package.json', 'client/index.html', 'client/src/main.tsx', 'client/src/styles.css',
  'server/package.json', 'server/prisma/schema.prisma', 'server/prisma/migrations/0001_init/migration.sql',
  'server/prisma/migrations/migration_lock.toml', 'server/prisma/seed.ts', 'server/src/index.ts',
  'server/src/domain/loyalty.ts', 'server/src/services/loyaltyService.ts', 'server/src/services/expirationService.ts', 'server/src/services/notificationService.ts', 'server/src/services/clockService.ts', 'server/src/routes/clockRoutes.ts', 'server/src/routes/outboxRoutes.ts', 'server/tests/loyalty.test.ts', 'server/tests/twists.integration.test.ts'
];
const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) throw new Error(`Missing required files: ${missing.join(', ')}`);
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readme = read('README.md');
const schema = read('server/prisma/schema.prisma');
const service = read('server/src/services/loyaltyService.ts');
for (const needle of [
  'ledger', 'idempotency', 'pagination', 'sorting', 'DemoPass123!', 'POST /api/members/:id/purchases',
  'POST /api/members/:id/redemptions', 'What we\'d build next'
]) if (!readme.includes(needle)) throw new Error(`README is missing: ${needle}`);
for (const model of ['model User', 'model Member', 'model Reward', 'model Purchase', 'model Redemption', 'model PointLedger', 'model PointLot', 'model ClockState', 'model OutboxEvent', 'model LoyaltyProgram']) if (!schema.includes(model)) throw new Error(`Schema missing ${model}`);
for (const invariant of ['FOR UPDATE', 'pointLedger.create', 'pointLot.create', 'redemption.create', 'currentPointsBalance', 'lifetimeEarnedPoints', 'enqueueTierChangeNotification', 'expireMemberPoints']) if (!service.includes(invariant)) throw new Error(`Service missing critical correctness behavior: ${invariant}`);
const nextSection = readme.split("## What we'd build next")[1]?.split('## GitHub publishing checklist')[0] ?? '';
const numbered = nextSection.match(/^\d+\. /gm) ?? [];
if (numbered.length !== 3) throw new Error(`Expected exactly 3 future features, found ${numbered.length}`);
if (read('AI_LOGS.md').includes('complete, unmodified AI conversation')) console.log('AI_LOGS placeholder correctly preserves the submission requirement.');
for (const endpoint of ['POST /clock', 'GET /outbox', 'Platinum', '90 days', 'MEMBER_TIER_CHANGED']) if (!readme.includes(endpoint)) throw new Error(`README is missing twist documentation: ${endpoint}`);
console.log(`Static verification passed: ${required.length} required artifacts present, twist schema/service invariants detected, exactly 3 future features documented.`);
