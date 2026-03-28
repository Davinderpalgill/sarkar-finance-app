import { MerchantType } from '../models/Transaction';
import { UPI_MERCHANT_SUFFIXES, MERCHANT_KEYWORDS } from '../config/constants';

export interface MerchantDetectionResult {
  merchantType: MerchantType;
  merchantName: string | null;
  personName: string | null;
}

const PERSON_NAME_RE = /\b([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b/;

export function detectMerchantOrPerson(
  merchantOrPerson: string | null,
  upiId: string | null,
  smsBody: string
): MerchantDetectionResult {

  // 1. UPI merchant VPA suffix check
  if (upiId) {
    const lowerUpi = upiId.toLowerCase();
    const isMerchantUpi = UPI_MERCHANT_SUFFIXES.some(suffix =>
      lowerUpi.endsWith(suffix)
    );
    if (isMerchantUpi) {
      return {
        merchantType: 'merchant',
        merchantName: extractMerchantNameFromUpi(upiId) || merchantOrPerson,
        personName: null,
      };
    }
  }

  // 2. Keyword matching in merchant/person string and SMS body
  const target = (merchantOrPerson ?? '') + ' ' + smsBody;
  const lowerTarget = target.toLowerCase();
  for (const kw of MERCHANT_KEYWORDS) {
    if (lowerTarget.includes(kw)) {
      return {
        merchantType: 'merchant',
        merchantName: merchantOrPerson ?? capitalizeFirst(kw),
        personName: null,
      };
    }
  }

  // 3. Person name pattern: Title Case 2-3 word sequence
  if (merchantOrPerson) {
    const nameMatch = merchantOrPerson.match(PERSON_NAME_RE);
    if (nameMatch) {
      return {
        merchantType: 'person',
        merchantName: null,
        personName: nameMatch[1],
      };
    }
  }

  // 4. Fallback: use the raw string as merchant name (unknown type)
  return {
    merchantType: 'unknown',
    merchantName: merchantOrPerson,
    personName: null,
  };
}

function extractMerchantNameFromUpi(upiId: string): string | null {
  // e.g. "merchant.company@razorpay" → "Merchant Company"
  const handle = upiId.split('@')[0];
  if (!handle) return null;
  return handle
    .replace(/[._\-]/g, ' ')
    .split(' ')
    .map(capitalizeFirst)
    .join(' ');
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
