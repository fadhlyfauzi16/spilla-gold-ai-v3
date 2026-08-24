/**
 * Price Utility Functions for SPILLA GOLD Analysis Engine
 *
 * IMPORTANT:
 * CENT account status affects account denomination / balance / tick value,
 * NOT the quoted market price.
 *
 * Example:
 * XAUUSD      = 4639.40
 * XAUUSD.cent = 4639.40
 *
 * Therefore price must NEVER be multiplied or divided only because
 * the broker symbol contains ".cent".
 */

import { normalizeCanonicalSymbol } from './symbolUtils.js';

/**
 * Returns broker/market price without cent-account scaling.
 *
 * The function name is preserved for backward compatibility with
 * existing components that already call normalizeCentPrice().
 *
 * IMPORTANT:
 * - XAUUSD.cent price is NOT divided by 100
 * - XAUUSD.cent price is NOT multiplied by 10/100
 * - account cent normalization belongs to balance/equity utilities,
 *   not price utilities
 */
export function normalizeCentPrice(
  price: number | undefined | null,
  symbol: string = 'XAUUSD'
): number {
  void symbol;

  if (
    price === undefined ||
    price === null ||
    isNaN(Number(price)) ||
    !isFinite(Number(price))
  ) {
    return 0;
  }

  return Number(price);
}

/**
 * Canonical SPILLA symbol for UI/analysis.
 *
 * Examples:
 * XAUUSD.cent -> XAUUSD
 * GOLD.cent   -> XAUUSD
 * BTCUSD.edge -> BTCUSD
 */
export function formatSymbolLabel(
  symbol: string = 'XAUUSD'
): string {
  return normalizeCanonicalSymbol(symbol);
}

/**
 * Returns appropriate display precision for canonical markets.
 */
export function getPriceDigits(
  symbol: string = 'XAUUSD'
): number {
  const canonical = normalizeCanonicalSymbol(symbol);

  switch (canonical) {
    case 'EURUSD':
    case 'GBPUSD':
      return 5;

    case 'USDJPY':
      return 3;

    case 'XAUUSD':
    case 'BTCUSD':
    default:
      return 2;
  }
}

/**
 * Formats market price for visual display.
 *
 * IMPORTANT:
 * Formatting does not alter the economic price scale.
 */
export function formatPriceDisplay(
  price: number | undefined | null,
  symbol: string = 'XAUUSD'
): string {
  const normalizedPrice = normalizeCentPrice(price, symbol);
  const digits = getPriceDigits(symbol);

  return normalizedPrice.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/**
 * Validates that a price is a usable positive market price.
 */
export function isValidMarketPrice(
  price: number | undefined | null
): boolean {
  const numericPrice = Number(price);

  return (
    Number.isFinite(numericPrice) &&
    numericPrice > 0
  );
}

/**
 * Normalizes a price only to the correct decimal precision.
 *
 * This does NOT rescale the price.
 *
 * Example:
 * XAUUSD.cent 4639.42891 -> 4639.43
 */
export function normalizePricePrecision(
  price: number | undefined | null,
  symbol: string = 'XAUUSD'
): number {
  const numericPrice = normalizeCentPrice(price, symbol);

  if (!isValidMarketPrice(numericPrice)) {
    return 0;
  }

  const digits = getPriceDigits(symbol);

  return Number(numericPrice.toFixed(digits));
}