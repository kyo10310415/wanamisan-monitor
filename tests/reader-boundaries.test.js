import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { createSheetsReader } from '../src/sheets.js';

const config = { email: 'test@example.iam.gserviceaccount.com', privateKey: 'injected-test-signer', sheetId: 'isolated-test', range: 'Log!A:G' };
const values = [['タイムスタンプ', '生徒名', '不要列'], ['2026-01-01', 'test-student', 'not-for-output']];
const tokenResponse = () => ({ ok: true, json: async () => ({ access_token: 'test-only-access-token', expires_in: 3600 }) });
const dataResponse = () => ({ ok: true, json: async () => ({ values }) });

test('concurrent reads share one token request and keep only dashboard fields', async () => {
  let tokenCalls = 0, dataCalls = 0;
  const reader = createSheetsReader(config, {
    sign: () => 'test-only-assertion',
    fetchImpl: async url => {
      if (url === 'https://oauth2.googleapis.com/token') { tokenCalls++; return tokenResponse(); }
      dataCalls++; return dataResponse();
    },
  });
  const responses = await Promise.all([reader(), reader(), reader()]);
  assert.equal(tokenCalls, 1);
  assert.equal(dataCalls, 3);
  for (const response of responses) assert.deepEqual(Object.keys(response[0]), ['タイムスタンプ', '生徒名']);
});

test('Sheets 401 evicts the access token and the next read authenticates again', async () => {
  let tokenCalls = 0, dataCalls = 0;
  const reader = createSheetsReader(config, {
    sign: () => 'test-only-assertion',
    fetchImpl: async url => {
      if (url === 'https://oauth2.googleapis.com/token') { tokenCalls++; return tokenResponse(); }
      dataCalls++;
      return dataCalls === 1 ? { ok: false, status: 401 } : dataResponse();
    },
  });
  await assert.rejects(reader, { message: 'Sheet data unavailable' });
  await reader();
  assert.equal(tokenCalls, 2);
  assert.equal(dataCalls, 2);
});

test('malformed OAuth result fails closed and does not poison future requests', async () => {
  let tokenCalls = 0, dataCalls = 0;
  const reader = createSheetsReader(config, {
    sign: () => 'test-only-assertion',
    fetchImpl: async url => {
      if (url === 'https://oauth2.googleapis.com/token') {
        tokenCalls++;
        return tokenCalls === 1 ? { ok: true, json: async () => ({ access_token: 'test-only', expires_in: '3600' }) } : tokenResponse();
      }
      dataCalls++; return dataResponse();
    },
  });
  await assert.rejects(reader, { message: 'Sheets authentication unavailable' });
  assert.equal(dataCalls, 0);
  await reader();
  assert.equal(tokenCalls, 2);
  assert.equal(dataCalls, 1);
});

test('real API success and failure remain private, projected and free of upstream error details', async () => {
  const keys = ['JWT_SECRET', 'APP_ORIGIN', 'GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_SPREADSHEET_ID', 'GOOGLE_SHEET_RANGE'];
  const oldEnv = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
  const secret = 'test-only-SSO-secret-never-production-'.repeat(2);
  Object.assign(process.env, { JWT_SECRET: secret, APP_ORIGIN: 'https://monitor.example.test', GOOGLE_SERVICE_ACCOUNT_EMAIL: config.email, GOOGLE_PRIVATE_KEY: privateKey, GOOGLE_SPREADSHEET_ID: config.sheetId, GOOGLE_SHEET_RANGE: config.range });
  const originalFetch = globalThis.fetch;
  let fail = false;
  globalThis.fetch = async url => {
    if (fail) throw new Error('upstream-private-error-marker');
    return url === 'https://oauth2.googleapis.com/token' ? tokenResponse() : dataResponse();
  };
  try {
    const { default: app } = await import('../src/index.js');
    const signed = jwt.sign({ type: 'sso', userId: 9, username: 'test-user', role: 'leader', targetUrl: process.env.APP_ORIGIN }, secret, { algorithm: 'HS256', expiresIn: '1h' });
    const headers = { Cookie: `wannav_sso=${signed}`, Origin: 'https://foreign.example.test' };
    const good = await app.request('/api/data', { headers });
    assert.equal(good.status, 200);
    assert.equal(good.headers.get('Cache-Control'), 'no-store');
    assert.equal(good.headers.get('Referrer-Policy'), 'no-referrer');
    assert.equal(good.headers.get('Access-Control-Allow-Origin'), null);
    const body = await good.json();
    assert.equal(body.success, true);
    assert.deepEqual(body.data, [{ タイムスタンプ: '2026-01-01', 生徒名: 'test-student' }]);
    fail = true;
    const bad = await app.request('/api/data', { headers });
    assert.equal(bad.status, 502);
    assert.equal(bad.headers.get('Cache-Control'), 'no-store');
    assert.deepEqual(await bad.json(), { success: false, error: 'Data is temporarily unavailable' });
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of keys) if (oldEnv[key] === undefined) delete process.env[key]; else process.env[key] = oldEnv[key];
  }
});
