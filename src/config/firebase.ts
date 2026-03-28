// Firebase is configured via google-services.json on Android
// This file provides typed helpers and collection references

export const COLLECTIONS = {
  USERS: 'users',
  TRANSACTIONS: 'transactions',
  EMIS: 'emis',
  LEDGER: 'ledger',
  GROUPS: 'groups',
  SPLITS: 'splits',
  BALANCES: 'balances',
  CATEGORIES: 'categories',
} as const;

export const FIREBASE_CONFIG = {
  // Populated from google-services.json at build time
  // Do not add keys here — use google-services.json
};
