/**
 * SPILLA GOLD — Crypto AI Engine & INDODAX Architecture Types
 */

export interface IndodaxMarketPair {
  id: string; // e.g. "castidr", "btcidr"
  symbol: string; // e.g. "CAST/IDR", "BTC/IDR"
  baseCurrency: string; // e.g. "CAST", "BTC"
  quoteCurrency: string; // "IDR"
  displayName: string;
  priceScale: number; // decimal places
  minPrice: number;
  minAmount: number;
  minTotalIdr: number;
  isPopular?: boolean;
}

export interface IndodaxTickerData {
  pairId: string;
  symbol: string;
  lastPrice: number;
  high24h: number;
  low24h: number;
  volumeBase: number;
  volumeIdr: number;
  bidPrice: number;
  askPrice: number;
  spread: number;
  spreadPercent: number;
  change24hPercent: number;
  serverTime: number;
  updatedAt: string;
}

export interface IndodaxDepthOrder {
  price: number;
  amount: number;
  totalIdr: number;
  cumulativeIdr: number;
  cumulativeAmount: number;
}

export interface IndodaxDepthData {
  pairId: string;
  symbol: string;
  bids: IndodaxDepthOrder[];
  asks: IndodaxDepthOrder[];
  totalBidDepthIdr: number;
  totalAskDepthIdr: number;
  orderBookImbalancePercent: number; // positive = buy pressure, negative = sell pressure
  buyPressureRatio: number; // 0 to 100
  sellPressureRatio: number; // 0 to 100
  liquidityConcentration: 'HIGH' | 'MODERATE' | 'LOW' | 'THIN';
  updatedAt: string;
}

export interface IndodaxTradeData {
  tid: string;
  date: number;
  timeFormatted: string;
  price: number;
  amount: number;
  totalIdr: number;
  type: 'buy' | 'sell';
}

export interface IndodaxCandle {
  time: number; // timestamp in seconds or ISO string
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CryptoTechnicalIndicators {
  ema20: number;
  ema50: number;
  ema200?: number;
  rsi14: number;
  rsiStatus: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';
  macd: {
    macd: number;
    signal: number;
    histogram: number;
    crossStatus: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'NEUTRAL';
  };
  atr14: number;
  trend: 'STRONG_BULLISH' | 'BULLISH' | 'SIDEWAY' | 'BEARISH' | 'STRONG_BEARISH';
  momentum: 'ACCELERATING' | 'STEADY' | 'DECELERATING';
  supportLevels: number[];
  resistanceLevels: number[];
}

export interface CryptoLiquiditySlippageEstimate {
  pairId: string;
  side: 'BUY' | 'SELL';
  inputAmount: number; // IDR for buy, Coin for sell
  inputUnit: 'IDR' | 'ASSET';
  bestPrice: number;
  estimatedVwap: number;
  estimatedFilledQuantity: number;
  estimatedTotalIdr: number;
  estimatedSlippagePercent: number;
  liquidityCoveragePercent: number;
  isSafeToExecute: boolean;
  slippageRiskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
  warningMessage?: string;
}

export interface CryptoAiRecommendation {
  id: string;
  pairId: string;
  symbol: string;
  action: 'STRONG_BUY' | 'BUY' | 'WAIT' | 'SELL' | 'STRONG_SELL';
  confidence: number; // 0 to 100
  currentPrice: number;
  plannedEntry: number;
  takeProfit1: number;
  takeProfit2: number;
  stopLoss: number;
  riskRewardRatio: number;
  suggestedAllocationPercent: number; // e.g. 5, 10, 25, 50
  expectedSlippagePercent: number;
  liquidityStatus: 'ABUNDANT' | 'SUFFICIENT' | 'THIN' | 'CRITICAL_SLIPPAGE';
  marketStructure: string;
  aiRationale: string;
  keyDrivers: string[];
  invalidationLevel: number;
  generatedAt: string;
}

export interface IndodaxUserAccountInfo {
  isConnected: boolean;
  maskedApiKey?: string;
  lastSyncAt?: string;
  balances: {
    [currency: string]: {
      available: number;
      hold: number;
      total: number;
      estimatedIdrValue?: number;
    };
  };
  totalPortfolioEstimatedIdr: number;
  availableIdr: number;
  userName?: string;
  userEmail?: string;
  health: {
    isApiReachable: boolean;
    latencyMs: number;
  };
}

export interface CryptoOrderExecutionPayload {
  pairId: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  orderType: 'LIMIT' | 'MARKET';
  price: number;
  amountIdr?: number;
  amountAsset?: number;
  allocationPercent?: number;
  maxSlippagePercent?: number;
  idempotencyKey: string;
}

export interface CryptoOrderResult {
  success: boolean;
  orderId?: string;
  indodaxOrderId?: string;
  status: 'SUBMITTED' | 'PARTIALLY_FILLED' | 'FILLED' | 'REJECTED' | 'FAILED';
  filledAmount?: number;
  filledPrice?: number;
  estimatedVwap?: number;
  estimatedSlippagePercent?: number;
  totalIdr?: number;
  message: string;
  errorCode?: string;
}

export interface CryptoOpenOrder {
  orderId: string;
  indodaxOrderId: string;
  pairId: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  price: number;
  originalAmount: number;
  remainAmount: number;
  totalIdr: number;
  submitTime: string;
  status: string;
}

export interface CryptoOrderHistoryItem {
  id: string;
  orderId: string;
  indodaxOrderId?: string;
  pair: string;
  type: 'BUY' | 'SELL';
  orderType: string;
  price: number;
  amount: number;
  totalIdr: number;
  filledAmount: number;
  filledPrice?: number;
  estimatedVwap?: number;
  estimatedSlippagePercent?: number;
  status: string;
  errorMessage?: string;
  createdAt: string;
}
