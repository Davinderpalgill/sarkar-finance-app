export interface EmiDetectionResult {
  isEmi: boolean;
  installmentNumber: number | null;  // e.g. 3 from "EMI 3 of 12"
  totalInstallments: number | null;  // e.g. 12
  lenderName: string | null;
  loanAccountNumber: string | null;
  confidence: number;                // 0..1
}

const EMI_KEYWORDS = [
  'emi', 'installment', 'instalment', 'loan emi', 'equated monthly',
  'loan repayment', 'loan deduction', 'auto debit', 'nach debit',
  'ecs debit', 'standing instruction',
];

const EMI_PROGRESS_RE = /emi\s+(\d+)\s+of\s+(\d+)/i;
const LOAN_ACCT_RE    = /loan\s*(?:a\/c|account|no\.?)\s*[\s:]*([A-Z0-9\-]+)/i;

export function isEmiSms(body: string): EmiDetectionResult {
  const lower = body.toLowerCase();

  const keywordScore = EMI_KEYWORDS.filter(kw => lower.includes(kw)).length;
  if (keywordScore === 0) {
    return { isEmi: false, installmentNumber: null, totalInstallments: null, lenderName: null, loanAccountNumber: null, confidence: 0 };
  }

  const progressMatch = body.match(EMI_PROGRESS_RE);
  const loanMatch     = body.match(LOAN_ACCT_RE);

  // Confidence: base 0.6 per keyword, +0.2 for progress pattern, +0.1 for loan account
  let confidence = Math.min(0.6 + (keywordScore - 1) * 0.1, 0.8);
  if (progressMatch) confidence = Math.min(confidence + 0.15, 0.98);
  if (loanMatch) confidence = Math.min(confidence + 0.05, 0.98);

  return {
    isEmi: confidence >= 0.60,
    installmentNumber: progressMatch ? parseInt(progressMatch[1], 10) : null,
    totalInstallments: progressMatch ? parseInt(progressMatch[2], 10) : null,
    lenderName: extractLenderName(body),
    loanAccountNumber: loanMatch ? loanMatch[1] : null,
    confidence,
  };
}

/** Detect recurring pattern: same amount debited on same day each month */
export function detectRecurringPattern(
  amounts: number[],    // paise, sorted by date ascending
  dates: number[],      // epoch ms, same length as amounts
  targetAmount: number
): boolean {
  if (amounts.length < 2) return false;
  const matchingAmounts = amounts.filter(a => Math.abs(a - targetAmount) < 100); // ±₹1
  if (matchingAmounts.length < 2) return false;

  // Check if the dates fall on similar day-of-month
  const matchDates = dates.filter((_, i) => Math.abs(amounts[i] - targetAmount) < 100);
  const dayOfMonths = matchDates.map(d => new Date(d).getDate());
  const modeDay = mode(dayOfMonths);
  const consistent = dayOfMonths.filter(d => Math.abs(d - modeDay) <= 2).length;
  return consistent >= 2;
}

function extractLenderName(body: string): string | null {
  // "deducted by <Lender>" or "from <Lender> loan"
  const m = body.match(/(?:by|from)\s+([A-Za-z][A-Za-z\s]{2,25}?)\s+(?:loan|emi|bank|finance)/i);
  return m ? m[1].trim() : null;
}

function mode(arr: number[]): number {
  const freq: Record<number, number> = {};
  let maxFreq = 0, modeVal = arr[0];
  for (const v of arr) {
    freq[v] = (freq[v] ?? 0) + 1;
    if (freq[v] > maxFreq) { maxFreq = freq[v]; modeVal = v; }
  }
  return modeVal;
}
