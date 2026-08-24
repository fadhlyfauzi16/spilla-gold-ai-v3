import { SymbolSpecification } from '../types.js';

export interface EquityLotTier {
  minEquity: number;
  maxEquity: number;
  recommendedLot: number;
  label: string;
}

/**
 * SPILLA GOLD - Manual Lot Control
 *
 * Current execution policy:
 * - Default starting lot = 0.01
 * - Equity no longer changes the starting lot automatically
 * - User may still manually change the lot
 * - Broker min/max/step validation remains active
 */
export const DEFAULT_MANUAL_LOT = 0.01;

/**
 * Kept for compatibility with existing UI/admin code.
 *
 * All tiers intentionally recommend 0.01 so older components
 * that still call this table do not unexpectedly produce
 * larger starting lots based on equity.
 */
export const DEFAULT_EQUITY_LOT_TIERS: EquityLotTier[] = [
  {
    minEquity: 0,
    maxEquity: 250,
    recommendedLot: 0.01,
    label: '$0 – $250',
  },
  {
    minEquity: 250,
    maxEquity: 500,
    recommendedLot: 0.01,
    label: '$250 – $500',
  },
  {
    minEquity: 500,
    maxEquity: 750,
    recommendedLot: 0.01,
    label: '$500 – $750',
  },
  {
    minEquity: 750,
    maxEquity: 1000,
    recommendedLot: 0.01,
    label: '$750 – $1,000',
  },
  {
    minEquity: 1000,
    maxEquity: 1500,
    recommendedLot: 0.01,
    label: '$1,000 – $1,500',
  },
  {
    minEquity: 1500,
    maxEquity: 2000,
    recommendedLot: 0.01,
    label: '$1,500 – $2,000',
  },
  {
    minEquity: 2000,
    maxEquity: Infinity,
    recommendedLot: 0.01,
    label: '> $2,000',
  },
];

/**
 * Determines whether a given trading account is a CENT account.
 */
export function isCentAccount(
  account?: {
    currency?: string | null;
    accountType?: string | null;
    symbol?: string | null;
  } | null
): boolean {
  if (!account) {
    return false;
  }

  const currency = (account.currency || '').toUpperCase().trim();
  const accountType = (account.accountType || '').toUpperCase().trim();
  const symbol = (account.symbol || '').toUpperCase().trim();

  return (
    currency === 'USC' ||
    currency === 'USD CENT' ||
    currency === 'CENT' ||
    currency === 'EUX' ||
    accountType.includes('CENT') ||
    symbol.includes('.CENT') ||
    symbol.includes('CENT')
  );
}

/**
 * Normalizes Cent account telemetry into real USD equivalent.
 *
 * Example:
 * 100,000 USC -> 1,000 USD
 */
export function normalizeCentToUsd(
  rawAmount: number | undefined | null,
  accountOrIsCent?:
    | boolean
    | {
        currency?: string | null;
        accountType?: string | null;
        symbol?: string | null;
      }
    | null
): number {
  const amount = Number(rawAmount) || 0;

  const isCent =
    typeof accountOrIsCent === 'boolean'
      ? accountOrIsCent
      : isCentAccount(accountOrIsCent);

  return isCent ? amount / 100 : amount;
}

/**
 * Formats MT5 account telemetry.
 */
