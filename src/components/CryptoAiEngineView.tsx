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
  Cpu,
  Target,
  Edit2,
  Check,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Bot,
  Scale,
  DollarSign,
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
import { IndodaxCandlestickChart } from './crypto/IndodaxCandlestickChart';

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
  const [orderStyle, setOrderStyle] = useState<'SPOT_LIMIT' | 'SPOT_MARKET'>('SPOT_LIMIT');
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

  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [tempPriceInput, setTempPriceInput] = useState<string>('');
  const [lastAnalysisTimestamp, setLastAnalysisTimestamp] = useState<string | null>(null);

  const executionPanelRef = useRef<HTMLDivElement>(null);
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

      if (tickerData.success) {
        setTicker(tickerData.ticker);
        if (!customExecutionPrice && tickerData.ticker.lastPrice > 0) {
          setCustomExecutionPrice(tickerData.ticker.lastPrice);
        }
      }
      if (depthData.success) setDepth(depthData.depth);
      if (analysisData.success) setTechnicals(analysisData.technicals);
    } catch (err) {
      console.error('Failed to fetch market data:', err);
    }
  }, [selectedPair.id, timeframe, customExecutionPrice]);

  // Trigger Gemini AI Recommendation (Single-Pass Order Flow & Slippage Confluence)
  const handleTriggerAiAnalysis = useCallback(async () => {
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
        setLastAnalysisTimestamp(
          new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
        if (data.recommendation.plannedEntry) {
          setCustomExecutionPrice(data.recommendation.plannedEntry);
        }
      }
    } catch (err) {
      console.error('Failed to fetch AI recommendation:', err);
    } finally {
      setIsLoadingAi(false);
    }
  }, [selectedPair.id, timeframe]);

  // Initial load & 4s polling
  useEffect(() => {
    fetchMarketData();
    fetchAccountData();
    handleTriggerAiAnalysis();

    const interval = setInterval(() => {
      fetchMarketData();
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedPair.id, timeframe]);

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

  // Autofill recommendation parameters to order panel & scroll
  const handleApplyAiRecommendation = (rec: CryptoAiRecommendation) => {
    if (rec.plannedEntry) {
      setCustomExecutionPrice(rec.plannedEntry);
    }
    if (executionPanelRef.current) {
      executionPanelRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const isUp = (ticker?.change24hPercent || 0) >= 0;
  const canonicalPrice = customExecutionPrice || ticker?.lastPrice || 0;

  return (
    <div className="space-y-6 pb-12 font-mono">
      {/* 1. Account Status & Telemetry Widget */}
      <IndodaxAccountCard
        account={account}
        selectedPair={selectedPair}
        isLoading={isAccountLoading}
        onRefresh={fetchAccountData}
        onOpenConnectModal={() => setIsConnectModalOpen(true)}
        onDisconnect={handleDisconnect}
      />

      {/* 2. Top Banner & Copilot Controller Bar (Exact Match to LiveAnalysisView) */}
      <div className="bg-[#121620] border border-gray-800 rounded-xl p-5 shadow-xl space-y-4">
        {/* Title and Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-[#E5B842] animate-pulse" />
              <h1 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                CRYPTO AI COPILOT
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#E5B842]/20 text-[#E5B842] border border-[#E5B842]/40">
                INDODAX HARDENED SPOT ENGINE
              </span>
            </div>
            <p className="text-xs text-gray-400 font-sans mt-0.5">
              AI proposes • Order Book validates • Slippage calculates • User confirms • INDODAX executes
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-gray-400 font-bold uppercase">MODE:</span>
            <span className="text-[10px] px-2 py-0.5 rounded font-black bg-blue-500/20 text-blue-400 border border-blue-500/40 uppercase">
              SPOT DIRECT GATEWAY
            </span>
          </div>
        </div>

        {/* Controller Bar: PAIR -> ORDER STYLE -> TIMEFRAME -> GARIS HARGA TERAKHIR (RP) */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-800">
          {/* 1. PAIR SELECTOR */}
          <div className="flex items-center space-x-2 bg-[#0B0E14] px-3 py-1.5 rounded-lg border border-gray-800 text-xs">
            <span className="text-gray-500 uppercase font-bold text-[10px]">PAIR:</span>
            <select
              value={selectedPair.id}
              onChange={(e) => {
                const p = pairs.find((x) => x.id === e.target.value);
                if (p) {
                  setSelectedPair(p);
                  setCustomExecutionPrice(undefined);
                }
              }}
              className="bg-transparent text-[#E5B842] font-black focus:outline-none cursor-pointer uppercase text-xs"
            >
              {pairs.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#121620] text-white">
                  {p.symbol} {p.id === 'castidr' ? '★ SPOTLIGHT' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 2. ORDER TYPE / TRADING STYLE */}
          <div className="flex items-center space-x-1 bg-[#0B0E14] p-1 rounded-lg border border-gray-800 text-xs">
            <button
              onClick={() => setOrderStyle('SPOT_LIMIT')}
              className={`px-3 py-1 rounded text-[10px] font-black uppercase transition-all cursor-pointer ${
                orderStyle === 'SPOT_LIMIT'
                  ? 'bg-[#E5B842] text-black shadow-md shadow-[#E5B842]/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              SPOT LIMIT
            </button>
            <button
              onClick={() => setOrderStyle('SPOT_MARKET')}
              className={`px-3 py-1 rounded text-[10px] font-black uppercase transition-all cursor-pointer ${
                orderStyle === 'SPOT_MARKET'
                  ? 'bg-[#E5B842] text-black shadow-md shadow-[#E5B842]/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              SPOT MARKET
            </button>
          </div>

          {/* 3. TIMEFRAME */}
          <div className="flex items-center space-x-1 bg-[#0B0E14] p-1 rounded-lg border border-gray-800 text-xs">
            {['1m', '5m', '15m', '1h', '4h', '1d'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded text-[10px] font-black uppercase transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-[#E5B842] text-black shadow-md shadow-[#E5B842]/20'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* 4. GARIS HARGA TERAKHIR (EDITABLE CANONICAL SPOT PRICE RP) */}
          <div className="flex items-center space-x-2 bg-[#0B0E14] px-3 py-1.5 rounded-lg border border-[#E5B842]/50 text-xs shadow-inner group">
            <span className="text-gray-400 uppercase font-bold text-[10px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              GARIS HARGA SPOT:
            </span>
            {isEditingPrice ? (
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-500 font-mono">Rp</span>
                <input
                  type="number"
                  value={tempPriceInput}
                  onChange={(e) => setTempPriceInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = parseFloat(tempPriceInput);
                      if (!isNaN(val) && val > 0) setCustomExecutionPrice(val);
                      setIsEditingPrice(false);
                    }
                  }}
                  autoFocus
                  className="w-28 bg-[#121620] text-emerald-400 font-mono font-black px-1.5 py-0.5 rounded border border-emerald-500/50 text-xs focus:outline-none"
                />
                <button
                  onClick={() => {
                    const val = parseFloat(tempPriceInput);
                    if (!isNaN(val) && val > 0) setCustomExecutionPrice(val);
                    setIsEditingPrice(false);
                  }}
                  className="p-1 text-emerald-400 hover:text-white cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-emerald-400 font-mono font-black text-xs sm:text-sm tracking-tight">
                  Rp {canonicalPrice > 0 ? canonicalPrice.toLocaleString('id-ID') : '--'}
                </span>
                <button
                  onClick={() => {
                    setTempPriceInput(canonicalPrice ? String(canonicalPrice) : '');
                    setIsEditingPrice(true);
                  }}
                  className="text-gray-400 hover:text-[#E5B842] p-0.5 transition-colors cursor-pointer"
                  title="Sesuaikan manual harga spot / entry target"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Capture Result Summary Strip & 24h Metrics */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-800/80 text-[10px] text-gray-400">
          <div className="flex items-center space-x-2">
            <span className="text-[#E5B842] font-black uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5B842] animate-ping" />
              LIVE TELEMETRY:
            </span>
            <span className="text-white font-black">{selectedPair.symbol}</span>
            <span className="text-gray-600">•</span>
            <span className="text-emerald-400 font-bold">{orderStyle.replace('_', ' ')}</span>
            <span className="text-gray-600">•</span>
            <span className="text-gray-300 font-mono">{timeframe}</span>
          </div>

          {ticker && (
            <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono">
              <div className="flex items-center space-x-1">
                <span className="text-gray-500">24h Chg:</span>
                <span className={`font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isUp ? '+' : ''}
                  {ticker.change24hPercent.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-gray-500">24h High:</span>
                <span className="text-gray-300 font-bold">Rp {ticker.high24h.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-gray-500">24h Low:</span>
                <span className="text-gray-300 font-bold">Rp {ticker.low24h.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-gray-500">24h Vol:</span>
                <span className="text-[#E5B842] font-bold">
                  Rp {(ticker.volumeIdr / 1_000_000_000).toFixed(2)}B
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Main Workspace 2-Column Grid (Exact 12-Column Split matching LiveAnalysisView) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Live Chart & Technical Confluence Matrix (7 Cols) */}
        <div className="lg:col-span-7 xl:col-span-7 flex flex-col space-y-4">
          {/* Real INDODAX Native Candlestick Chart Area */}
          <IndodaxCandlestickChart
            pair={selectedPair}
            timeframe={timeframe}
            currentPrice={customExecutionPrice || ticker?.lastPrice}
            recommendation={recommendation}
            technicals={technicals}
            isLoadingAi={isLoadingAi}
            lastAnalysisTimestamp={lastAnalysisTimestamp}
            onTriggerAiAnalysis={handleTriggerAiAnalysis}
          />

          {/* Multi-Timeframe & Technical Confluence Matrix (Exact Match to LiveAnalysisView) */}
          {technicals && (
            <div className="bg-[#121620] border border-gray-800 rounded-xl p-4 shadow-xl space-y-3 font-mono">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-gray-800">
                <div className="flex items-center space-x-2 text-[#E5B842] font-black uppercase tracking-wider">
                  <Gauge className="w-4 h-4" />
                  <span>MULTI-TIMEFRAME CONFLUENCE & TECHNICAL MATRIX</span>
                </div>
                <span className="text-[10px] text-gray-400 uppercase">
                  TIMEFRAME: <strong className="text-white">{timeframe}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                {/* Direction / Trend */}
                <div className="p-2.5 rounded-lg bg-[#0B0E14] border border-gray-800">
                  <div className="text-[9px] text-gray-500 uppercase font-bold">TREND STRUCTURE</div>
                  <div
                    className={`text-xs font-black mt-0.5 uppercase ${
                      technicals.trend.includes('BULLISH') ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {technicals.trend}
                  </div>
                </div>

                {/* RSI 14 */}
                <div className="p-2.5 rounded-lg bg-[#0B0E14] border border-gray-800">
                  <div className="text-[9px] text-gray-500 uppercase font-bold">MOMENTUM (RSI 14)</div>
                  <div
                    className={`text-xs font-black font-mono mt-0.5 ${
                      technicals.rsi14 > 70
                        ? 'text-rose-400'
                        : technicals.rsi14 < 30
                        ? 'text-emerald-400'
                        : 'text-white'
                    }`}
                  >
                    {technicals.rsi14.toFixed(1)}{' '}
                    <span className="text-[9px] text-gray-500 font-normal">
                      {technicals.rsi14 > 70 ? 'OB' : technicals.rsi14 < 30 ? 'OS' : 'MID'}
                    </span>
                  </div>
                </div>

                {/* EMA 20 / 50 */}
                <div className="p-2.5 rounded-lg bg-[#0B0E14] border border-gray-800">
                  <div className="text-[9px] text-gray-500 uppercase font-bold">EMA 20 / 50 ALIGNMENT</div>
                  <div className="text-xs font-bold font-mono text-gray-300 mt-0.5">
                    {technicals.ema20.toLocaleString('id-ID')} / {technicals.ema50.toLocaleString('id-ID')}
                  </div>
                </div>

                {/* MACD Hist */}
                <div className="p-2.5 rounded-lg bg-[#0B0E14] border border-gray-800">
                  <div className="text-[9px] text-gray-500 uppercase font-bold">MACD HISTOGRAM</div>
                  <div
                    className={`text-xs font-black font-mono mt-0.5 ${
                      technicals.macd.histogram >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {technicals.macd.histogram >= 0 ? '+' : ''}
                    {technicals.macd.histogram.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Support & Resistance Spot Levels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                <div className="p-2 rounded bg-[#0B0E14] border border-emerald-500/30 flex items-center justify-between">
                  <span className="text-[10px] text-emerald-400 uppercase font-bold">KEY SUPPORT LEVEL:</span>
                  <span className="text-xs font-mono font-black text-white">
                    Rp {((technicals.supportLevels && technicals.supportLevels[0]) || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="p-2 rounded bg-[#0B0E14] border border-rose-500/30 flex items-center justify-between">
                  <span className="text-[10px] text-rose-400 uppercase font-bold">KEY RESISTANCE LEVEL:</span>
                  <span className="text-xs font-mono font-black text-white">
                    Rp {((technicals.resistanceLevels && technicals.resistanceLevels[0]) || 0).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: AI Execution Recommendation Panel (5 Cols) */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col space-y-4">
          <CryptoAiRecommendationCard
            recommendation={recommendation}
            technicals={technicals}
            pair={selectedPair}
            isLoading={isLoadingAi}
            onRefreshAi={handleTriggerAiAnalysis}
            onApplyToOrder={handleApplyAiRecommendation}
            currentPrice={canonicalPrice}
          />
        </div>
      </div>

      {/* 4. Secondary Crypto Institutional Suite (Order Flow Depth, Slippage & Execution) */}
      <div className="space-y-6 pt-4 border-t border-gray-800">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-[#E5B842]" />
          <h2 className="text-sm font-black text-white uppercase tracking-wider">
            INSTITUTIONAL ORDER FLOW, DEPTH & SLIPPAGE SUITE
          </h2>
          <span className="text-[9px] px-2 py-0.5 rounded font-black bg-gray-800 text-gray-400 border border-gray-700">
            REAL-TIME INDODAX
          </span>
        </div>

        {/* 2-Column Grid for Depth and Slippage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6">
            <CryptoOrderBookDepth
              depth={depth}
              pair={selectedPair}
              onSelectPrice={(p) => setCustomExecutionPrice(p)}
            />
          </div>
          <div className="lg:col-span-6">
            <CryptoSlippageCalculator
              depth={depth}
              pair={selectedPair}
              currentPrice={canonicalPrice}
            />
          </div>
        </div>

        {/* Direct Spot Execution Router */}
        <div ref={executionPanelRef}>
          <CryptoOrderExecutionPanel
            pair={selectedPair}
            account={account}
            depth={depth}
            currentPrice={canonicalPrice}
            authToken={authToken}
            onOrderExecuted={() => {
              fetchAccountData();
            }}
            onOpenConnectModal={() => setIsConnectModalOpen(true)}
            initialPrice={customExecutionPrice}
          />
        </div>

        {/* Orders Ledger & Active Limit Orders Table */}
        <CryptoOrdersTable
          openOrders={openOrders}
          orderHistory={orderHistory}
          pair={selectedPair}
          isLoading={isAccountLoading}
          onRefresh={fetchAccountData}
          onCancelOrder={handleCancelOrder}
        />
      </div>

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
