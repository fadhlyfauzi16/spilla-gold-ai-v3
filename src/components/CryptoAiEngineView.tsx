import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  Sliders,
  Shield,
  Layers,
  Sparkles,
  ChevronDown,
  Clock,
  Zap,
  Gauge,
} from 'lucide-react';
import {
  IndodaxMarketPair,
  IndodaxTickerData,
  IndodaxDepthData,
  IndodaxUserAccountInfo,
  CryptoAiRecommendation,
  CryptoTechnicalIndicators,
  CryptoOpenOrder,
  CryptoOrderHistoryItem,
} from '../types/crypto';
import { IndodaxAccountCard } from './crypto/IndodaxAccountCard';
import { CryptoOrderBookDepth } from './crypto/CryptoOrderBookDepth';
import { CryptoSlippageCalculator } from './crypto/CryptoSlippageCalculator';
import { CryptoAiRecommendationCard } from './crypto/CryptoAiRecommendationCard';
import { CryptoOrderExecutionPanel } from './crypto/CryptoOrderExecutionPanel';
import { CryptoOrdersTable } from './crypto/CryptoOrdersTable';
import { ConnectIndodaxModal } from './crypto/ConnectIndodaxModal';

interface CryptoAiEngineViewProps {
  authToken?: string | null;
}

