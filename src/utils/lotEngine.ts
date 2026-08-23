import { SymbolSpecification } from '../types.js';

export interface EquityLotTier {
  minEquity: number;
  maxEquity: number; // Infinity for open-ended top tier
  recommendedLot: number;
  label: string;
}

/**
 * Admin-Configurable Equity-to-Lot Recommendation Table
 * Default Conservative Guideline Table:
 *   $0 – $250       => 0.01
 *   > $250 – $500   => 0.02
 *   > $500 – $750   => 0.03
 *   > $750 – $1,000 => 0.05
 *   > $1,000 – $1,500 => 0.06
 *   > $1,500 – $2,000 => 0.08
 *   > $2,000        => 0.10
 */
export const DEFAULT_EQUITY_LOT_TIERS: EquityLotTier[] = [
  { minEquity: 0, maxEquity: 250, recommendedLot: 0.01, label: '$0 – $250' },
  { minEquity: 250, maxEquity: 500, recommendedLot: 0.02, label: '$250 – $500' },
  { minEquity: 500, maxEquity: 750, recommendedLot: 0.03, label: '$500 – $750' },
  { minEquity: 750, maxEquity: 1000, recommendedLot: 0.05, label: '$750 – $1,000' },
  { minEquity: 1000, maxEquity: 1500, recommendedLot: 0.06, label: '$1,000 – $1,500' },
  { minEquity: 1500, maxEquity: 2000, recommendedLot: 0.08, label: '$1,500 – $2,000' },
  { minEquity: 2000, maxEquity: Infinity, recommendedLot: 0.10, label: '> $2,000' },
];

/**
 * Determines whether a given trading account is a CENT account (e.g. USC currency).
 */
export function isCentAccount(account?: {
  currency?: string | null;
  accountType?: string | null;
  symbol?: string | null;
} | null): boolean {
  if (!account) return false;
  const curr = (account.currency || '').toUpperCase().trim();
  const accType = (account.accountType || '').toUpperCase().trim();
  const sym = (account.symbol || '').toUpperCase().trim();

  return (
    curr === 'USC' ||
    curr === 'USD CENT' ||
    curr === 'CENT' ||
    curr === 'EUX' ||
    accType.includes('CENT') ||
    sym.includes('.CENT') ||
    sym.includes('CENT')
  );
}

/**
 * Normalizes balance, equity, margin, or floating P/L to real USD equivalent.
 * For Cent accounts (e.g. 100,000 USC), divides by 100 to yield $1,000.00 USD.
 * For Standard USD accounts, returns the raw value unchanged.
 */
export function normalizeCentToUsd(
  rawAmount: number | undefined | null,
  accountOrIsCent?:
    | boolean
    | { currency?: string | null; accountType?: string | null; symbol?: string | null }
    | null
): number {
  const amount = Number(rawAmount) || 0;
  const isCent = typeof accountOrIsCent === 'boolean' ? accountOrIsCent : isCentAccount(accountOrIsCent);
  return isCent ? amount / 100 : amount;
}

/**
 * Formats a currency balance/equity/PnL for visual display, showing primary currency + USD equivalent if Cent.
 */
