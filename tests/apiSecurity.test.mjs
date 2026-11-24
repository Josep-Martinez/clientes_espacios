import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createApp } from '../server/app.ts';
import { readServerConfig } from '../server/config.ts';

const noDatabase = { query: async () => ({ rows: [], rowCount: 0 }) };
const config = {
  nodeEnv: 'development', host: '127.0.0.1', port: 3001,
  databaseUrl: 'postgresql://bookfit:local@127.0.0.1/postgres',
  devProfiles: true, paymentMode: 'fake', sessionTtlHours: 2,
  appOrigins: ['http://127.0.0.1:5173'],
};

describe('BookFit API security invariants', () => {
  it('refuses demo profiles or fake payments in production configuration', () => {
    const keys = ['NODE_ENV', 'BOOKFIT_DEV_PROFILES', 'BOOKFIT_PAYMENT_MODE'];
    const previous = new Map(keys.map((key) => [key, process.env[key]]));
    try {
      process.env.NODE_ENV = 'production';
      process.env.BOOKFIT_DEV_PROFILES = 'true';
      process.env.BOOKFIT_PAYMENT_MODE = 'disabled';
      assert.throws(() => readServerConfig(), /Production cannot start/);

      process.env.BOOKFIT_DEV_PROFILES = 'false';
      process.env.BOOKFIT_PAYMENT_MODE = 'fake';
      assert.throws(() => readServerConfig(), /Production cannot start/);
    } finally {
      for (const [key, value] of previous) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it('does not expose the local profile login when the server disables demo profiles', async () => {
    const app = createApp(noDatabase, { ...config, nodeEnv: 'production', devProfiles: false, paymentMode: 'disabled' });
    await app.ready();
    try {
      const csrf = await app.inject({ method: 'GET', url: '/api/csrf' });
      const token = csrf.json().data.token;
      const cookie = String(csrf.headers['set-cookie']).split(';', 1)[0];
      const response = await app.inject({
        method: 'POST', url: '/api/dev/session', payload: { profileId: '10000000-0000-4000-8000-000000000001' },
        headers: { host: '127.0.0.1:5173', origin: 'http://127.0.0.1:5173', cookie, 'x-csrf-token': token },
      });
      assert.equal(response.statusCode, 404);
    } finally {
      await app.close();
    }
  });

  it('limits request bursts and returns Retry-After', async () => {
    const app = createApp(noDatabase, config);
    await app.ready();
    try {
      for (let i = 0; i < 180; i += 1) {
        const response = await app.inject({ method: 'GET', url: '/api/health' });
        assert.equal(response.statusCode, 200);
      }
      const limited = await app.inject({ method: 'GET', url: '/api/health' });
      assert.equal(limited.statusCode, 429);
      assert.ok(Number(limited.headers['retry-after']) >= 1);
    } finally {
      await app.close();
    }
  });
});
