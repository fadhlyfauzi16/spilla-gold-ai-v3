/**
 * SPILLA GOLD - Centralized Symbol Normalization Architecture (SSOT)
 *
 * Maps broker execution variants (for example XAUUSD.cent, XAUUSD.edge, GOLD.cent)
 * to a single canonical market symbol for UI, AI analysis, TradingView charts,
 * and market data while preserving the exact broker-specific symbol for MT5 execution.
 */

export type CanonicalSymbol =
  | 'XAUUSD'
  | 'BTCUSD'
  | 'EURUSD'
  | 'GBPUSD'
  | 'USDJPY';

export const CANONICAL_MARKETS: readonly CanonicalSymbol[] = [
  'XAUUSD',
  'BTCUSD',
  'EURUSD',
  'GBPUSD',
  'USDJPY',
] as const;

export interface SymbolMappingRule {
  canonical: CanonicalSymbol;
  aliases: string[];
  patterns: RegExp[];
}

export const SYMBOL_MAPPING_RULES: SymbolMappingRule[] = [
  {
    canonical: 'XAUUSD',
    aliases: [
      'XAUUSD',
      'XAUUSD.CENT',
      'XAUUSDCENT',
      'XAUUSDC',
      'XAUUSDM',
      'XAUUSD_C',
      'XAUUSD_M',
      'XAUUSD.C',
      'XAUUSD.M',
      'XAUUSD.RAW',
      'XAUUSD.PRO',
      'XAUUSD.ECN',
      'XAUUSD.STD',
      'XAUUSD.EDGE',
      'GOLD',
      'GOLD.CENT',
      'GOLDCENT',
      'GOLDC',
      'GOLDM',
      'GOLD.C',
      'GOLD.M',
      'GOLD.RAW',
      'GOLD.PRO',
      'GOLD.ECN',
      'GOLD.EDGE',
      'XAU',
    ],
    patterns: [
      /^(XAUUSD|GOLD|XAU)(\.(CENT|C|M|MICRO|RAW|PRO|ECN|STD|EDGE|STP|VIP|I|T))?$/i,
      /^(XAUUSD|GOLD)(C|M|MICRO|CENT)$/i,
    ],
  },

  {
    canonical: 'BTCUSD',
    aliases: [
      'BTCUSD',
      'BTCUSD.RAW',
      'BTCUSD.PRO',
      'BTCUSD.ECN',
      'BTCUSD.STD',
      'BTCUSD.EDGE',
      'BTCUSDT',
      'BITCOIN',
      'BTC',
    ],
    patterns: [
      /^(BTCUSD|BTCUSDT|BITCOIN|BTC)(\.(RAW|PRO|ECN|STD|EDGE|STP|VIP|I|T|CENT|C|M))?$/i,
    ],
  },

  {
    canonical: 'EURUSD',
    aliases: [
      'EURUSD',
      'EURUSD.RAW',
      'EURUSD.PRO',
      'EURUSD.ECN',
      'EURUSD.STD',
      'EURUSD.EDGE',
      'EURUSD.CENT',
      'EURUSDCENT',
      'EURUSDC',
      'EURUSDM',
    ],
    patterns: [
      /^EURUSD(\.(RAW|PRO|ECN|STD|EDGE|STP|VIP|I|T|CENT|C|M))?$/i,
      /^EURUSD(C|M|CENT)$/i,
    ],
  },

  {
    canonical: 'GBPUSD',
    aliases: [
      'GBPUSD',
      'GBPUSD.RAW',
      'GBPUSD.PRO',
      'GBPUSD.ECN',
      'GBPUSD.STD',
      'GBPUSD.EDGE',
      'GBPUSD.CENT',
      'GBPUSDCENT',
      'GBPUSDC',
      'GBPUSDM',
    ],
    patterns: [
      /^GBPUSD(\.(RAW|PRO|ECN|STD|EDGE|STP|VIP|I|T|CENT|C|M))?$/i,
      /^GBPUSD(C|M|CENT)$/i,
    ],
  },

  {
    canonical: 'USDJPY',
    aliases: [
      'USDJPY',
      'USDJPY.RAW',
      'USDJPY.PRO',
      'USDJPY.ECN',
      'USDJPY.STD',
      'USDJPY.EDGE',
      'USDJPY.CENT',
      'USDJPYCENT',
      'USDJPYC',
      'USDJPYM',
    ],
    patterns: [
      /^USDJPY(\.(RAW|PRO|ECN|STD|EDGE|STP|VIP|I|T|CENT|C|M))?$/i,
      /^USDJPY(C|M|CENT)$/i,
    ],
  },
];

