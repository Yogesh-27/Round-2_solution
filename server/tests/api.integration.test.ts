import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

const hasDatabase = Boolean(process.env.DATABASE_URL && process.env.RUN_DB_TESTS === 'true');

describe.skipIf(!hasDatabase)('API integration smoke tests', () => {
  it('serves health endpoint', async () => {
    const response = await request(app).get('/api/health');
    expect([200, 503]).toContain(response.status);
  });

  it('rejects unauthenticated member listing', async () => {
    const response = await request(app).get('/api/members');
    expect(response.status).toBe(401);
  });
});
