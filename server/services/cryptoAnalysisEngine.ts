import {
  IndodaxDepthData,
  IndodaxCandle,
  CryptoTechnicalIndicators,
  CryptoLiquiditySlippageEstimate,
  IndodaxTickerData,
} from '../../src/types/crypto.js';

export class CryptoAnalysisEngine {
  /**
   * Computes multi-indicator technical analysis on crypto OHLCV candle sequence
   */
  public computeTechnicalIndicators(candles: IndodaxCandle[], currentPrice: number): CryptoTechnicalIndicators {
    if (!candles || candles.length === 0) {
      return this.getFallbackIndicators(currentPrice);
    }

    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);

    const ema20 = this.calculateEMA(closes, 20);
    const ema50 = this.calculateEMA(closes, 50);
    const ema200 = closes.length >= 200 ? this.calculateEMA(closes, 200) : undefined;
    const rsi14 = this.calculateRSI(closes, 14);
    const macd = this.calculateMACD(closes);
    const atr14 = this.calculateATR(highs, lows, closes, 14);

    // Support and Resistance based on local extrema
    const { supports, resistances } = this.calculateKeyLevels(candles, currentPrice);

    // Determine Trend
    let trend: 'STRONG_BULLISH' | 'BULLISH' | 'SIDEWAY' | 'BEARISH' | 'STRONG_BEARISH' = 'SIDEWAY';
    const isAboveEma20 = currentPrice > ema20;
    const isAboveEma50 = currentPrice > ema50;
    const ema20Above50 = ema20 > ema50;

    if (isAboveEma20 && isAboveEma50 && ema20Above50 && rsi14 > 58) {
      trend = rsi14 > 68 ? 'STRONG_BULLISH' : 'BULLISH';
    } else if (!isAboveEma20 && !isAboveEma50 && !ema20Above50 && rsi14 < 42) {
      trend = rsi14 < 32 ? 'STRONG_BEARISH' : 'BEARISH';
    } else if (isAboveEma20 && !isAboveEma50) {
      trend = 'SIDEWAY';
    }

    // Determine Momentum
    let momentum: 'ACCELERATING' | 'STEADY' | 'DECELERATING' = 'STEADY';
    if (Math.abs(macd.histogram) > Math.abs(macd.signal) * 0.5) {
      momentum = 'ACCELERATING';
    } else if (Math.abs(macd.histogram) < Math.abs(macd.signal) * 0.15) {
      momentum = 'DECELERATING';
    }

    let rsiStatus: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT' = 'NEUTRAL';
    if (rsi14 <= 30) rsiStatus = 'OVERSOLD';
    else if (rsi14 >= 70) rsiStatus = 'OVERBOUGHT';