/**
 * Normalize any broker symbol / alias into the canonical SPILLA market.
 *
 * Examples:
 * XAUUSD.cent -> XAUUSD
 * XAUUSD.edge -> XAUUSD
 * GOLD.cent   -> XAUUSD
 * BTCUSD.edge -> BTCUSD
 */
export function normalizeCanonicalSymbol(
  rawSymbol: string | null | undefined
): string {
  if (!rawSymbol || typeof rawSymbol !== 'string') {
    return 'XAUUSD';
  }

  const clean = rawSymbol.trim().toUpperCase();

  if (!clean) {
    return 'XAUUSD';
  }

  // 1. Direct canonical match
  if ((CANONICAL_MARKETS as readonly string[]).includes(clean)) {
    return clean;
  }

  // 2. Exact configured aliases
  for (const rule of SYMBOL_MAPPING_RULES) {
    if (rule.aliases.includes(clean)) {
      return rule.canonical;
    }
  }

  // 3. Configured patterns
  for (const rule of SYMBOL_MAPPING_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(clean)) {
        return rule.canonical;
      }
    }
  }

  // 4. Controlled heuristic fallback
  if (clean.includes('XAU') || clean.includes('GOLD')) {
    return 'XAUUSD';
  }

  if (clean.includes('BTC') || clean.includes('BITCOIN')) {
    return 'BTCUSD';
  }

  if (clean.includes('EUR') && clean.includes('USD')) {
    return 'EURUSD';
  }

  if (clean.includes('GBP') && clean.includes('USD')) {
    return 'GBPUSD';
  }

  if (clean.includes('USD') && clean.includes('JPY')) {
    return 'USDJPY';
  }

  // Unknown symbol:
  // strip dot suffix but do not invent a known market.
  const base = clean.split('.')[0];

  return base || 'XAUUSD';
}

/**
 * Detect explicit cent-style broker symbols.
 *
 * IMPORTANT:
 * This function intentionally does NOT treat suffix "M" as cent.
 * "M" may mean micro / mini / broker-specific classification.
 *
 * The strongest source of truth for a cent account should remain
 * MT5 account telemetry such as currency = USC.
 */
export function isCentSymbol(
  rawSymbol: string | null | undefined
): boolean {
  if (!rawSymbol || typeof rawSymbol !== 'string') {
    return false;
  }

  const upper = rawSymbol.trim().toUpperCase();

  return (
    upper.includes('CENT') ||
    upper.endsWith('.CENT') ||
    upper.endsWith('.C')
  );
}

/**
 * Resolve the exact broker-specific MT5 symbol for execution.
 *
 * IMPORTANT:
 * Never copy a suffix from one canonical market to another.
 *
 * Examples:
 *
 * mapCanonicalToBroker("XAUUSD", "XAUUSD.cent")
 * -> "XAUUSD.cent"
 *
 * mapCanonicalToBroker("XAUUSD", "XAUUSD.edge")
 * -> "XAUUSD.edge"
 *
 * mapCanonicalToBroker("BTCUSD", "XAUUSD.cent")
 * -> "BTCUSD"
 *
 * NOT:
 * -> "BTCUSD.cent"
 *
 * Correct broker mappings for another market must come from
 * MT5 telemetry / symbol discovery / account configuration.
 */
export function mapCanonicalToBroker(
  canonicalSymbol: string,
  accountBrokerSymbol?: string | null
): string {
  const canonical = normalizeCanonicalSymbol(canonicalSymbol);

  if (
    !accountBrokerSymbol ||
    typeof accountBrokerSymbol !== 'string' ||
    !accountBrokerSymbol.trim()
  ) {
    return canonical;
  }

  const cleanAccountSymbol = accountBrokerSymbol.trim();
  const accountCanonical =
    normalizeCanonicalSymbol(cleanAccountSymbol);

  // Exact broker symbol is safe only when it represents
  // the same canonical market.
  if (accountCanonical === canonical) {
    return cleanAccountSymbol;
  }

  // Never guess or transfer broker suffixes between markets.
  return canonical;
}

/**
 * Clean display label for member-facing market selectors.
 *
 * Broker suffixes such as ".cent" are intentionally hidden here.
 */
export function formatMarketDisplayLabel(
  symbol: string
): string {
  const canonical = normalizeCanonicalSymbol(symbol);

  switch (canonical) {
    case 'XAUUSD':
      return 'XAUUSD (Metals)';

    case 'BTCUSD':
      return 'BTCUSD (Crypto)';

    case 'EURUSD':
      return 'EURUSD (Forex)';

    case 'GBPUSD':
      return 'GBPUSD (Forex)';

    case 'USDJPY':
      return 'USDJPY (Forex)';

    default:
      return canonical;
  }
}