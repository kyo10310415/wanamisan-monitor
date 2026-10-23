import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { Hono } from 'hono';
import { readSsoConfig } from '../src/config.js';
import { createSsoAuthMiddleware } from '../src/sso-access.js';
import { createSheetsReader, readSheetsConfig, rowsToData } from '../src/sheets.js';

const secret = 'isolated-test-key-not-for-production-'.repeat(2);
const config = readSsoConfig({ JWT_SECRET: secret, APP_ORIGIN: 'https://monitor.example.com' });
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
const sheetsConfig = readSheetsConfig({ GOOGLE_SERVICE_ACCOUNT_EMAIL: 'monitor@example.iam.gserviceaccount.com', GOOGLE_PRIVATE_KEY: privateKey, GOOGLE_SPREADSHEET_ID: 'test-sheet', GOOGLE_SHEET_RANGE: 'Log!A:O' });
const payload = { type: 'sso', userId: 7, username: 'test-user', role: 'crew', targetUrl: 'https://monitor.example.com/' };
function token(changes = {}, options = {}) { return jwt.sign({ ...payload, ...changes }, secret, { algorithm: 'HS256', expiresIn: '1h', ...options }); }
function app() {
  const h = new Hono();
  h.use('*', createSsoAuthMiddleware(config));
  h.get('/api/data', c => c.json({ role: c.get('user').role }));
  h.get('/', c => c.text('ok'));
  return h;
}

test('missing/short/public JWT secrets and invalid origins are rejected', () => {
  for (const s of ['', 'short', 'wannav-secret-key-change-in-production']) assert.throws(() => readSsoConfig({ JWT_SECRET: s, APP_ORIGIN: config.appOrigin }));
  assert.throws(() => readSsoConfig({ JWT_SECRET: secret, APP_ORIGIN: 'https://monitor.example.com/path' }));
  assert.equal(readSsoConfig({ JWT_SECRET: secret, RENDER_EXTERNAL_URL: config.appOrigin }).appOrigin, config.appOrigin);
});

test('anonymous APIs reject with JSON 401/no-store and HTML redirects', async () => {
  const h = app();
  const r = await h.request('/api/data');
  assert.equal(r.status, 401); assert.equal(r.headers.get('Cache-Control'), 'no-store');
  assert.equal((await h.request('/')).status, 302);
});

test('API query tokens are not accepted', async () => {
  assert.equal((await app().request('/api/data?auth_token=' + token())).status, 401);
});

test('registered SSO roles retain read access using valid cookies', async () => {
  for (const role of ['admin', 'leader', 'crew']) {
    const r = await app().request('/api/data', { headers: { Cookie: 'wannav_sso=' + token({ role }) } });
    assert.equal(r.status, 200); assert.equal((await r.json()).role, role);
  }
});

test('unknown role/wrong target/type/excessive lifetime/missing iat/expired tokens reject', async () => {
  const tokens = [token({ role: 'unknown' }), token({ targetUrl: 'https://other.example.com' }), token({ type: 'login' }), token({}, { expiresIn: '2h' }), token({}, { noTimestamp: true }), token({}, { expiresIn: -1 }), jwt.sign(payload, secret, { algorithm: 'HS384', expiresIn: '1h' })];
  for (const value of tokens) assert.equal((await app().request('/api/data', { headers: { Cookie: 'wannav_sso=' + value } })).status, 401);
});

test('HTML landing removes token and issues Secure/HttpOnly/Lax cookie', async () => {
  const r = await app().request('/?tab=stats&auth_token=' + token());
  assert.equal(r.status, 302); assert.equal(r.headers.get('Location'), '/?tab=stats');
  assert.match(r.headers.get('Set-Cookie'), /HttpOnly/); assert.match(r.headers.get('Set-Cookie'), /Secure/); assert.match(r.headers.get('Set-Cookie'), /SameSite=Lax/);
});

test('private Sheets configuration fails closed and field projection preserves dashboard data', () => {
  assert.throws(() => readSheetsConfig({}));
  assert.throws(() => readSheetsConfig({ GOOGLE_SERVICE_ACCOUNT_EMAIL: sheetsConfig.email, GOOGLE_PRIVATE_KEY: 'invalid', GOOGLE_SPREADSHEET_ID: 'test', GOOGLE_SHEET_RANGE: 'Log!A:O' }));
  assert.deepEqual(rowsToData([['タイムスタンプ', '生徒名', '不要な秘密列', '学籍番号'], [' date ', ' test ', 'private', 123]]), [{ タイムスタンプ: 'date', 生徒名: 'test', 学籍番号: '123' }]);
  assert.throws(() => rowsToData([['wrong'], ['test']]));
});

test('Sheets reader uses read-only OAuth, fixed HTTPS endpoints, no redirects and token cache', async () => {
  const calls = []; let clock = Date.now();
  const reader = createSheetsReader(sheetsConfig, { now: () => clock, fetchImpl: async (url, options) => {
    calls.push({ url, options }); assert.equal(options.redirect, 'error');
    return { ok: true, json: async () => url.includes('oauth2') ? { access_token: 'isolated-test-token', expires_in: 3600 } : { values: [['タイムスタンプ', '生徒名'], ['date', 'test']] } };
  } });
  assert.equal((await reader())[0].生徒名, 'test'); await reader();
  assert.equal(calls.length, 3);
  const assertion = jwt.decode(calls[0].options.body.get('assertion'));
  assert.equal(assertion.scope, 'https://www.googleapis.com/auth/spreadsheets.readonly');
  assert.equal(assertion.iss, sheetsConfig.email); assert.equal(assertion.aud, 'https://oauth2.googleapis.com/token');
  assert.equal(calls[1].options.headers.Authorization, 'Bearer isolated-test-token');
  assert.match(calls[1].url, /^https:\/\/sheets.googleapis.com\//);
  clock += 3600000; await reader(); assert.equal(calls.length, 5);
});

test('upstream failures do not expose raw Google responses', async () => {
  const reader = createSheetsReader(sheetsConfig, { fetchImpl: async () => ({ ok: false, json: () => { throw new Error('raw sensitive response'); } }) });
  await assert.rejects(reader, { message: 'Sheets authentication unavailable' });
});

test('actual production /api/data blocks anonymous access before any Google request', async () => {
  Object.assign(process.env, { JWT_SECRET: secret, APP_ORIGIN: config.appOrigin, GOOGLE_SERVICE_ACCOUNT_EMAIL: sheetsConfig.email, GOOGLE_PRIVATE_KEY: privateKey, GOOGLE_SPREADSHEET_ID: sheetsConfig.sheetId, GOOGLE_SHEET_RANGE: sheetsConfig.range });
  const originalFetch = globalThis.fetch; let fetchCalls = 0;
  globalThis.fetch = async () => { fetchCalls++; throw new Error('No real network permitted'); };
  try {
    const { default: realApp } = await import('../src/index.js');
    assert.equal((await realApp.request('/api/data')).status, 401);
    assert.equal(fetchCalls, 0);
    const r = await realApp.request('/api/data', { headers: { Cookie: 'wannav_sso=' + token() } });
    assert.equal(r.status, 502); assert.deepEqual(await r.json(), { success: false, error: 'Data is temporarily unavailable' });
  } finally { globalThis.fetch = originalFetch; }
});