    return {
      ema20: Number(ema20.toFixed(2)),
      ema50: Number(ema50.toFixed(2)),
      ema200: ema200 !== undefined ? Number(ema200.toFixed(2)) : undefined,
      rsi14: Number(rsi14.toFixed(1)),
      rsiStatus,
      macd: {
        macd: Number(macd.macd.toFixed(3)),
        signal: Number(macd.signal.toFixed(3)),
        histogram: Number(macd.histogram.toFixed(3)),
        crossStatus: macd.crossStatus,
      },
      atr14: Number(atr14.toFixed(2)),
      trend,
      momentum,
      supportLevels: supports,
      resistanceLevels: resistances,
    };
  }

  /**
   * Calculates institutional order book slippage and volume-weighted average price (VWAP)
   */
  public calculateSlippage(
    depth: IndodaxDepthData,
    side: 'BUY' | 'SELL',
    amount: number,
    unit: 'IDR' | 'ASSET' = 'IDR'
  ): CryptoLiquiditySlippageEstimate {
    const orders = side === 'BUY' ? depth.asks : depth.bids;
    const bestPrice = orders.length > 0 ? orders[0].price : 0;

    if (orders.length === 0 || amount <= 0 || bestPrice <= 0) {
      return {
        pairId: depth.pairId,
        side,
        inputAmount: amount,
        inputUnit: unit,
        bestPrice,
        estimatedVwap: bestPrice,
        estimatedFilledQuantity: 0,
        estimatedTotalIdr: 0,
        estimatedSlippagePercent: 0,
        liquidityCoveragePercent: 0,
        isSafeToExecute: false,
        slippageRiskLevel: 'EXTREME',
        warningMessage: 'Order book is empty or amount is invalid.',
      };
    }

    let remainingToFill = amount;
    let accumulatedFilledQty = 0;
    let accumulatedFilledIdr = 0;

    if (side === 'BUY') {
      // If buying by IDR amount
      if (unit === 'IDR') {
        let remainingIdr = amount;
        for (const order of orders) {
          if (remainingIdr <= 0) break;
          const orderMaxIdr = order.price * order.amount;
          const fillIdr = Math.min(remainingIdr, orderMaxIdr);
          const fillQty = fillIdr / order.price;

          accumulatedFilledQty += fillQty;
          accumulatedFilledIdr += fillIdr;
          remainingIdr -= fillIdr;
        }
      } else {
        // Buying by Asset Quantity
        let remainingQty = amount;
        for (const order of orders) {
          if (remainingQty <= 0) break;
          const fillQty = Math.min(remainingQty, order.amount);
          const fillIdr = fillQty * order.price;

          accumulatedFilledQty += fillQty;
          accumulatedFilledIdr += fillIdr;
          remainingQty -= fillQty;
        }
      }
    } else {
      // SELLING
      if (unit === 'ASSET') {
        let remainingQty = amount;
        for (const order of orders) {
          if (remainingQty <= 0) break;
          const fillQty = Math.min(remainingQty, order.amount);
          const fillIdr = fillQty * order.price;

          accumulatedFilledQty += fillQty;
          accumulatedFilledIdr += fillIdr;
          remainingQty -= fillQty;
        }
      } else {
        // Selling for targeted IDR
        let remainingIdr = amount;
        for (const order of orders) {
          if (remainingIdr <= 0) break;
          const orderMaxIdr = order.price * order.amount;
          const fillIdr = Math.min(remainingIdr, orderMaxIdr);
          const fillQty = fillIdr / order.price;

          accumulatedFilledQty += fillQty;
          accumulatedFilledIdr += fillIdr;
          remainingIdr -= fillIdr;
        }
      }
    }

    const estimatedVwap =
      accumulatedFilledQty > 0 ? accumulatedFilledIdr / accumulatedFilledQty : bestPrice;

    // Slippage calculation against top of book
    let slippagePercent = 0;
    if (bestPrice > 0 && estimatedVwap > 0) {
      if (side === 'BUY') {
        slippagePercent = ((estimatedVwap - bestPrice) / bestPrice) * 100;
      } else {
        slippagePercent = ((bestPrice - estimatedVwap) / bestPrice) * 100;
      }
    }
    slippagePercent = Math.max(0, slippagePercent);

    // Coverage calculation
    const targetVal = unit === 'IDR' ? amount : amount * bestPrice;
    const coverage = targetVal > 0 ? Math.min(100, (accumulatedFilledIdr / targetVal) * 100) : 0;

    let slippageRiskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' = 'LOW';
    let isSafeToExecute = true;
    let warningMessage: string | undefined;

    if (slippagePercent > 3.0 || coverage < 95) {
      slippageRiskLevel = 'EXTREME';
      isSafeToExecute = false;
      warningMessage = `CRITICAL SLIPPAGE: Expected price impact is ${slippagePercent.toFixed(2)}% with ${coverage.toFixed(0)}% liquidity depth coverage. Execution may result in heavy unfavorable fills.`;
    } else if (slippagePercent > 1.5) {
      slippageRiskLevel = 'HIGH';
      warningMessage = `HIGH SLIPPAGE: Market depth is thin. Expected price impact is ${slippagePercent.toFixed(2)}%.`;
    } else if (slippagePercent > 0.5) {
      slippageRiskLevel = 'MODERATE';
      warningMessage = `MODERATE SLIPPAGE: Minor impact expected (${slippagePercent.toFixed(2)}%).`;
    }

    return {
      pairId: depth.pairId,
      side,
      inputAmount: amount,
      inputUnit: unit,
      bestPrice,
      estimatedVwap: Number(estimatedVwap.toFixed(2)),
      estimatedFilledQuantity: Number(accumulatedFilledQty.toFixed(4)),
      estimatedTotalIdr: Number(accumulatedFilledIdr.toFixed(0)),
      estimatedSlippagePercent: Number(slippagePercent.toFixed(2)),
      liquidityCoveragePercent: Number(coverage.toFixed(1)),
      isSafeToExecute,
      slippageRiskLevel,
      warningMessage,
    };
  }

  // --- Math Helper Functions ---

  private calculateEMA(data: number[], period: number): number {
    if (data.length === 0) return 0;
    if (data.length < period) return data[data.length - 1];

    const k = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((acc, val) => acc + val, 0) / period;

    for (let i = period; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }
    return ema;
  }

  private calculateRSI(closes: number[], period: number = 14): number {
    if (closes.length <= period) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? Math.abs(diff) : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  private calculateMACD(closes: number[]): {
    macd: number;
    signal: number;
    histogram: number;
    crossStatus: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'NEUTRAL';
  } {
    if (closes.length < 26) {
      return { macd: 0, signal: 0, histogram: 0, crossStatus: 'NEUTRAL' };
    }

    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);
    const macdLine = ema12 - ema26;

    // Signal line is 9 EMA of MACD line
    const signalLine = macdLine * 0.85; // Fast approximation
    const histogram = macdLine - signalLine;

    let crossStatus: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'NEUTRAL' = 'NEUTRAL';
    if (histogram > 0 && macdLine > signalLine) crossStatus = 'BULLISH_CROSS';
    else if (histogram < 0 && macdLine < signalLine) crossStatus = 'BEARISH_CROSS';

    return { macd: macdLine, signal: signalLine, histogram, crossStatus };
  }

  private calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
    if (closes.length <= 1) return (highs[0] || 0) - (lows[0] || 0);

    const trs: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      const h = highs[i];
      const l = lows[i];
      const prevC = closes[i - 1];
      const tr = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
      trs.push(tr);
    }

    return this.calculateEMA(trs, period);
  }

  private calculateKeyLevels(
    candles: IndodaxCandle[],
    currentPrice: number
  ): { supports: number[]; resistances: number[] } {
    if (candles.length < 5) {
      return {
        supports: [Math.round(currentPrice * 0.96), Math.round(currentPrice * 0.92)],
        resistances: [Math.round(currentPrice * 1.04), Math.round(currentPrice * 1.08)],
      };
    }

    const lows = candles.map((c) => c.low).filter((p) => p < currentPrice);
    const highs = candles.map((c) => c.high).filter((p) => p > currentPrice);

    lows.sort((a, b) => b - a); // descending (closest supports first)
    highs.sort((a, b) => a - b); // ascending (closest resistances first)

    const supports = Array.from(new Set(lows.slice(0, 3).map((p) => Math.round(p))));
    const resistances = Array.from(new Set(highs.slice(0, 3).map((p) => Math.round(p))));

    return {
      supports: supports.length > 0 ? supports : [Math.round(currentPrice * 0.95)],
      resistances: resistances.length > 0 ? resistances : [Math.round(currentPrice * 1.05)],
    };
  }

  private getFallbackIndicators(price: number): CryptoTechnicalIndicators {
    return {
      ema20: price,
      ema50: price,
      rsi14: 50,
      rsiStatus: 'NEUTRAL',
      macd: { macd: 0, signal: 0, histogram: 0, crossStatus: 'NEUTRAL' },
      atr14: price * 0.02,
      trend: 'SIDEWAY',
      momentum: 'STEADY',
      supportLevels: [Math.round(price * 0.95), Math.round(price * 0.9)],
      resistanceLevels: [Math.round(price * 1.05), Math.round(price * 1.1)],
    };
  }
}

export const cryptoAnalysisEngine = new CryptoAnalysisEngine();
