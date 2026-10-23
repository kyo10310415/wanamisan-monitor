import jwt from 'jsonwebtoken';
import { createPrivateKey } from 'node:crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';
const FIELDS = new Set(['タイムスタンプ', 'サーバー名', '質問タイプ', '生徒名', '学籍番号', '質問内容', '回答内容']);

export function readSheetsConfig(env) {
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
  const privateKey = (env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const sheetId = env.GOOGLE_SPREADSHEET_ID || '';
  const range = env.GOOGLE_SHEET_RANGE || '';
  if (!/^[^\s@]+@[^\s@]+\.iam\.gserviceaccount\.com$/.test(email) || !/^[A-Za-z0-9_-]+$/.test(sheetId) || !range || range.length > 250) throw new Error('Google Sheets service-account email, spreadsheet ID and range are required');
  try {
    const key = createPrivateKey(privateKey);
    if (key.asymmetricKeyType !== 'rsa' || key.asymmetricKeyDetails.modulusLength < 2048) throw new Error();
  } catch { throw new Error('GOOGLE_PRIVATE_KEY must be a valid RSA private key'); }
  return { email, privateKey, sheetId, range };
}

export function rowsToData(values) {
  if (!Array.isArray(values) || !values.length) return [];
  const headers = values[0].map(v => String(v).trim());
  if (!headers.includes('タイムスタンプ') || !headers.includes('生徒名')) throw new Error('Required sheet headers missing');
  return values.slice(1).filter(row => row.some(v => String(v).trim())).map(row => Object.fromEntries(
    headers.flatMap((header, index) => FIELDS.has(header) ? [[header, String(row[index] ?? '').trim()]] : [])
  ));
}

export function createSheetsReader(config, { fetchImpl = fetch, now = Date.now, sign = jwt.sign } = {}) {
  let accessToken, expiresAt = 0, pendingToken;
  async function getToken() {
    if (accessToken && now() < expiresAt) return accessToken;
    if (!pendingToken) pendingToken = (async () => {
      const assertion = sign({ scope: SCOPE }, config.privateKey, { algorithm: 'RS256', issuer: config.email, audience: TOKEN_URL, expiresIn: '1h' });
      const response = await fetchImpl(TOKEN_URL, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) });
      if (!response.ok) throw new Error('Sheets authentication unavailable');
      const body = await response.json();
      if (typeof body.access_token !== 'string' || !body.access_token || !Number.isFinite(body.expires_in) || body.expires_in <= 60) throw new Error('Sheets authentication unavailable');
      accessToken = body.access_token;
      expiresAt = now() + Math.min(body.expires_in - 60, 3540) * 1000;
      return accessToken;
    })().finally(() => { pendingToken = undefined; });
    return pendingToken;
  }
  return async () => {
    const token = await getToken();
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.sheetId)}/values/${encodeURIComponent(config.range)}?valueRenderOption=FORMATTED_VALUE`;
    const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` }, redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      if (response.status === 401) { accessToken = undefined; expiresAt = 0; }
      throw new Error('Sheet data unavailable');
    }
    const body = await response.json();
    return rowsToData(body.values || []);
  };
}
