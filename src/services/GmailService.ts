/**
 * Gmail integration — multi-account support.
 * Each connected Gmail account is tracked independently with its own
 * access token and last-sync timestamp.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmailParser, RawEmail, EmailImportResult } from '../ml/EmailParser';

// ── Config ────────────────────────────────────────────────────────────────────

const WEB_CLIENT_ID = '871317632339-nio29a8oqc6cqhp4b2u1k2t7ofodhsk7.apps.googleusercontent.com';
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

// Multi-account storage keys
const STORAGE_ACCOUNTS = '@gmail_accounts';               // JSON string[]
const tokenKey  = (e: string) => `@gmail_token_${e.replace(/[@.]/g, '_')}`;
const syncKey   = (e: string) => `@gmail_sync_${e.replace(/[@.]/g, '_')}`;

// Legacy single-account keys (kept for backward-compat read in migration)
const LEGACY_ACCOUNT   = '@gmail_account';
const LEGACY_TOKEN     = '@gmail_access_token';
const LEGACY_SYNC      = '@gmail_last_sync';
export const STORAGE_GMAIL_LAST_SYNC = LEGACY_SYNC; // App.tsx still reads this

const BANK_DOMAINS = [
  '@hdfcbank.net',
  '@hdfcbank.com',
  '@hdfcbank.bank.in',
  '@onlinesbi.com',
  '@sbi.co.in',
  '@sbi.bank.in',
  '@icicibank.com',
  '@icicibank.bank.in',
  '@axisbank.com',
  '@axisbank.net',
  '@axisbank.bank.in',
  '@kotak.com',
  '@kotak.bank.in',
  '@idfcfirstbank.com',
  '@idfcfirstbank.bank.in',
  '@paytmbank.com',
  '@phonepe.com',
  '@yesbank.in',
  '@yesbank.bank.in',
  '@indusind.com',
  '@indusind.bank.in',
  '@pnbindia.in',
  '@pnb.bank.in',
  '@canarabank.in',
  '@canarabank.bank.in',
];

// ── Google Sign-In wrapper ────────────────────────────────────────────────────

function getGoogleSignIn() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    return GoogleSignin;
  } catch {
    throw new Error(
      'Please install @react-native-google-signin/google-signin and follow its setup guide.'
    );
  }
}

export function configureGmail(): void {
  const GoogleSignin = getGoogleSignIn();
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    iosClientId: '871317632339-pp2lh2vms9ubj9f0vnpiodh11qmhkdf2.apps.googleusercontent.com',
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    offlineAccess: false,
  });
}

// ── One-time migration from legacy single-account storage ────────────────────

let _migrationDone = false;
async function migrateLegacyAccount(): Promise<void> {
  if (_migrationDone) return;
  _migrationDone = true;

  const oldEmail = await AsyncStorage.getItem(LEGACY_ACCOUNT);
  if (!oldEmail) return;

  const stored  = await AsyncStorage.getItem(STORAGE_ACCOUNTS);
  const current: string[] = stored ? JSON.parse(stored) : [];

  if (!current.includes(oldEmail)) {
    current.push(oldEmail);
    await AsyncStorage.setItem(STORAGE_ACCOUNTS, JSON.stringify(current));
  }

  const oldToken = await AsyncStorage.getItem(LEGACY_TOKEN);
  if (oldToken) {
    await AsyncStorage.setItem(tokenKey(oldEmail), oldToken);
  }

  const oldSync = await AsyncStorage.getItem(LEGACY_SYNC);
  if (oldSync) {
    await AsyncStorage.setItem(syncKey(oldEmail), oldSync);
  }

  await AsyncStorage.multiRemove([LEGACY_ACCOUNT, LEGACY_TOKEN]);
}

// ── Account list helpers ──────────────────────────────────────────────────────

async function readAccountList(): Promise<string[]> {
  const stored = await AsyncStorage.getItem(STORAGE_ACCOUNTS);
  return stored ? JSON.parse(stored) : [];
}

async function writeAccountList(accounts: string[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_ACCOUNTS, JSON.stringify(accounts));
}

// ── Public: account management ───────────────────────────────────────────────

/** Returns all connected Gmail addresses (migrates legacy storage on first call). */
export async function getConnectedGmailAccounts(): Promise<string[]> {
  await migrateLegacyAccount();
  return readAccountList();
}

/** Backward-compat: returns the first connected account (or null). */
export async function getConnectedGmailAccount(): Promise<string | null> {
  const accounts = await getConnectedGmailAccounts();
  return accounts[0] ?? null;
}

/**
 * Prompt the user to sign in with Google.
 * If the account is already connected it updates the stored token.
 * Returns the Gmail address.
 */
