export const CONSTANTS = {
  // Monetary
  PAISE_PER_RUPEE: 100,

  // ML thresholds
  CATEGORY_CONFIDENCE_THRESHOLD: 0.75,
  MERCHANT_CONFIDENCE_THRESHOLD: 0.70,
  EMI_CONFIDENCE_THRESHOLD: 0.80,

  // Sync
  SYNC_INTERVAL_MS: 30_000,
  MAX_SYNC_BATCH: 100,

  // Notifications
  DEFAULT_EMI_REMINDER_DAYS: 3,
  DEFAULT_LEDGER_REMINDER_DAYS: 1,

  // SMS
  SMS_IMPORT_LOOKBACK_DAYS: 180,
  MAX_SMS_BATCH: 500,

  // Background fetch
  BACKGROUND_FETCH_INTERVAL_MINUTES: 15, // minimum iOS interval

  // Pagination
  DEFAULT_PAGE_SIZE: 20,

  // Channels
  NOTIFICATION_CHANNEL_EMI: 'emi-reminders',
  NOTIFICATION_CHANNEL_LEDGER: 'ledger-reminders',
  NOTIFICATION_CHANNEL_GENERAL: 'general',
} as const;

export const BANK_SENDER_PREFIXES = [
  'HDFC', 'SBIBNK', 'ICICIB', 'AXISBK', 'KOTAKB', 'IDFCFB',
  'PHONEPE', 'GPAY', 'PAYTM', 'YESBNK', 'INDBNK', 'PNBSMS',
  'BOIIND', 'CANBNK', 'UNIONB', 'SCBNK',
] as const;

export const UPI_MERCHANT_SUFFIXES = [
  '@razorpay', '@paytm', '@ybl', '@okhdfcbank', '@okicici',
  '@oksbi', '@okaxis', '@apl', '@ibl', '@pnb', '@sbi',
  '@upi', '@axl', '@timecosmos',
] as const;

export const MERCHANT_KEYWORDS = [
  'swiggy', 'zomato', 'amazon', 'flipkart', 'uber', 'ola',
  'netflix', 'spotify', 'hotstar', 'bigbasket', 'blinkit',
  'grofers', 'dunzo', 'myntra', 'ajio', 'nykaa', 'meesho',
  'zepto', 'jiomart', 'dmart', 'reliance', 'fuel', 'petrol',
  'diesel', 'hospital', 'pharmacy', 'medical', 'clinic',
  'electricity', 'water', 'gas', 'recharge', 'broadband',
  'insurance', 'premium', 'rent', 'maintenance', 'society',
] as const;