export function formatAccountValue(
  rawAmount: number | undefined | null,
  accountOrIsCent?:
    | boolean
    | {
        currency?: string | null;
        accountType?: string | null;
        symbol?: string | null;
      }
    | null,
  options?: {
    showPlusSign?: boolean;
    decimals?: number;
  }
): {
  raw: number;
  usdEquivalent: number;
  primaryFormatted: string;
  usdFormatted: string;
  dualDisplay: string;
  isCent: boolean;
} {
  const amount = Number(rawAmount) || 0;

  const isCent =
    typeof accountOrIsCent === 'boolean'
      ? accountOrIsCent
      : isCentAccount(accountOrIsCent);

  const usdEquivalent = isCent ? amount / 100 : amount;

  const decimals =
    options?.decimals !== undefined
      ? options.decimals
      : 2;

  const showPlusSign = Boolean(
    options?.showPlusSign && amount > 0
  );

  const plusPrefix = showPlusSign ? '+' : '';

  const primaryFormatted =
    `${plusPrefix}${amount.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })} ${isCent ? 'USC' : 'USD'}`;

  const usdFormatted =
    `${plusPrefix}$${usdEquivalent.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const dualDisplay = isCent
    ? `${primaryFormatted} ≈ ${usdFormatted}`
    : usdFormatted;

  return {
    raw: amount,
    usdEquivalent,
    primaryFormatted,
    usdFormatted,
    dualDisplay,
    isCent,
  };
}

/**
 * Returns the starting/recommended lot.
 *
 * IMPORTANT:
 * Equity is currently informational only.
 * SPILLA starts from 0.01 lot regardless of account equity.
 *
 * Broker specifications are still respected.
 */
export function getRecommendedLot(
  normalizedUsdEquity: number,
  spec?: Partial<SymbolSpecification> | null,
  tiers: EquityLotTier[] = DEFAULT_EQUITY_LOT_TIERS
): number {
  // Keep parameters referenced for API compatibility.
  void normalizedUsdEquity;
  void tiers;

  const requestedLot = DEFAULT_MANUAL_LOT;

  if (!spec) {
    return requestedLot;
  }

  const minVol =
    spec.volumeMin ??
    spec.minLot ??
    0.01;

  const maxVol =
    spec.volumeMax ??
    spec.maxLot ??
    100.0;

  const step =
    spec.volumeStep ??
    spec.lotStep ??
    0.01;

  const safeStep =
    Number.isFinite(step) && step > 0
      ? step
      : 0.01;

  const clamped = Math.min(
    maxVol,
    Math.max(minVol, requestedLot)
  );

  const stepDecimals =
    safeStep.toString().split('.')[1]?.length || 2;

  /**
   * Normalize relative to broker minimum.
   * This avoids bad step alignment for brokers whose
   * minimum does not start at zero.
   */
  const steps = Math.round(
    (clamped - minVol) / safeStep
  );

  const normalizedLot =
    minVol + steps * safeStep;

  return Number(
    Math.min(
      maxVol,
      Math.max(minVol, normalizedLot)
    ).toFixed(stepDecimals)
  );
}

/**
 * Validates manual lot input against broker specifications.
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
  const minVol =
    spec?.volumeMin ??
    spec?.minLot ??
    0.01;

  const maxVol =
    spec?.volumeMax ??
    spec?.maxLot ??
    100.0;

  const step =
    spec?.volumeStep ??
    spec?.lotStep ??
    0.01;

  const safeStep =
    Number.isFinite(step) && step > 0
      ? step
      : 0.01;

  const stepDecimals =
    safeStep.toString().split('.')[1]?.length || 2;

  if (
    lot === undefined ||
    lot === null ||
    isNaN(lot) ||
    !isFinite(lot) ||
    lot <= 0
  ) {
    return {
      valid: false,
      normalizedLot: minVol,
      error: 'Lot size must be a valid number greater than 0.',
      minLot: minVol,
      maxLot: maxVol,
      lotStep: safeStep,
    };
  }

  if (lot < minVol - 1e-6) {
    return {
      valid: false,
      normalizedLot: minVol,
      error: `Lot size ${lot} is below broker minimum of ${minVol}.`,
      minLot: minVol,
      maxLot: maxVol,
      lotStep: safeStep,
    };
  }

  if (lot > maxVol + 1e-6) {
    return {
      valid: false,
      normalizedLot: maxVol,
      error: `Lot size ${lot} exceeds broker maximum of ${maxVol}.`,
      minLot: minVol,
      maxLot: maxVol,
      lotStep: safeStep,
    };
  }

  const steps = Math.round(
    (lot - minVol) / safeStep
  );

  const expectedLot = Number(
    (
      minVol +
      steps * safeStep
    ).toFixed(stepDecimals)
  );

  if (Math.abs(lot - expectedLot) > 1e-4) {
    return {
      valid: false,
      normalizedLot: expectedLot,
      error:
        `Lot size ${lot} does not match broker step of ${safeStep}. ` +
        `Nearest valid lot is ${expectedLot}.`,
      minLot: minVol,
      maxLot: maxVol,
      lotStep: safeStep,
    };
  }

  return {
    valid: true,
    normalizedLot: Number(
      lot.toFixed(stepDecimals)
    ),
    minLot: minVol,
    maxLot: maxVol,
    lotStep: safeStep,
  };
}

/**
 * Advisory only.
 *
 * Because the current recommendation is fixed at 0.01,
 * any manually selected lot above 0.01 may trigger
 * the high-lot advisory.
 */
export function isHighLotAdvisory(
  selectedLot: number,
  recommendedLot: number = DEFAULT_MANUAL_LOT
): boolean {
  return selectedLot > recommendedLot + 1e-4;
}