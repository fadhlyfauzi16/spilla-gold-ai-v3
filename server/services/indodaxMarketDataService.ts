import {
  IndodaxMarketPair,
  IndodaxTickerData,
  IndodaxDepthData,
  IndodaxDepthOrder,
  IndodaxTradeData,
  IndodaxCandle,
} from '../../src/types/crypto.js';

/**
 * Supported INDODAX Market Registry.
 * Default initial pair: CAST/IDR (as requested).
 */
export const SUPPORTED_INDODAX_PAIRS: IndodaxMarketPair[] = [
  {
    id: 'castidr',
    symbol: 'CAST/IDR',
    baseCurrency: 'CAST',
    quoteCurrency: 'IDR',
    displayName: 'Castello Coin (CAST/IDR)',
    priceScale: 0,
    minPrice: 1,
    minAmount: 1,
    minTotalIdr: 10000,
    isPopular: true,
  },
  {
    id: 'btcidr',
    symbol: 'BTC/IDR',
    baseCurrency: 'BTC',
    quoteCurrency: 'IDR',
    displayName: 'Bitcoin (BTC/IDR)',
    priceScale: 0,
    minPrice: 1000,
    minAmount: 0.00001,
    minTotalIdr: 10000,
    isPopular: true,
  },
  {
    id: 'ethidr',
    symbol: 'ETH/IDR',
    baseCurrency: 'ETH',
    quoteCurrency: 'IDR',
    displayName: 'Ethereum (ETH/IDR)',
    priceScale: 0,
    minPrice: 1000,
    minAmount: 0.0001,
    minTotalIdr: 10000,
    isPopular: true,
  },
  {
    id: 'solidr',
    symbol: 'SOL/IDR',
    baseCurrency: 'SOL',
    quoteCurrency: 'IDR',
    displayName: 'Solana (SOL/IDR)',
    priceScale: 0,
    minPrice: 100,
    minAmount: 0.001,
    minTotalIdr: 10000,
    isPopular: true,
  },
  {
    id: 'usdtidr',
    symbol: 'USDT/IDR',
    baseCurrency: 'USDT',
    quoteCurrency: 'IDR',
    displayName: 'Tether USD (USDT/IDR)',
    priceScale: 0,
    minPrice: 1,
    minAmount: 0.1,
    minTotalIdr: 10000,
  },
  {
    id: 'xrpidr',
    symbol: 'XRP/IDR',
    baseCurrency: 'XRP',
    quoteCurrency: 'IDR',
    displayName: 'Ripple (XRP/IDR)',
    priceScale: 0,
    minPrice: 1,
    minAmount: 0.1,
    minTotalIdr: 10000,
  },
  {
    id: 'dogeidr',
    symbol: 'DOGE/IDR',
    baseCurrency: 'DOGE',
    quoteCurrency: 'IDR',
    displayName: 'Dogecoin (DOGE/IDR)',
    priceScale: 0,
    minPrice: 1,
    minAmount: 1,
    minTotalIdr: 10000,
  },
];

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class IndodaxMarketDataService {
  private tickerCache: Map<string, CacheEntry<IndodaxTickerData>> = new Map();
  private depthCache: Map<string, CacheEntry<IndodaxDepthData>> = new Map();
  private tradesCache: Map<string, CacheEntry<IndodaxTradeData[]>> = new Map();
  private klinesCache: Map<string, CacheEntry<IndodaxCandle[]>> = new Map();

  private readonly CACHE_TTL_MS = 2000; // 2 seconds TTL

  public getAllPairs(): IndodaxMarketPair[] {
    return SUPPORTED_INDODAX_PAIRS;
  }

  public resolvePair(pairOrId: string): IndodaxMarketPair {
    const clean = pairOrId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const found = SUPPORTED_INDODAX_PAIRS.find(
      (p) => p.id.toLowerCase() === clean || p.symbol.replace('/', '').toLowerCase() === clean
    );
    return (
      found || {
        id: clean,
        symbol: `${clean.toUpperCase()}/IDR`,
        baseCurrency: clean.toUpperCase().replace('IDR', ''),
        quoteCurrency: 'IDR',
        displayName: `${clean.toUpperCase()}/IDR`,
        priceScale: 0,
        minPrice: 1,
        minAmount: 0.0001,
        minTotalIdr: 10000,
      }
    );
  }

  /**
   * Fetches real live Ticker from INDODAX public API
   */
  public async getTicker(pairId: string): Promise<IndodaxTickerData | null> {
    const pair = this.resolvePair(pairId);
    const cached = this.tickerCache.get(pair.id);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const url = `https://indodax.com/api/ticker/${pair.id}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'SPILLA-GOLD-QUANT/1.0' },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        throw new Error(`INDODAX Ticker HTTP error: ${res.status}`);
      }

      const json: any = await res.json();
      const raw = json?.ticker;

      if (!raw || !raw.last) {
        return null;
      }

      const lastPrice = Number(raw.last) || 0;
      const high24h = Number(raw.high) || lastPrice;
      const low24h = Number(raw.low) || lastPrice;
      const bidPrice = Number(raw.buy) || lastPrice;
      const askPrice = Number(raw.sell) || lastPrice;
      const volumeBase = Number(raw[`vol_${pair.baseCurrency.toLowerCase()}`]) || Number(raw.vol) || 0;
      const volumeIdr = Number(raw.vol_idr) || volumeBase * lastPrice;
      const spread = Math.max(0, askPrice - bidPrice);
      const spreadPercent = bidPrice > 0 ? (spread / bidPrice) * 100 : 0;

      // Estimate 24h change from high/low/last if 24h open is not explicitly returned
      const approxMid = (high24h + low24h) / 2;
      const change24hPercent = approxMid > 0 ? ((lastPrice - approxMid) / approxMid) * 100 : 0;

      const tickerData: IndodaxTickerData = {
        pairId: pair.id,
        symbol: pair.symbol,
        lastPrice,
        high24h,
        low24h,
        volumeBase,
        volumeIdr,
        bidPrice,
        askPrice,
        spread,
        spreadPercent: Number(spreadPercent.toFixed(2)),
        change24hPercent: Number(change24hPercent.toFixed(2)),
        serverTime: Number(raw.server_time) || Math.floor(Date.now() / 1000),
        updatedAt: new Date().toISOString(),
      };

      this.tickerCache.set(pair.id, { data: tickerData, timestamp: Date.now() });
      return tickerData;
    } catch (err: any) {
      console.warn(`[INDODAX Market Data] Ticker fetch error for ${pair.id}:`, err.message);
      // Return stale cache if present
      if (cached) return cached.data;
      return null;
    }
  }

  /**
   * Fetches real live Order Book (Depth) from INDODAX public API
   */
  public async getDepth(pairId: string): Promise<IndodaxDepthData | null> {
    const pair = this.resolvePair(pairId);
    const cached = this.depthCache.get(pair.id);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const url = `https://indodax.com/api/depth/${pair.id}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'SPILLA-GOLD-QUANT/1.0' },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        throw new Error(`INDODAX Depth HTTP error: ${res.status}`);
      }

      const json: any = await res.json();
      const rawBids: [number, number][] = json?.buy || [];
      const rawAsks: [number, number][] = json?.sell || [];

      let cumulativeBidIdr = 0;
      let cumulativeBidAmount = 0;
      const bids: IndodaxDepthOrder[] = rawBids.slice(0, 30).map(([p, a]) => {
        const price = Number(p);
        const amount = Number(a);
        const totalIdr = price * amount;
        cumulativeBidIdr += totalIdr;
        cumulativeBidAmount += amount;
        return {
          price,
          amount,
          totalIdr,
          cumulativeIdr: cumulativeBidIdr,
          cumulativeAmount: cumulativeBidAmount,
        };
      });

      let cumulativeAskIdr = 0;
      let cumulativeAskAmount = 0;
      const asks: IndodaxDepthOrder[] = rawAsks.slice(0, 30).map(([p, a]) => {
        const price = Number(p);
        const amount = Number(a);
        const totalIdr = price * amount;
        cumulativeAskIdr += totalIdr;
        cumulativeAskAmount += amount;
        return {
          price,
          amount,
          totalIdr,
          cumulativeIdr: cumulativeAskIdr,
          cumulativeAmount: cumulativeAskAmount,
        };
      });

      const totalBidDepthIdr = cumulativeBidIdr;
      const totalAskDepthIdr = cumulativeAskIdr;
      const totalDepth = totalBidDepthIdr + totalAskDepthIdr;

      const buyPressureRatio = totalDepth > 0 ? (totalBidDepthIdr / totalDepth) * 100 : 50;
      const sellPressureRatio = totalDepth > 0 ? (totalAskDepthIdr / totalDepth) * 100 : 50;
      const orderBookImbalancePercent = buyPressureRatio - sellPressureRatio;

      let liquidityConcentration: 'HIGH' | 'MODERATE' | 'LOW' | 'THIN' = 'MODERATE';
      if (totalDepth > 10_000_000_000) {
        liquidityConcentration = 'HIGH';
      } else if (totalDepth > 1_000_000_000) {
        liquidityConcentration = 'MODERATE';
      } else if (totalDepth > 100_000_000) {
        liquidityConcentration = 'LOW';
      } else {
        liquidityConcentration = 'THIN';
      }

      const depthData: IndodaxDepthData = {
        pairId: pair.id,
        symbol: pair.symbol,
        bids,
        asks,
        totalBidDepthIdr,
        totalAskDepthIdr,
        orderBookImbalancePercent: Number(orderBookImbalancePercent.toFixed(2)),
        buyPressureRatio: Number(buyPressureRatio.toFixed(1)),
        sellPressureRatio: Number(sellPressureRatio.toFixed(1)),
        liquidityConcentration,
        updatedAt: new Date().toISOString(),
      };

      this.depthCache.set(pair.id, { data: depthData, timestamp: Date.now() });
      return depthData;
    } catch (err: any) {
      console.warn(`[INDODAX Market Data] Depth fetch error for ${pair.id}:`, err.message);
      if (cached) return cached.data;
      return null;
    }
  }

  /**
   * Fetches real live recent Trades from INDODAX public API
   */
  public async getTrades(pairId: string): Promise<IndodaxTradeData[]> {
    const pair = this.resolvePair(pairId);
    const cached = this.tradesCache.get(pair.id);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const url = `https://indodax.com/api/trades/${pair.id}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'SPILLA-GOLD-QUANT/1.0' },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        throw new Error(`INDODAX Trades HTTP error: ${res.status}`);
      }

      const rawList: any[] = await res.json();
      if (!Array.isArray(rawList)) return [];

      const trades: IndodaxTradeData[] = rawList.slice(0, 50).map((t) => {
        const dateNum = Number(t.date) * 1000;
        const d = new Date(dateNum > 0 ? dateNum : Date.now());
        const price = Number(t.price);
        const amount = Number(t.amount);
        return {
          tid: String(t.tid || Math.random()),
          date: Number(t.date),
          timeFormatted: d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          price,
          amount,
          totalIdr: price * amount,
          type: t.type === 'buy' ? 'buy' : 'sell',
        };
      });

      this.tradesCache.set(pair.id, { data: trades, timestamp: Date.now() });
      return trades;
    } catch (err: any) {
      console.warn(`[INDODAX Market Data] Trades fetch error for ${pair.id}:`, err.message);
      return cached?.data || [];
    }
  }

  /**
   * Fetches real historical candlestick / kline data from INDODAX
   */
  public async getKlines(
    pairId: string,
    timeframe: string = '15m',
    limit: number = 100
  ): Promise<IndodaxCandle[]> {
    const pair = this.resolvePair(pairId);
    const cacheKey = `${pair.id}_${timeframe}_${limit}`;
    const cached = this.klinesCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 10000) {
      return cached.data;
    }

    try {
      // Map timeframe to TradingView resolution
      let resolution = '15';
      let timeframeSeconds = 15 * 60;
      if (timeframe === '1m') {
        resolution = '1';
        timeframeSeconds = 60;
      } else if (timeframe === '5m') {
        resolution = '5';
        timeframeSeconds = 5 * 60;
      } else if (timeframe === '15m') {
        resolution = '15';
        timeframeSeconds = 15 * 60;
      } else if (timeframe === '1h') {
        resolution = '60';
        timeframeSeconds = 60 * 60;
      } else if (timeframe === '4h') {
        resolution = '240';
        timeframeSeconds = 4 * 60 * 60;
      } else if (timeframe === '1d') {
        resolution = 'D';
        timeframeSeconds = 24 * 60 * 60;
      }

      const to = Math.floor(Date.now() / 1000);
      const from = to - limit * timeframeSeconds;

      const tvSymbol = pair.symbol.replace('/', '');
      const url = `https://indodax.com/tradingview/history?symbol=${tvSymbol}&resolution=${resolution}&from=${from}&to=${to}`;

      const res = await fetch(url, {
        headers: { 'User-Agent': 'SPILLA-GOLD-QUANT/1.0' },
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const json: any = await res.json();
        if (json && json.s === 'ok' && Array.isArray(json.t) && json.t.length > 0) {
          const candles: IndodaxCandle[] = [];
          for (let i = 0; i < json.t.length; i++) {
            candles.push({
              time: Number(json.t[i]),
              open: Number(json.o[i]),
              high: Number(json.h[i]),
              low: Number(json.l[i]),
              close: Number(json.c[i]),
              volume: Number(json.v[i]),
            });
          }
          if (candles.length > 0) {
            this.klinesCache.set(cacheKey, { data: candles, timestamp: Date.now() });
            return candles;
          }
        }
      }

      // If TradingView endpoint fails, reconstruct recent candles from recent trades and ticker
      const trades = await this.getTrades(pair.id);
      const ticker = await this.getTicker(pair.id);

      if (ticker && trades.length > 0) {
        const candles = this.synthesizeRecentCandlesFromTrades(trades, ticker, timeframeSeconds, limit);
        if (candles.length > 0) {
          this.klinesCache.set(cacheKey, { data: candles, timestamp: Date.now() });
          return candles;
        }
      }

      return cached?.data || [];
    } catch (err: any) {
      console.warn(`[INDODAX Market Data] Klines fetch error for ${pair.id}:`, err.message);
      return cached?.data || [];
    }
  }

  private synthesizeRecentCandlesFromTrades(
    trades: IndodaxTradeData[],
    ticker: IndodaxTickerData,
    tfSeconds: number,
    limit: number
  ): IndodaxCandle[] {
    if (trades.length === 0) return [];

    const nowSec = Math.floor(Date.now() / 1000);
    const buckets: Map<number, { prices: number[]; vol: number }> = new Map();

    for (let i = limit; i >= 0; i--) {
      const bucketTime = Math.floor((nowSec - i * tfSeconds) / tfSeconds) * tfSeconds;
      buckets.set(bucketTime, { prices: [], vol: 0 });
    }

    trades.forEach((t) => {
      const bTime = Math.floor(t.date / tfSeconds) * tfSeconds;
      const b = buckets.get(bTime);
      if (b) {
        b.prices.push(t.price);
        b.vol += t.amount;
      }
    });

    let prevClose = ticker.lastPrice;
    const candles: IndodaxCandle[] = [];

    Array.from(buckets.keys())
      .sort((a, b) => a - b)
      .forEach((time) => {
        const b = buckets.get(time)!;
        if (b.prices.length > 0) {
          const open = b.prices[0];
          const close = b.prices[b.prices.length - 1];
          const high = Math.max(...b.prices);
          const low = Math.min(...b.prices);
          prevClose = close;
          candles.push({ time, open, high, low, close, volume: b.vol });
        } else {
          candles.push({
            time,
            open: prevClose,
            high: prevClose,
            low: prevClose,
            close: prevClose,
            volume: 0,
          });
        }
      });

    return candles;
  }
}

export const indodaxMarketDataService = new IndodaxMarketDataService();
