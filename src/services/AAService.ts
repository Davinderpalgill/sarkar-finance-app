/**
 * Account Aggregator (AA) service — Setu FIU integration.
 *
 * Setup required:
 *   1. Register at https://setu.co and obtain sandbox Client ID + Secret.
 *   2. Set SETU_CLIENT_ID / SETU_CLIENT_SECRET below (or load from env).
 *   3. Register financeapp://aa-callback as a deep-link scheme in AndroidManifest.xml.
 *
 * Production note: FI data returned by Setu is encrypted with the FIU's public key.
 * Decryption must happen server-side. In sandbox mode the data is unencrypted JSON.
 */
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AADataParser, AAImportResult } from '../ml/AADataParser';

// ── Config ────────────────────────────────────────────────────────────────────

const SETU_BASE_URL      = 'https://fiu-uat.setu.co';
const SETU_CLIENT_ID     = '';  // Set before enabling AA feature
const SETU_CLIENT_SECRET = '';

export const isAAConfigured = () =>
  SETU_CLIENT_ID.length > 0 && SETU_CLIENT_SECRET.length > 0;
const REDIRECT_SCHEME  = 'financeapp://aa-callback';

const STORAGE_CONSENT_ID = '@aa_consent_id';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AAConsentRequest {
  consentId: string;
  redirectUrl: string;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

async function getSetuToken(): Promise<string> {
  const res = await fetch(`${SETU_BASE_URL}/v2/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientID: SETU_CLIENT_ID, secret: SETU_CLIENT_SECRET }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Setu auth failed');
  return data.access_token as string;
}

// ── Consent ───────────────────────────────────────────────────────────────────

/**
 * Creates a consent request and opens the AA portal in the device browser.
 * Persist consentId so fetchAAData can use it after the deep-link callback.
 */
export async function initiateAAConsent(userId: string): Promise<void> {
  const token = await getSetuToken();
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const oneYearLater  = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  const res = await fetch(`${SETU_BASE_URL}/v2/consents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      Detail: {
        consentStart: now.toISOString(),
        consentExpiry: oneYearLater.toISOString(),
        Customer: { id: `${userId}@financeapp` },
        FIDataRange: {
          from: ninetyDaysAgo.toISOString(),
          to: now.toISOString(),
        },
        consentTypes: ['TRANSACTIONS', 'SUMMARY'],
        fiTypes: ['DEPOSIT', 'CREDIT_CARD'],
        Frequency: { value: 30, unit: 'MONTH' },
        DataLife:   { value: 1,  unit: 'YEAR'  },
        redirectUrl: REDIRECT_SCHEME,
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Consent creation failed');

  await AsyncStorage.setItem(STORAGE_CONSENT_ID, data.id);
  await Linking.openURL(data.url);
}

/**
 * Retrieve the stored consent ID (set during initiateAAConsent).
 * Call this from your deep-link handler after the AA callback.
 */
export async function getStoredConsentId(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_CONSENT_ID);
}

export async function clearStoredConsentId(): Promise<void> {
  return AsyncStorage.removeItem(STORAGE_CONSENT_ID);
}

// ── FI Data fetch ─────────────────────────────────────────────────────────────

/**
 * Fetch and parse FI data for a completed consent.
 * Poll up to `maxAttempts` times with `pollIntervalMs` between each.
 */
export async function fetchAAData(
  consentId: string,
  userId: string,
  maxAttempts = 10,
  pollIntervalMs = 3000,
): Promise<AAImportResult> {
  const token = await getSetuToken();
  const now = new Date();

  // Create FI data session
  const sessionRes = await fetch(`${SETU_BASE_URL}/v2/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      consentId,
      format: 'json',
      DataRange: {
        from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        to: now.toISOString(),
      },
    }),
  });

  const sessionData = await sessionRes.json();
  if (!sessionRes.ok) throw new Error(sessionData.message ?? 'Session creation failed');
  const sessionId: string = sessionData.id;

  // Poll for completion
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(r => setTimeout(r, pollIntervalMs));

    const fiRes = await fetch(`${SETU_BASE_URL}/v2/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const fiData = await fiRes.json();
    if (!fiRes.ok) throw new Error(fiData.message ?? 'FI fetch failed');

    if (fiData.status === 'COMPLETED') {
      return AADataParser.parseAndStore(fiData.data ?? [], userId);
    }
    if (fiData.status === 'FAILED') {
      throw new Error('FI data fetch failed on AA server');
    }
    // status === 'PENDING' → keep polling
  }

  throw new Error('Timed out waiting for FI data from AA');
}