export const CryptoAiEngineView: React.FC<CryptoAiEngineViewProps> = ({ authToken }) => {
  const [pairs, setPairs] = useState<IndodaxMarketPair[]>([]);
  const [selectedPair, setSelectedPair] = useState<IndodaxMarketPair>({
    id: 'castidr',
    symbol: 'CAST/IDR',
    baseCurrency: 'cast',
    quoteCurrency: 'idr',
    displayName: 'Castello Coin (CAST/IDR)',
    priceScale: 0,
    minPrice: 1,
    minAmount: 0.0001,
    minTotalIdr: 10000,
    isPopular: true,
  });

  const [timeframe, setTimeframe] = useState<string>('15m');
  const [ticker, setTicker] = useState<IndodaxTickerData | null>(null);
  const [depth, setDepth] = useState<IndodaxDepthData | null>(null);
  const [technicals, setTechnicals] = useState<CryptoTechnicalIndicators | null>(null);
  const [recommendation, setRecommendation] = useState<CryptoAiRecommendation | null>(null);
  const [account, setAccount] = useState<IndodaxUserAccountInfo | null>(null);
  const [openOrders, setOpenOrders] = useState<CryptoOpenOrder[]>([]);
  const [orderHistory, setOrderHistory] = useState<CryptoOrderHistoryItem[]>([]);

  const [isLoadingMarket, setIsLoadingMarket] = useState(false);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isAccountLoading, setIsAccountLoading] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [customExecutionPrice, setCustomExecutionPrice] = useState<number | undefined>(undefined);

  const isMountedRef = useRef(true);

  // Fetch supported markets list on mount
  useEffect(() => {
    isMountedRef.current = true;
    const fetchMarkets = async () => {
      try {
        const res = await fetch('/api/crypto/markets');
        const data = await res.json();
        if (data.success && data.markets?.length > 0) {
          setPairs(data.markets);
          // Default to CAST/IDR if present
          const cast = data.markets.find((m: IndodaxMarketPair) => m.id === 'castidr');
          if (cast) setSelectedPair(cast);
        }
      } catch (err) {
        console.error('Failed to fetch crypto markets:', err);
      }
    };
    fetchMarkets();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch account status & orders
  const fetchAccountData = useCallback(async () => {
    setIsAccountLoading(true);
    try {
      const [accRes, ordersRes, histRes] = await Promise.all([
        fetch('/api/crypto/account/status', {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        }),
        fetch(`/api/crypto/orders/open?pair=${selectedPair.id}`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        }),
        fetch(`/api/crypto/orders/history?pair=${selectedPair.id}`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        }),
      ]);

      const [accData, ordersData, histData] = await Promise.all([
        accRes.json(),
        ordersRes.json(),
        histRes.json(),
      ]);

      if (accData.success) setAccount(accData.account);
      if (ordersData.success) setOpenOrders(ordersData.orders || []);
      if (histData.success) setOrderHistory(histData.history || []);
    } catch (err) {
      console.error('Failed to fetch account info:', err);
    } finally {
      setIsAccountLoading(false);
    }
  }, [authToken, selectedPair.id]);

  // Fetch real market data (Ticker + Depth + Technicals)
  const fetchMarketData = useCallback(async () => {
    try {
      const [tickerRes, depthRes, analysisRes] = await Promise.all([
        fetch(`/api/crypto/ticker/${selectedPair.id}`),
        fetch(`/api/crypto/depth/${selectedPair.id}`),
        fetch(`/api/crypto/analysis/${selectedPair.id}?timeframe=${timeframe}`),
      ]);

      const [tickerData, depthData, analysisData] = await Promise.all([
        tickerRes.json(),
        depthRes.json(),
        analysisRes.json(),
      ]);

      if (tickerData.success) setTicker(tickerData.ticker);
      if (depthData.success) setDepth(depthData.depth);
      if (analysisData.success) setTechnicals(analysisData.technicals);
    } catch (err) {
      console.error('Failed to fetch market data:', err);
    }
  }, [selectedPair.id, timeframe]);

  // Fetch or trigger Gemini AI recommendation
  const fetchAiRecommendation = useCallback(async () => {
    setIsLoadingAi(true);
    try {
      const res = await fetch('/api/crypto/ai-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pair: selectedPair.id, timeframe }),
      });
      const data = await res.json();
      if (data.success && data.recommendation) {
        setRecommendation(data.recommendation);
      }
    } catch (err) {
      console.error('Failed to fetch AI recommendation:', err);
    } finally {
      setIsLoadingAi(false);
    }
  }, [selectedPair.id, timeframe]);

  // Initial load when pair or timeframe changes
  useEffect(() => {
    fetchMarketData();
    fetchAccountData();
    fetchAiRecommendation();

    // Fast polling for market ticker/depth (every 4 seconds)
    const interval = setInterval(() => {
      fetchMarketData();
    }, 4000);

    return () => clearInterval(interval);
  }, [fetchMarketData, fetchAccountData, fetchAiRecommendation]);

  // Disconnect handler
  const handleDisconnect = async () => {
    try {
      await fetch('/api/crypto/account/disconnect', {
        method: 'POST',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      fetchAccountData();
    } catch (err) {
      console.error('Error disconnecting:', err);
    }
  };

  // Cancel order handler
  const handleCancelOrder = async (orderId: string, type: 'BUY' | 'SELL') => {
    try {
      const res = await fetch('/api/crypto/orders/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          pairId: selectedPair.id,
          orderId,
          type,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchAccountData();
      }
    } catch (err) {
      console.error('Failed to cancel order:', err);
    }
  };

  // Autofill recommendation parameters to order panel
  const handleApplyAiRecommendation = (rec: CryptoAiRecommendation) => {
    if (rec.plannedEntry) {
      setCustomExecutionPrice(rec.plannedEntry);
    }
  };

  const isUp = (ticker?.change24hPercent || 0) >= 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar: Title, Pair Switcher, Live Ticker Stats */}
      <div className="bg-[#121620] border border-[#232B3E] rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E5B842] to-[#b38a22] flex items-center justify-center text-black shadow-lg shadow-[#E5B842]/20">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-black text-white uppercase tracking-wider">
                  CRYPTO AI ENGINE
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E5B842]/10 text-[#E5B842] border border-[#E5B842]/30">
                  INDODAX DIRECT
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Institutional Spot Execution, Order Flow & Deep Slippage Analysis
              </p>
            </div>
          </div>

          {/* Pair Switcher & Timeframe Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Markets Dropdown / Selector */}
            <div className="relative">
              <select
                value={selectedPair.id}
                onChange={(e) => {
                  const p = pairs.find((x) => x.id === e.target.value);
                  if (p) setSelectedPair(p);
                }}
                className="bg-[#0B0E14] border border-[#232B3E] rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#E5B842] cursor-pointer appearance-none pr-8"
              >
                {pairs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.symbol} {p.id === 'castidr' ? '★ SPOTLIGHT' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Timeframe Chips */}
            <div className="flex items-center space-x-1 p-1 bg-[#0B0E14] border border-[#1F2633] rounded-xl">
              {['1m', '5m', '15m', '1h', '4h', '1d'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    timeframe === tf
                      ? 'bg-[#E5B842] text-black shadow-md shadow-[#E5B842]/20'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Manual Refresh */}
            <button
              onClick={() => {
                fetchMarketData();
                fetchAccountData();
              }}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1C2230] border border-[#232B3E] transition-colors"
              title="Refresh All"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Real Ticker Bar Metrics */}
        {ticker && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-[#1F2633]">
            {/* Last Price */}
            <div className="p-2.5 rounded-xl bg-[#0B0E14] border border-[#1F2633]">
              <div className="text-[10px] text-gray-500 uppercase font-semibold">Live Spot Price</div>
              <div className="text-sm font-black font-mono text-white mt-0.5">
                Rp {ticker.lastPrice.toLocaleString('id-ID')}
              </div>
            </div>

            {/* 24h Change */}
            <div className="p-2.5 rounded-xl bg-[#0B0E14] border border-[#1F2633]">
              <div className="text-[10px] text-gray-500 uppercase font-semibold">24h Change</div>
              <div
                className={`text-sm font-black font-mono mt-0.5 flex items-center space-x-1 ${
                  isUp ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>
                  {isUp ? '+' : ''}
                  {ticker.change24hPercent.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* 24h High */}
            <div className="p-2.5 rounded-xl bg-[#0B0E14] border border-[#1F2633]">
              <div className="text-[10px] text-gray-500 uppercase font-semibold">24h High</div>
              <div className="text-sm font-bold font-mono text-gray-300 mt-0.5">
                Rp {ticker.high24h.toLocaleString('id-ID')}
              </div>
            </div>

            {/* 24h Low */}
            <div className="p-2.5 rounded-xl bg-[#0B0E14] border border-[#1F2633]">
              <div className="text-[10px] text-gray-500 uppercase font-semibold">24h Low</div>
              <div className="text-sm font-bold font-mono text-gray-300 mt-0.5">
                Rp {ticker.low24h.toLocaleString('id-ID')}
              </div>
            </div>

            {/* 24h Volume (IDR) */}
            <div className="p-2.5 rounded-xl bg-[#0B0E14] border border-[#1F2633] col-span-2 sm:col-span-1">
              <div className="text-[10px] text-gray-500 uppercase font-semibold">24h Volume (IDR)</div>
              <div className="text-sm font-bold font-mono text-[#E5B842] mt-0.5">
                Rp {(ticker.volumeIdr / 1_000_000_000).toFixed(2)}B
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Account Balance & Gateway Card */}
      <IndodaxAccountCard
        account={account}
        selectedPair={selectedPair}
        isLoading={isAccountLoading}
        onRefresh={fetchAccountData}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        onDisconnect={handleDisconnect}
      />

      {/* Main Grid: Quantitative & Order Flow Analysis vs Execution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Quantitative Indicators, Order Book Depth, Slippage Simulator */}
        <div className="lg:col-span-7 space-y-6">
          {/* Quantitative Technicals Strip */}
          {technicals && (
            <div className="bg-[#121620] border border-[#232B3E] rounded-2xl p-4 shadow-lg space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 text-[#E5B842] font-bold uppercase tracking-wider">
                  <Gauge className="w-4 h-4" />
                  <span>Technical Structure ({timeframe})</span>
                </div>
                <span className="text-[11px] font-mono text-gray-400">
                  Trend: <strong className="text-white">{technicals.trend}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
                <div className="p-2 rounded-xl bg-[#0B0E14] border border-[#1F2633]">
                  <div className="text-[10px] text-gray-500 uppercase">RSI (14)</div>
                  <div
                    className={`text-xs font-bold font-mono mt-0.5 ${
                      technicals.rsi14 > 70
                        ? 'text-rose-400'
                        : technicals.rsi14 < 30
                        ? 'text-emerald-400'
                        : 'text-white'
                    }`}
                  >
                    {technicals.rsi14.toFixed(1)}
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-[#0B0E14] border border-[#1F2633]">
                  <div className="text-[10px] text-gray-500 uppercase">EMA 20 / 50</div>
                  <div className="text-xs font-bold font-mono text-gray-300 mt-0.5">
                    {technicals.ema20.toLocaleString('id-ID')} / {technicals.ema50.toLocaleString('id-ID')}
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-[#0B0E14] border border-[#1F2633]">
                  <div className="text-[10px] text-gray-500 uppercase">MACD Hist</div>
                  <div
                    className={`text-xs font-bold font-mono mt-0.5 ${
                      technicals.macd.histogram >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {technicals.macd.histogram.toFixed(2)}
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-[#0B0E14] border border-[#1F2633]">
                  <div className="text-[10px] text-gray-500 uppercase">ATR Volatility</div>
                  <div className="text-xs font-bold font-mono text-gray-300 mt-0.5">
                    ±Rp {technicals.atr14.toFixed(0)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live Depth & Order Flow */}
          <CryptoOrderBookDepth
            depth={depth}
            pair={selectedPair}
            onSelectPrice={(p) => setCustomExecutionPrice(p)}
          />

          {/* Slippage & VWAP Simulator */}
          <CryptoSlippageCalculator
            depth={depth}
            pair={selectedPair}
            currentPrice={ticker?.lastPrice || 0}
          />
        </div>

        {/* Right Column: AI Intelligence & Direct Execution Panel */}
        <div className="lg:col-span-5 space-y-6">
          {/* Gemini AI Recommendation */}
          <CryptoAiRecommendationCard
            recommendation={recommendation}
            technicals={technicals}
            pair={selectedPair}
            isLoading={isLoadingAi}
            onRefreshAi={fetchAiRecommendation}
            onApplyToOrder={handleApplyAiRecommendation}
          />

          {/* Order Execution Panel */}
          <CryptoOrderExecutionPanel
            pair={selectedPair}
            account={account}
            depth={depth}
            currentPrice={ticker?.lastPrice || 0}
            authToken={authToken}
            onOrderExecuted={() => {
              fetchAccountData();
            }}
            onOpenConnectModal={() => setIsConnectModalOpen(true)}
            initialPrice={customExecutionPrice}
          />
        </div>
      </div>

      {/* Orders Table: Active Limit Orders & Execution Log History */}
      <CryptoOrdersTable
        openOrders={openOrders}
        orderHistory={orderHistory}
        pair={selectedPair}
        isLoading={isAccountLoading}
        onRefresh={fetchAccountData}
        onCancelOrder={handleCancelOrder}
      />

      {/* Connect Account Modal */}
      <ConnectIndodaxModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onSuccess={() => fetchAccountData()}
        authToken={authToken}
      />
    </div>
  );
};