export async function signInWithGmail(): Promise<string> {
  const GoogleSignin = getGoogleSignIn();
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();

  if (response.type !== 'success') {
    throw new Error('Sign-in was cancelled or failed. Please try again.');
  }

  const tokens = await GoogleSignin.getTokens();
  const email  = response.data.user.email;

  await AsyncStorage.setItem(tokenKey(email), tokens.accessToken);

  const accounts = await readAccountList();
  if (!accounts.includes(email)) {
    await writeAccountList([...accounts, email]);
  }

  return email;
}

/** Disconnect a specific Gmail account. */
export async function signOutFromGmailAccount(email: string): Promise<void> {
  const accounts = await readAccountList();
  await writeAccountList(accounts.filter(a => a !== email));
  await AsyncStorage.multiRemove([tokenKey(email), syncKey(email)]);
  // Best-effort sign-out from SDK (only works if this was the last signed-in account)
  try { await getGoogleSignIn().signOut(); } catch { /* ignore */ }
}

/** Disconnect ALL Gmail accounts (backward-compat). */
export async function signOutFromGmail(): Promise<void> {
  const accounts = await readAccountList();
  const keys = accounts.flatMap(e => [tokenKey(e), syncKey(e)]);
  await AsyncStorage.multiRemove([STORAGE_ACCOUNTS, ...keys]);
  try { await getGoogleSignIn().signOut(); } catch { /* ignore */ }
}

/** Returns the last sync timestamp for a given account (null if never synced). */
export async function getLastSyncForAccount(email: string): Promise<number | null> {
  const val = await AsyncStorage.getItem(syncKey(email));
  return val ? parseInt(val, 10) : null;
}

// ── Token management ──────────────────────────────────────────────────────────

async function getAccessTokenForAccount(email: string, forceRefresh = false): Promise<string> {
  const GoogleSignin = getGoogleSignIn();

  const clearAndGetFresh = async (): Promise<string | null> => {
    try {
      const cached = await AsyncStorage.getItem(tokenKey(email));
      if (cached) {
        try { await GoogleSignin.clearCachedAccessToken(cached); } catch { /* ignore */ }
      }
      const tokens = await GoogleSignin.getTokens();
      if (tokens?.accessToken) {
        await AsyncStorage.setItem(tokenKey(email), tokens.accessToken);
        return tokens.accessToken;
      }
    } catch { /* fall through */ }
    return null;
  };

  // Try silent sign-in first — restores the SDK session from keychain
  try {
    const result = await GoogleSignin.signInSilently();
    if (result.type === 'success' && result.data.user.email === email) {
      const fresh = await clearAndGetFresh();
      if (fresh) return fresh;
    }
  } catch { /* fall through */ }

  // Silent sign-in failed or wrong account — try getTokens() directly
  // (works when SDK has a valid session even if signInSilently threw)
  if (forceRefresh) {
    const fresh = await clearAndGetFresh();
    if (fresh) return fresh;
  }

  // Fall back to stored token — may be expired
  const stored = await AsyncStorage.getItem(tokenKey(email));
  if (stored) return stored;

  throw new Error(`Gmail session expired for ${email}. Please reconnect this account.`);
}

// ── Gmail API helpers ─────────────────────────────────────────────────────────

function buildBankQuery(fromMs: number, toMs: number): string {
  const fromPart = BANK_DOMAINS.map(d => `from:${d}`).join(' OR ');
  const after    = Math.floor(fromMs / 1000);
  const before   = Math.floor(toMs  / 1000);
  return `(${fromPart}) after:${after} before:${before}`;
}

