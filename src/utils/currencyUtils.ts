import { CONSTANTS } from '../config/constants';

/** Convert paise (integer) to rupee display string, e.g. 150000 → "₹1,500.00" */
export function formatCurrency(paise: number): string {
  const rupees = paise / CONSTANTS.PAISE_PER_RUPEE;
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(rupees);
  } catch {
    // Fallback for Hermes environments without full Intl support
    const fixed = rupees.toFixed(2);
    const [intPart, decPart] = fixed.split('.');
    const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `₹${formatted}.${decPart}`;
  }
}

/** Format paise as compact string, e.g. 150000 → "₹1,500" */
export function formatCurrencyCompact(paise: number): string {
  const rupees = paise / CONSTANTS.PAISE_PER_RUPEE;
  if (rupees >= 1_00_000) {
    return `₹${(rupees / 1_00_000).toFixed(2)}L`;
  }
  if (rupees >= 1_000) {
    return `₹${(rupees / 1_000).toFixed(1)}K`;
  }
  return `₹${rupees.toFixed(0)}`;
}

/** Convert rupee amount (float string) to paise (integer) safely */
export function rupeesToPaise(rupeesStr: string): number {
  const val = parseFloat(rupeesStr.replace(/,/g, ''));
  if (isNaN(val)) return 0;
  return Math.round(val * CONSTANTS.PAISE_PER_RUPEE);
}

/** Paise to rupee number */
export function paiseToRupees(paise: number): number {
  return paise / CONSTANTS.PAISE_PER_RUPEE;
}
