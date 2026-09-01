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
   * Aggregates official 1-minute INDODAX candles into 5-minute candles
   * aligned to real 5-minute clock boundaries (e.g., 10:00-10:04 -> 10:00, 10:05-10:09 -> 10:05).
   * Strictly uses only official INDODAX 1m candle data without mock or synthetic interpolation.
   */
  public aggregate1mTo5mCandles(oneMinCandles: IndodaxCandle[], limit: number = 100): IndodaxCandle[] {
    if (!oneMinCandles || oneMinCandles.length === 0) return [];

    // Group 1m candles by 5-minute (300 seconds) boundary
    const buckets = new Map<number, IndodaxCandle[]>();

    for (const c of oneMinCandles) {
      const rawTime = typeof c.time === 'number' ? c.time : parseInt(String(c.time), 10);
      const timeSec = rawTime > 1e11 ? Math.floor(rawTime / 1000) : rawTime;
      if (isNaN(timeSec) || timeSec <= 0) continue;

      // 5-minute alignment: e.g. 10:00:00 - 10:04:59 -> 10:00:00 bucket
      const bucketTime = Math.floor(timeSec / 300) * 300;

      const group = buckets.get(bucketTime) || [];
      group.push({
        time: timeSec,
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: Number(c.volume || 0),
      });
      buckets.set(bucketTime, group);
    }

    const aggregated: IndodaxCandle[] = [];
    const sortedBucketTimes = Array.from(buckets.keys()).sort((a, b) => a - b);

    for (const bTime of sortedBucketTimes) {
      const group = buckets.get(bTime)!;
      if (group.length === 0) continue;

      // Sort chronological within the bucket
      group.sort((a, b) => a.time - b.time);

      const open = group[0].open;
      const high = Math.max(...group.map((c) => c.high));
      const low = Math.min(...group.map((c) => c.low));
      const close = group[group.length - 1].close;
      const volume = group.reduce((sum, c) => sum + (c.volume || 0), 0);

      aggregated.push({
        time: bTime,
        open,
        high,
        low,
        close,
        volume: Number(volume.toFixed(4)),
      });
    }

    // Return the most recent 'limit' 5m candles
    return aggregated.slice(-limit);
  }

  /**
   * Parses official INDODAX TradingView history_v2 response objects into IndodaxCandle array.
   * Handles { Time, Open, High, Low, Close, Volume } format and normalizes timestamps to UNIX seconds.
   */
  private parseHistoryV2Response(json: any): IndodaxCandle[] {
    if (!json) return [];
    let items: any[] = [];

    if (Array.isArray(json)) {
      items = json;
    } else if (json && Array.isArray(json.data)) {
      items = json.data;
    } else if (json && Array.isArray(json.candles)) {
      items = json.candles;
    } else if (json && Array.isArray(json.history)) {
      items = json.history;
    } else if (json && typeof json === 'object') {
      const values = Object.values(json);
      if (values.length > 0 && typeof values[0] === 'object' && values[0] !== null && ('Time' in values[0] || 'time' in values[0])) {
        items = values as any[];
      }
    }

    const candles: IndodaxCandle[] = [];
    const seenTimes = new Set<number>();

    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const rawTime = item.Time ?? item.time ?? item.t;
      if (rawTime === undefined || rawTime === null) continue;

      const timeNum = Number(rawTime);
      const timeSec = timeNum > 1e11 ? Math.floor(timeNum / 1000) : timeNum;
      if (isNaN(timeSec) || timeSec <= 0 || seenTimes.has(timeSec)) continue;

      const open = Number(item.Open ?? item.open ?? item.o ?? 0);
      const high = Number(item.High ?? item.high ?? item.h ?? 0);
      const low = Number(item.Low ?? item.low ?? item.l ?? 0);
      const close = Number(item.Close ?? item.close ?? item.c ?? 0);
      const volume = Number(item.Volume ?? item.volume ?? item.v ?? 0);

      seenTimes.add(timeSec);
      candles.push({
        time: timeSec,
        open,
        high,
        low,
        close,
        volume: isNaN(volume) ? 0 : volume,
      });
    }

    // Sort ascending by time
    candles.sort((a, b) => a.time - b.time);
    return candles;
  }

  /**
   * Fetches real historical candlestick / kline data from official INDODAX history_v2 endpoint.
   * Format: https://indodax.com/tradingview/history_v2?from=...&symbol=...&tf=...&to=...
   * For native timeframes (1m -> tf=1, 15m -> tf=15, 30m -> tf=30, 1h -> tf=60, 4h -> tf=240, 1d -> tf=1D).
   * For 5m: Requests official 1m candles (tf=1) and aggregates into 5-minute boundary candles.
   * NEVER generates synthetic, mock, or random candles.
   */
  public async getKlines(
    pairId: string,
    timeframe: string = '15m',
    limit: number = 100
  ): Promise<IndodaxCandle[]> {
    const pair = this.resolvePair(pairId);
    const normalizedTf = timeframe.toLowerCase();
    const cacheKey = `${pair.id}_${normalizedTf}_${limit}`;
    const cached = this.klinesCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 10000) {
      return cached.data;
    }

    const tvSymbol = pair.symbol.replace('/', '').toUpperCase();
    const to = Math.floor(Date.now() / 1000);

    try {
      // 1. If 5m is requested: Fetch official INDODAX 1m candles using history_v2 (tf=1) and aggregate
      if (normalizedTf === '5m') {
        const oneMinLimit = Math.max(limit * 5 + 60, 300);
        const from = to - oneMinLimit * 60;
        const url = `https://indodax.com/tradingview/history_v2?from=${from}&symbol=${tvSymbol}&tf=1&to=${to}`;

        const res = await fetch(url, {
          headers: { 'User-Agent': 'SPILLA-GOLD-QUANT/1.0' },
          signal: AbortSignal.timeout(6000),
        });

        if (!res.ok) {
          console.warn(`[INDODAX Market Data] history_v2 5m (tf=1) HTTP error ${res.status} for ${pair.id} (${url})`);
          return cached?.data || [];
        }

        const json: any = await res.json();
        const raw1mCandles = this.parseHistoryV2Response(json);

        if (raw1mCandles.length > 0) {
          const aggregated5m = this.aggregate1mTo5mCandles(raw1mCandles, limit);
          if (aggregated5m.length > 0) {
            this.klinesCache.set(cacheKey, { data: aggregated5m, timestamp: Date.now() });
            return aggregated5m;
          }
        }

        console.warn(`[INDODAX Market Data] history_v2 5m (tf=1) returned no 1m candles for ${pair.id}`);
        return cached?.data || [];
      }

      // 2. For native supported INDODAX history_v2 timeframes
      let tfParam = '15';
      let timeframeSeconds = 15 * 60;

      if (normalizedTf === '1m') {
        tfParam = '1';
        timeframeSeconds = 60;
      } else if (normalizedTf === '15m') {
        tfParam = '15';
        timeframeSeconds = 15 * 60;
      } else if (normalizedTf === '30m') {
        tfParam = '30';
        timeframeSeconds = 30 * 60;
      } else if (normalizedTf === '1h' || normalizedTf === '60m') {
        tfParam = '60';
        timeframeSeconds = 60 * 60;
      } else if (normalizedTf === '4h' || normalizedTf === '240m') {
        tfParam = '240';
        timeframeSeconds = 4 * 60 * 60;
      } else if (normalizedTf === '1d' || normalizedTf === 'd') {
        tfParam = '1D';
        timeframeSeconds = 24 * 60 * 60;
      } else {
        tfParam = '15';
        timeframeSeconds = 15 * 60;
      }

      // Buffer time calculation
      const from = to - Math.max(limit * timeframeSeconds * 2, timeframeSeconds * 30);
      const url = `https://indodax.com/tradingview/history_v2?from=${from}&symbol=${tvSymbol}&tf=${tfParam}&to=${to}`;

      const res = await fetch(url, {
        headers: { 'User-Agent': 'SPILLA-GOLD-QUANT/1.0' },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        console.warn(`[INDODAX Market Data] history_v2 HTTP error ${res.status} for ${pair.id} (tf=${tfParam}, url=${url})`);
        return cached?.data || [];
      }

      const json: any = await res.json();
      const candles = this.parseHistoryV2Response(json);

      if (candles.length > 0) {
        const sliced = candles.slice(-limit);
        this.klinesCache.set(cacheKey, { data: sliced, timestamp: Date.now() });
        return sliced;
      }

      console.warn(`[INDODAX Market Data] history_v2 returned no candles for ${pair.id} (tf=${tfParam})`);
      return cached?.data || [];
    } catch (err: any) {
      console.warn(`[INDODAX Market Data] history_v2 fetch error for ${pair.id} (${timeframe}):`, err.message);
      return cached?.data || [];
    }
  }
}

export const indodaxMarketDataService = new IndodaxMarketDataService();