export function formatAccountValue(
  rawAmount: number | undefined | null,
  accountOrIsCent?:
    | boolean
    | { currency?: string | null; accountType?: string | null; symbol?: string | null }
    | null,
  options?: { showPlusSign?: boolean; decimals?: number }
): {
  raw: number;
  usdEquivalent: number;
  primaryFormatted: string;
  usdFormatted: string;
  dualDisplay: string;
  isCent: boolean;
} {
  const amount = Number(rawAmount) || 0;
  const isCent = typeof accountOrIsCent === 'boolean' ? accountOrIsCent : isCentAccount(accountOrIsCent);
  const usdVal = isCent ? amount / 100 : amount;
  const decimals = options?.decimals !== undefined ? options.decimals : 2;
  const showPlus = Boolean(options?.showPlusSign && amount > 0);
  const plusPrefix = showPlus ? '+' : '';

  const primaryFormatted = `${plusPrefix}${amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} ${isCent ? 'USC' : 'USD'}`;

  const usdFormatted = `${plusPrefix}$${usdVal.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const dualDisplay = isCent
    ? `${primaryFormatted} ≈ ${usdFormatted}`
    : usdFormatted;

  return {
    raw: amount,
    usdEquivalent: usdVal,
    primaryFormatted,
    usdFormatted,
    dualDisplay,
    isCent,
  };
}

/**
 * Calculates the Equity-Based Recommended Lot from normalized real USD equity.
 * Respects broker symbol minimum, maximum, and volume step.
 */
export function getRecommendedLot(
  normalizedUsdEquity: number,
  spec?: Partial<SymbolSpecification> | null,
  tiers: EquityLotTier[] = DEFAULT_EQUITY_LOT_TIERS
): number {
  const equity = Math.max(0, normalizedUsdEquity || 0);
  let recommended = 0.01;

  for (const tier of tiers) {
    if (equity >= tier.minEquity && (tier.maxEquity === Infinity ? true : equity < tier.maxEquity)) {
      recommended = tier.recommendedLot;
      break;
    }
  }

  // If spec is available, clamp and step normalize
  if (spec) {
    const minVol = spec.volumeMin ?? spec.minLot ?? 0.01;
    const maxVol = spec.volumeMax ?? spec.maxLot ?? 100.0;
    const step = spec.volumeStep ?? spec.lotStep ?? 0.01;

    const clamped = Math.min(maxVol, Math.max(minVol, recommended));
    const stepDecimals = step.toString().split('.')[1]?.length || 2;
    const stepped = Math.floor(clamped / step) * step;
    return Number(Math.max(minVol, stepped).toFixed(stepDecimals));
  }

  return recommended;
}

/**
 * Validates a manual lot input against broker specifications (Min, Max, Step).
 */
export function validateBrokerLot(
  lot: number,
  spec?: Partial<SymbolSpecification> | null
): {
  valid: boolean;
  normalizedLot: number;
  error?: string;
  minLot: number;
  maxLot: number;
  lotStep: number;
} {
  const minVol = spec?.volumeMin ?? spec?.minLot ?? 0.01;
  const maxVol = spec?.volumeMax ?? spec?.maxLot ?? 100.0;
  const step = spec?.volumeStep ?? spec?.lotStep ?? 0.01;
  const stepDecimals = step.toString().split('.')[1]?.length || 2;

  if (lot === undefined || lot === null || isNaN(lot) || !isFinite(lot) || lot <= 0) {
    return {
      valid: false,
      normalizedLot: minVol,
      error: 'Lot size must be a valid number greater than 0.',
      minLot: minVol,
      maxLot: maxVol,
      lotStep: step,
    };
  }

  if (lot < minVol - 1e-6) {
    return {
      valid: false,
      normalizedLot: minVol,
      error: `Lot size ${lot} is below broker minimum of ${minVol}.`,
      minLot: minVol,
      maxLot: maxVol,
      lotStep: step,
    };
  }

  if (lot > maxVol + 1e-6) {
    return {
      valid: false,
      normalizedLot: maxVol,
      error: `Lot size ${lot} exceeds broker maximum of ${maxVol}.`,
      minLot: minVol,
      maxLot: maxVol,
      lotStep: step,
    };
  }

  // Volume step alignment check
  const steps = Math.round((lot - minVol) / step);
  const expectedLot = Number((minVol + steps * step).toFixed(stepDecimals));
  if (Math.abs(lot - expectedLot) > 1e-4) {
    return {
      valid: false,
      normalizedLot: expectedLot,
      error: `Lot size ${lot} does not match broker step of ${step}. Nearest valid lot is ${expectedLot}.`,
      minLot: minVol,
      maxLot: maxVol,
      lotStep: step,
    };
  }

  return {
    valid: true,
    normalizedLot: Number(lot.toFixed(stepDecimals)),
    minLot: minVol,
    maxLot: maxVol,
    lotStep: step,
  };
}

/**
 * High Lot Advisory Check (Non-blocking advisory warning).
 * Returns true if user-selected manual lot is noticeably above the SPILLA equity recommendation.
 */
export function isHighLotAdvisory(selectedLot: number, recommendedLot: number): boolean {
  return selectedLot > recommendedLot + 1e-4;
}