async function gmailGet(path: string, token: string): Promise<any> {
  const res = await fetch(`${GMAIL_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err?.error?.message ?? `Gmail API error ${res.status}`;
    console.warn('[GmailService] API error', res.status, JSON.stringify(err));
    throw new Error(`${res.status}: ${message}`);
  }
  return res.json();
}

function decodeBase64Url(encoded: string): string {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let bytes = '';
  let i = 0;

  while (i < base64.length) {
    const enc1 = chars.indexOf(base64[i++]);
    const enc2 = chars.indexOf(base64[i++]);
    const enc3 = chars.indexOf(base64[i++]);
    const enc4 = chars.indexOf(base64[i++]);

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;

    bytes += String.fromCharCode(chr1);
    if (enc3 !== 64 && enc3 !== -1) bytes += String.fromCharCode(chr2);
    if (enc4 !== 64 && enc4 !== -1) bytes += String.fromCharCode(chr3);
  }

  try {
    return decodeURIComponent(
      bytes.split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    );
  } catch {
    return bytes;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractPlainText(payload: any): string {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return stripHtml(decodeBase64Url(payload.body.data));
  }
  const parts: any[] = payload.parts ?? [];
  const plainPart = parts.find(p => p.mimeType === 'text/plain');
  if (plainPart) {
    const text = extractPlainText(plainPart);
    if (text) return text;
  }
  for (const part of parts) {
    const text = extractPlainText(part);
    if (text) return text;
  }
  return '';
}

function headerValue(headers: { name: string; value: string }[], name: string): string {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
}

async function fetchMessageDetail(msgId: string, token: string): Promise<RawEmail | null> {
  try {
    const msg = await gmailGet(`/messages/${msgId}?format=full`, token);
    const headers: { name: string; value: string }[] = msg.payload?.headers ?? [];
    const from    = headerValue(headers, 'From');
    const subject = headerValue(headers, 'Subject');
    const dateStr = headerValue(headers, 'Date');
    const body    = extractPlainText(msg.payload);

    if (!body && !subject) return null;

    return {
      id: msg.id,
      from,
      subject,
      body,
      date: dateStr ? Date.parse(dateStr) : Date.now(),
    };
  } catch (err) {
    console.warn('[GmailService] Failed to fetch message', msgId, err);
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch and parse bank emails from a specific Gmail account.
 */
async function fetchEmailsWithToken(
  gmailAccount: string,
  userId: string,
  token: string,
  fromMs: number,
  toMs: number,
): Promise<EmailImportResult> {
  const query = buildBankQuery(fromMs, toMs);
  let messageIds: string[] = [];
  let pageToken: string | undefined;

  do {
    const pageParam = pageToken ? `&pageToken=${pageToken}` : '';
    const listData = await gmailGet(
      `/messages?q=${encodeURIComponent(query)}&maxResults=100${pageParam}`,
      token,
    );
    for (const m of listData.messages ?? []) {
      messageIds.push(m.id);
    }
    pageToken = listData.nextPageToken;
  } while (pageToken && messageIds.length < 500);

  const emails: RawEmail[] = [];
  for (const id of messageIds) {
    const email = await fetchMessageDetail(id, token);
    if (email) emails.push(email);
  }

  return EmailParser.parseAndStore(emails, userId, gmailAccount);
}

export async function importGmailTransactions(
  userId: string,
  gmailAccount: string,
  fromMs: number,
  toMs: number,
): Promise<EmailImportResult> {
  const token = await getAccessTokenForAccount(gmailAccount);

  try {
    return await fetchEmailsWithToken(gmailAccount, userId, token, fromMs, toMs);
  } catch (err: any) {
    // On 401, clear the stale token and retry once with a force-refreshed token
    if (err?.message?.startsWith('401')) {
      console.warn('[GmailService] 401 on first attempt — clearing token and retrying');
      await AsyncStorage.removeItem(tokenKey(gmailAccount));
      const freshToken = await getAccessTokenForAccount(gmailAccount, true);
      return await fetchEmailsWithToken(gmailAccount, userId, freshToken, fromMs, toMs);
    }
    throw err;
  }
}

/**
 * Auto-sync all connected Gmail accounts from their last sync time.
 * Per-account errors are caught individually so one bad account doesn't block others.
 */
export async function runGmailSync(userId: string): Promise<EmailImportResult | null> {
  const accounts = await getConnectedGmailAccounts();
  if (accounts.length === 0) return null;

  const now = Date.now();
  const merged: EmailImportResult = {
    imported: 0, duplicates: 0, skipped: 0, failed: 0,
    pendingCategoryConfirm: [], emiDetected: [],
  };

  for (const email of accounts) {
    const stored = await AsyncStorage.getItem(syncKey(email));
    const fromMs = stored
      ? parseInt(stored, 10)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

    try {
      const result = await importGmailTransactions(userId, email, fromMs, now);
      await AsyncStorage.setItem(syncKey(email), String(now));
      merged.imported    += result.imported;
      merged.duplicates  += result.duplicates;
      merged.skipped     += result.skipped;
      merged.failed      += result.failed;
      merged.pendingCategoryConfirm.push(...result.pendingCategoryConfirm);
      merged.emiDetected.push(...result.emiDetected);
      console.log(`[GmailSync] ${email}: imported=${result.imported} duplicates=${result.duplicates} failed=${result.failed}`);
    } catch (err: any) {
      console.error(`[GmailSync] Failed for ${email}:`, err?.message ?? err);
    }
  }

  // Update global last-sync key so App.tsx 24-hour check still works
  await AsyncStorage.setItem(LEGACY_SYNC, String(now));
  return merged;
}
