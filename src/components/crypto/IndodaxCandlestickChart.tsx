import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  IChartApi,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  CandlestickData,
  HistogramData,
  LineData,
  UTCTimestamp,
  ISeriesApi,
} from 'lightweight-charts';
import {
  Activity,
  RefreshCw,
  Sparkles,
  Bot,
  AlertTriangle,
  BarChart2,
  TrendingUp,
  Sliders,
  Eye,
  EyeOff,
  Maximize2,
} from 'lucide-react';
import {
  IndodaxMarketPair,
  IndodaxCandle,
  CryptoAiRecommendation,
  CryptoTechnicalIndicators,
} from '../../types/crypto';

interface IndodaxCandlestickChartProps {
  pair: IndodaxMarketPair;
  timeframe: string;
  currentPrice?: number;
  recommendation?: CryptoAiRecommendation | null;
  technicals?: CryptoTechnicalIndicators | null;
  isLoadingAi?: boolean;
  lastAnalysisTimestamp?: string | null;
  onTriggerAiAnalysis?: () => void;
}

export const IndodaxCandlestickChart: React.FC<IndodaxCandlestickChartProps> = ({
  pair,
  timeframe,
  currentPrice,
  recommendation,
  technicals,
  isLoadingAi = false,
  lastAnalysisTimestamp,
  onTriggerAiAnalysis,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null>(null);

  const [candles, setCandles] = useState<IndodaxCandle[]>([]);
  const [isLoadingCandles, setIsLoadingCandles] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // User Chart Settings & Toggles
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick');
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [showEma20, setShowEma20] = useState<boolean>(true);
  const [showEma50, setShowEma50] = useState<boolean>(true);
  const [showAiLevels, setShowAiLevels] = useState<boolean>(true);
  const [showSuppRes, setShowSuppRes] = useState<boolean>(true);

  // Fetch real INDODAX Klines from the backend
  const fetchKlines = useCallback(async () => {
    setIsLoadingCandles(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/crypto/klines/${pair.id}?timeframe=${timeframe}&limit=120`);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.candles) && data.candles.length > 0) {
        // Sort ascending and ensure unique timestamps
        const sorted = [...data.candles].sort((a, b) => a.time - b.time);
        const uniqueCandles: IndodaxCandle[] = [];
        const seenTimes = new Set<number>();

        for (const c of sorted) {
          const rawTime = typeof c.time === 'number' ? c.time : parseInt(String(c.time), 10);
          const t = rawTime > 1e11 ? Math.floor(rawTime / 1000) : rawTime;
          if (!isNaN(t) && t > 0 && !seenTimes.has(t)) {
            seenTimes.add(t);
            uniqueCandles.push({
              time: t,
              open: Number(c.open),
              high: Number(c.high),
              low: Number(c.low),
              close: Number(c.close),
              volume: Number(c.volume || 0),
            });
          }
        }

        if (uniqueCandles.length > 0) {
          setCandles(uniqueCandles);
          setErrorMsg(null);
        } else {
          setCandles([]);
          setErrorMsg('INDODAX MARKET DATA UNAVAILABLE');
        }
      } else {
        setCandles([]);
        setErrorMsg('INDODAX MARKET DATA UNAVAILABLE');
      }
    } catch (err: any) {
      console.warn(`[IndodaxCandlestickChart] Error fetching klines for ${pair.id}:`, err);
      setCandles([]);
      setErrorMsg('INDODAX MARKET DATA UNAVAILABLE');
    } finally {
      setIsLoadingCandles(false);
    }
  }, [pair.id, timeframe]);

  // Initial load & poll klines every 10 seconds
  useEffect(() => {
    fetchKlines();
    const interval = setInterval(() => {
      fetchKlines();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchKlines]);

  // Render & Update Lightweight-Charts instance
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Cleanup previous chart instance
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
    }

    if (candles.length === 0) return;

    const container = chartContainerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 460;

    const chart = createChart(container, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#0B0E14' },
        textColor: '#8E9BAE',
        fontSize: 11,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace, sans-serif",
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#E5B842',
          width: 1,
          style: 3,
          labelBackgroundColor: '#1F2430',
        },
        horzLine: {
          color: '#E5B842',
          width: 1,
          style: 3,
          labelBackgroundColor: '#1F2430',
        },
      },
      rightPriceScale: {
        borderColor: '#1F2430',
        scaleMargins: {
          top: 0.1,
          bottom: showVolume ? 0.25 : 0.1,
        },
      },
      timeScale: {
        borderColor: '#1F2430',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    chartRef.current = chart;

    // Format candles for lightweight-charts
    const formattedCandles: CandlestickData[] = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    let mainSeries: any;

    if (chartType === 'candlestick') {
      mainSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#089981',
        downColor: '#f23645',
        borderVisible: false,
        wickUpColor: '#089981',
        wickDownColor: '#f23645',
      });
      mainSeries.setData(formattedCandles);
    } else {
      mainSeries = chart.addSeries(LineSeries, {
        color: '#E5B842',
        lineWidth: 2,
      });
      const lineData: LineData[] = candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.close,
      }));
      mainSeries.setData(lineData);
    }

    mainSeriesRef.current = mainSeries;

    // Volume Series
    if (showVolume) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });

      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });

      const volumeData: HistogramData[] = candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(8, 153, 129, 0.35)' : 'rgba(242, 54, 69, 0.35)',
      }));
      volumeSeries.setData(volumeData);
    }

    // Helper to calculate EMA from candle closes
    const calculateEMA = (period: number): LineData[] => {
      if (candles.length === 0) return [];
      const k = 2 / (period + 1);
      const emaData: LineData[] = [];
      let ema = candles[0].close;

      candles.forEach((c, index) => {
        if (index === 0) {
          emaData.push({ time: c.time as UTCTimestamp, value: Number(ema.toFixed(2)) });
        } else {
          ema = c.close * k + ema * (1 - k);
          emaData.push({ time: c.time as UTCTimestamp, value: Number(ema.toFixed(2)) });
        }
      });
      return emaData;
    };

    // EMA 20 Overlay
    if (showEma20 && candles.length >= 5) {
      const ema20Series = chart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 1,
        title: 'EMA 20',
      });
      ema20Series.setData(calculateEMA(20));
    }

    // EMA 50 Overlay
    if (showEma50 && candles.length >= 10) {
      const ema50Series = chart.addSeries(LineSeries, {
        color: '#3b82f6',
        lineWidth: 1,
        title: 'EMA 50',
      });
      ema50Series.setData(calculateEMA(50));
    }

    // Real AI Trade Plan Levels (Entry, SL, TP1, TP2) - strictly from real AI recommendation
    if (showAiLevels && recommendation && mainSeries?.createPriceLine) {
      // 1. AI Entry Level
      if (recommendation.plannedEntry && recommendation.plannedEntry > 0) {
        mainSeries.createPriceLine({
          price: recommendation.plannedEntry,
          color: '#E5B842',
          lineWidth: 2,
          lineStyle: 0, // Solid
          axisLabelVisible: true,
          title: `AI ENTRY (Rp ${recommendation.plannedEntry.toLocaleString('id-ID')})`,
        });
      }

      // 2. AI Stop Loss Level
      if (recommendation.stopLoss && recommendation.stopLoss > 0) {
        mainSeries.createPriceLine({
          price: recommendation.stopLoss,
          color: '#ef4444',
          lineWidth: 2,
          lineStyle: 0, // Solid
          axisLabelVisible: true,
          title: `AI SL (Rp ${recommendation.stopLoss.toLocaleString('id-ID')})`,
        });
      }

      // 3. AI Target 1 (TP1)
      if (recommendation.takeProfit1 && recommendation.takeProfit1 > 0) {
        mainSeries.createPriceLine({
          price: recommendation.takeProfit1,
          color: '#10b981',
          lineWidth: 2,
          lineStyle: 0, // Solid
          axisLabelVisible: true,
          title: `AI TP1 (Rp ${recommendation.takeProfit1.toLocaleString('id-ID')})`,
        });
      }

      // 4. AI Target 2 (TP2)
      if (recommendation.takeProfit2 && recommendation.takeProfit2 > 0) {
        mainSeries.createPriceLine({
          price: recommendation.takeProfit2,
          color: '#059669',
          lineWidth: 1,
          lineStyle: 2, // Dashed
          axisLabelVisible: true,
          title: `AI TP2 (Rp ${recommendation.takeProfit2.toLocaleString('id-ID')})`,
        });
      }
    }

    // Real Technical Support & Resistance Levels
    if (showSuppRes && technicals && mainSeries?.createPriceLine) {
      if (technicals.supportLevels && technicals.supportLevels[0] > 0) {
        const supp = technicals.supportLevels[0];
        mainSeries.createPriceLine({
          price: supp,
          color: '#22c55e',
          lineWidth: 1,
          lineStyle: 2, // Dashed
          axisLabelVisible: true,
          title: `SUPPORT (Rp ${supp.toLocaleString('id-ID')})`,
        });
      }

      if (technicals.resistanceLevels && technicals.resistanceLevels[0] > 0) {
        const res = technicals.resistanceLevels[0];
        mainSeries.createPriceLine({
          price: res,
          color: '#f87171',
          lineWidth: 1,
          lineStyle: 2, // Dashed
          axisLabelVisible: true,
          title: `RESISTANCE (Rp ${res.toLocaleString('id-ID')})`,
        });
      }
    }

    // Auto-fit content to screen
    chart.timeScale().fitContent();

    // Responsive ResizeObserver
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        mainSeriesRef.current = null;
      }
    };
  }, [
    candles,
    chartType,
    showVolume,
    showEma20,
    showEma50,
    showAiLevels,
    showSuppRes,
    recommendation,
    technicals,
  ]);

  const handleFitContent = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  return (
    <div className="bg-[#0B0E14] border border-gray-800 rounded-xl overflow-hidden shadow-2xl min-h-[520px] relative flex flex-col font-mono">
      {/* 1. Header (Exact Match to User Requirement) */}
      <div className="bg-[#121620] px-4 py-3 border-b border-gray-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-[#E5B842]" />
          <span className="font-extrabold text-white uppercase tracking-wider">
            INDODAX LIVE CHART • {pair.symbol} • {timeframe}
          </span>
        </div>
        <div className="flex items-center space-x-2 text-[10px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-emerald-400 font-bold uppercase tracking-wider">
            LIVE MARKET DATA • INDODAX
          </span>
        </div>
      </div>

      {/* 2. Chart Toolbar Controls */}
      <div className="bg-[#0e121a] px-4 py-2 border-b border-gray-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        {/* Type & View Toggles */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setChartType(chartType === 'candlestick' ? 'line' : 'candlestick')}
            className={`px-2.5 py-1 rounded border font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              chartType === 'candlestick'
                ? 'bg-[#E5B842]/15 text-[#E5B842] border-[#E5B842]/40'
                : 'bg-gray-800/60 text-gray-400 border-gray-700 hover:text-white'
            }`}
          >
            <BarChart2 className="w-3 h-3" />
            <span>{chartType === 'candlestick' ? 'Candles' : 'Line'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowVolume(!showVolume)}
            className={`px-2.5 py-1 rounded border font-semibold transition-all cursor-pointer ${
              showVolume
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                : 'bg-gray-800/60 text-gray-500 border-gray-700 hover:text-gray-300'
            }`}
          >
            Vol
          </button>

          <button
            type="button"
            onClick={() => setShowEma20(!showEma20)}
            className={`px-2.5 py-1 rounded border font-semibold transition-all cursor-pointer ${
              showEma20
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                : 'bg-gray-800/60 text-gray-500 border-gray-700 hover:text-gray-300'
            }`}
          >
            EMA20
          </button>

          <button
            type="button"
            onClick={() => setShowEma50(!showEma50)}
            className={`px-2.5 py-1 rounded border font-semibold transition-all cursor-pointer ${
              showEma50
                ? 'bg-blue-500/15 text-blue-400 border-blue-500/40'
                : 'bg-gray-800/60 text-gray-500 border-gray-700 hover:text-gray-300'
            }`}
          >
            EMA50
          </button>
        </div>

        {/* AI & S/R Overlays */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowAiLevels(!showAiLevels)}
            className={`px-2.5 py-1 rounded border font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              showAiLevels
                ? 'bg-[#E5B842]/20 text-[#E5B842] border-[#E5B842]/50 shadow-sm'
                : 'bg-gray-800/60 text-gray-500 border-gray-700 hover:text-gray-300'
            }`}
            title="Tampilkan garis target dan batas AI (Entry, Stop Loss, TP1, TP2)"
          >
            <Sparkles className="w-3 h-3" />
            <span>AI Levels</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSuppRes(!showSuppRes)}
            className={`px-2.5 py-1 rounded border font-semibold transition-all cursor-pointer ${
              showSuppRes
                ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40'
                : 'bg-gray-800/60 text-gray-500 border-gray-700 hover:text-gray-300'
            }`}
            title="Tampilkan garis Support & Resistance"
          >
            S/R
          </button>

          <button
            type="button"
            onClick={handleFitContent}
            className="p-1 rounded bg-[#0B0E14] border border-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Reset Zoom & Pan"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={fetchKlines}
            disabled={isLoadingCandles}
            className="p-1 rounded bg-[#0B0E14] border border-gray-800 text-gray-400 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh Candlesticks"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCandles ? 'animate-spin text-[#E5B842]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. Main Chart Canvas Area */}
      <div className="flex-1 w-full min-h-[440px] relative bg-[#0B0E14]">
        {/* Loading Indicator */}
        {isLoadingCandles && candles.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 z-20 bg-[#0B0E14]">
            <RefreshCw className="w-6 h-6 animate-spin text-[#E5B842]" />
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
              MEMUAT DATA CANDLESTICK INDODAX ({pair.symbol})...
            </p>
          </div>
        )}

        {/* Unavailable Error State (Strict User Intent Requirement: Do not display simulated candles) */}
        {errorMsg && candles.length === 0 && !isLoadingCandles && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 space-y-3 z-20 bg-[#0B0E14] text-center">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-md">
              <h3 className="text-sm font-black text-rose-400 uppercase tracking-wider">
                INDODAX MARKET DATA UNAVAILABLE
              </h3>
              <p className="text-xs text-gray-400 font-sans leading-relaxed">
                Data candlestick resmi untuk pair <span className="text-white font-bold">{pair.symbol}</span> ({timeframe}) sedang tidak dapat dijangkau dari server INDODAX.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchKlines}
              className="mt-2 px-4 py-2 rounded-lg bg-[#E5B842] text-black text-xs font-black uppercase hover:bg-[#d4a737] transition-all cursor-pointer"
            >
              Coba Muat Ulang
            </button>
          </div>
        )}

        {/* The Lightweight-Charts container */}
        <div ref={chartContainerRef} className="w-full h-full min-h-[440px]" />

        {/* Scanning / Analyzing Shimmer Overlay */}
        {isLoadingAi && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center space-y-3 z-30 font-mono">
            <div className="w-12 h-12 rounded-xl bg-[#E5B842]/20 border border-[#E5B842]/40 flex items-center justify-center text-[#E5B842] animate-bounce">
              <Bot className="w-6 h-6" />
            </div>
            <div className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#E5B842] animate-spin" />
              MEMPROSES ANALISIS ORDER FLOW & STRUKTUR PASAR...
            </div>
          </div>
        )}
      </div>

      {/* 4. Chart Bottom Footer with Analysis Status & Action Button */}
      <div className="bg-[#121620] px-4 py-3 border-t border-gray-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center space-x-2">
          <span className="text-gray-400 uppercase font-bold text-[10px]">STATUS ANALISIS:</span>
          {lastAnalysisTimestamp ? (
            <span className="text-emerald-400 font-bold text-[10px]">
              Terakhir: {lastAnalysisTimestamp} WIB
            </span>
          ) : (
            <span className="text-gray-400 font-bold text-[10px]">Siap Dianalisis</span>
          )}
        </div>

        {onTriggerAiAnalysis && (
          <button
            type="button"
            onClick={onTriggerAiAnalysis}
            disabled={isLoadingAi}
            className="px-6 py-2.5 rounded-lg bg-[#E5B842] hover:bg-[#d4a737] active:scale-95 text-black font-extrabold text-xs sm:text-sm shadow-md shadow-[#E5B842]/20 cursor-pointer flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {isLoadingAi ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
                <span>MENGANALISIS...</span>
              </>
            ) : (
              <>
                <Activity className="w-4 h-4 text-black" />
                <span>ANALYSIS NOW</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
