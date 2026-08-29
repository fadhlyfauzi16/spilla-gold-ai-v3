import React from 'react';
import {
  Bot,
  Sparkles,
  RefreshCw,
  Target,
  Shield,
  Percent,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  Zap,
  Check,
  Activity,
  Cpu,
} from 'lucide-react';
import {
  CryptoAiRecommendation,
  CryptoTechnicalIndicators,
  IndodaxMarketPair,
} from '../../types/crypto';

interface CryptoAiRecommendationCardProps {
  recommendation: CryptoAiRecommendation | null;
  technicals: CryptoTechnicalIndicators | null;
  pair: IndodaxMarketPair;
  isLoading: boolean;
  onRefreshAi: () => void;
  onApplyToOrder: (rec: CryptoAiRecommendation) => void;
  currentPrice?: number;
}

export const CryptoAiRecommendationCard: React.FC<CryptoAiRecommendationCardProps> = ({
  recommendation,
  technicals,
  pair,
  isLoading,
  onRefreshAi,
  onApplyToOrder,
  currentPrice = 0,
}) => {
  // 1. STATE: ANALYZING (Exact match to Live AI Analysis single-pass scanner)
  if (isLoading) {
    return (
      <div className="bg-[#121620] border border-gray-800 rounded-xl p-8 shadow-2xl flex flex-col items-center justify-center text-center min-h-[480px] space-y-6 font-mono">
        <div className="relative flex items-center justify-center">
          <div className="w-20 h-20 rounded-2xl bg-[#0B0E14] border border-[#E5B842]/30 flex items-center justify-center shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-[#E5B842]/15 to-transparent animate-pulse" />
            <Bot className="w-10 h-10 text-[#E5B842] relative z-10" />
          </div>
        </div>
        <div className="space-y-2 max-w-sm">
          <h2 className="text-sm font-black text-white tracking-widest uppercase flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-[#E5B842] animate-spin" />
            MEMPROSES ORDER FLOW & AI INDODAX...
          </h2>
          <p className="text-xs text-gray-400 leading-relaxed font-sans">
            Gemini 3.7 membaca kedalaman order book <strong className="text-[#E5B842]">{pair.symbol}</strong>, menganalisis imbalance buy/sell pressure, menghitung slippage VWAP & menyusun rencana eksekusi spot.
          </p>
        </div>

        {/* Unified Pulsing Shimmer Bar */}
        <div className="w-full max-w-xs space-y-2">
          <div className="w-full bg-[#0B0E14] h-2 rounded-full overflow-hidden border border-gray-800 relative">
            <div className="h-full bg-gradient-to-r from-[#E5B842] via-amber-200 to-[#E5B842] rounded-full w-full animate-pulse" />
          </div>
          <span className="text-[10px] text-gray-500 font-mono block text-center uppercase tracking-wider">
            INSTANT SPOT CONFLUENCE SYNTHESIS
          </span>
        </div>
      </div>
    );
  }

  // 2. STATE: NO ANALYSIS YET (Exact match to Live AI Analysis empty state)
  if (!recommendation) {
    return (
      <div className="bg-[#121620] border border-gray-800 rounded-xl p-8 shadow-2xl flex flex-col items-center justify-center text-center min-h-[480px] space-y-5 font-mono">
        <div className="w-16 h-16 rounded-2xl bg-[#0B0E14] border border-gray-800 flex items-center justify-center text-[#E5B842] shadow-inner">
          <Bot className="w-8 h-8" />
        </div>
        <div className="space-y-1.5 max-w-sm">
          <h2 className="text-sm font-extrabold text-white tracking-wider uppercase">NO ANALYSIS YET</h2>
          <p className="text-xs text-gray-400 leading-relaxed font-sans">
            Tekan <strong className="text-[#E5B842]">ANALYSIS NOW</strong> untuk menghasilkan analisa order flow, bias arah, dan rekomendasi spot {pair.symbol}.
          </p>
        </div>
        <button
          onClick={onRefreshAi}
          disabled={isLoading}
          className="px-6 py-3 rounded-xl bg-[#E5B842] hover:bg-[#d4a737] active:scale-95 text-black font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-[#E5B842]/20"
        >
          <Activity className="w-4 h-4 text-black" />
          <span>ANALYSIS NOW</span>
        </button>
      </div>
    );
  }

  const isBuy = recommendation.action.includes('BUY');
  const isSell = recommendation.action.includes('SELL');
  const isWait = recommendation.action === 'WAIT';
  const directionText = isBuy ? 'BUY' : isSell ? 'SELL' : 'WAIT';

  const spotAnchor = currentPrice > 0 ? currentPrice : recommendation.plannedEntry;

  return (
    <div className="bg-[#121620] border border-gray-800 rounded-xl p-5 shadow-2xl space-y-4 font-mono">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-[#E5B842]" />
          <h2 className="text-xs font-extrabold text-white tracking-wider uppercase">
            AI EXECUTION RECOMMENDATION
          </h2>
          <span className="text-[10px] px-2 py-0.5 rounded font-black bg-[#E5B842]/20 text-[#E5B842] border border-[#E5B842]/40 uppercase">
            INDODAX SPOT • {pair.symbol}
          </span>
        </div>
        <button
          onClick={onRefreshAi}
          disabled={isLoading}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-700/80 transition-colors"
          title="Regenerate AI Recommendation"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Top Hero Banner: DIRECTION BIAS, AI CONFIDENCE, and QUICK EXECUTE */}
      <div className="p-3 sm:p-4 bg-gradient-to-br from-[#0e121a] to-[#07090e] border border-[#E5B842]/50 rounded-2xl shadow-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {/* 1. DIRECTION BIAS CARD */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
              isBuy
                ? 'bg-emerald-950/25 border-emerald-500/40 shadow-sm shadow-emerald-950/40'
                : isSell
                ? 'bg-rose-950/25 border-rose-500/40 shadow-sm shadow-rose-950/40'
                : 'bg-amber-950/25 border-amber-500/40 shadow-sm shadow-amber-950/40'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center font-black shrink-0 ${
                  isBuy
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30'
                    : isSell
                    ? 'bg-rose-500 text-black shadow-md shadow-rose-500/30'
                    : 'bg-amber-500 text-black shadow-md shadow-amber-500/30'
                }`}
              >
                {isBuy ? (
                  <ArrowUpRight className="w-6 h-6 stroke-[3]" />
                ) : isSell ? (
                  <ArrowDownRight className="w-6 h-6 stroke-[3]" />
                ) : (
                  <Clock className="w-6 h-6 stroke-[3]" />
                )}
              </div>
              <div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#E5B842]" />
                  DIRECTION BIAS
                </div>
                <div className="text-xl sm:text-2xl font-black tracking-tight leading-none mt-0.5">
                  <span className={isBuy ? 'text-emerald-400' : isSell ? 'text-rose-400' : 'text-amber-400'}>
                    {recommendation.action.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-[9px] text-gray-400 font-medium mt-0.5">
                  {isBuy ? 'Strong accumulation pressure' : isSell ? 'Distribution / profit taking' : 'Neutral order flow'}
                </div>
              </div>
            </div>
          </div>

          {/* 2. AI CONFIDENCE CARD */}
          <div className="p-3 rounded-xl bg-[#121620]/90 border border-gray-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-xl bg-[#E5B842]/15 border border-[#E5B842]/30 flex items-center justify-center shrink-0">
                <Bot className="w-6 h-6 text-[#E5B842]" />
              </div>
              <div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  AI CONFIDENCE
                </div>
                <div className="text-xl sm:text-2xl font-black text-[#E5B842] font-mono tracking-tight leading-none mt-0.5">
                  {recommendation.confidence}%
                </div>
                <div className="text-[9px] text-gray-400 font-medium mt-0.5">Order flow conviction</div>
              </div>
            </div>
            <span
              className={`text-[10px] px-2.5 py-1 rounded-lg font-black tracking-wider uppercase shadow-inner ${
                recommendation.confidence >= 80
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : recommendation.confidence >= 60
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              {recommendation.confidence >= 80 ? 'HIGH' : recommendation.confidence >= 60 ? 'MEDIUM' : 'LOW'}
            </span>
          </div>

          {/* 3. INSTANT DISPATCH / DIRECT EXECUTION */}
          <div className="p-3 rounded-xl bg-[#121620]/90 border border-gray-800 flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1 truncate">
                  INSTANT SPOT
                </div>
                <div className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5 mt-0.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                  SPOT ROUTER
                </div>
                <div className="text-[9px] text-emerald-400/90 font-medium truncate">Ready to trade</div>
              </div>
            </div>
            <button
              onClick={() => onApplyToOrder(recommendation)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 ${
                isBuy
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/30 ring-1 ring-emerald-300/50'
                  : isSell
                  ? 'bg-rose-500 hover:bg-rose-400 text-black shadow-rose-500/30 ring-1 ring-rose-300/50'
                  : 'bg-[#E5B842] hover:bg-[#d4a737] text-black shadow-[#E5B842]/30'
              }`}
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>APPLY</span>
            </button>
          </div>
        </div>
      </div>

      {/* Core Execution Semantics Grid */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] text-gray-400 uppercase font-extrabold px-1">
          <span className="flex items-center gap-1 text-[#E5B842]">
            <Target className="w-3 h-3 text-[#E5B842]" />
            SPOT EXECUTION PARAMETERS BREAKDOWN
          </span>
          <span className="text-gray-500">INDODAX SSOT</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {/* 1. DIRECTION BIAS */}
          <div className="p-2.5 bg-[#0B0E14] rounded-lg border border-[#E5B842]/30 shadow-inner">
            <span className="text-[9px] text-[#E5B842] uppercase font-bold block mb-1">
              1. DIRECTION BIAS
            </span>
            <div className="flex items-center gap-1">
              <span
                className={`text-xs font-black px-2 py-0.5 rounded flex items-center gap-1 ${
                  isBuy
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : isSell
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {directionText}
              </span>
            </div>
            <span className="text-[9px] text-gray-500 block mt-0.5">{recommendation.confidence}% Conviction</span>
          </div>

          {/* 2. HARGA SPOT TERAKHIR */}
          <div className="p-2.5 bg-[#0B0E14] rounded-lg border border-gray-800">
            <span className="text-[9px] text-gray-400 uppercase font-bold block mb-1">
              2. HARGA TERAKHIR
            </span>
            <span className="text-xs font-extrabold text-emerald-400 font-mono block">
              Rp {spotAnchor.toLocaleString('id-ID')}
            </span>
            <span className="text-[9px] text-gray-500 block mt-0.5">Spot quote IDR</span>
          </div>

          {/* 3. PLANNED ENTRY ZONE */}
          <div className="p-2.5 bg-[#0B0E14] rounded-lg border border-emerald-500/30">
            <span className="text-[9px] uppercase font-bold block mb-1 text-emerald-400">
              3. PLANNED ENTRY
            </span>
            <span className="text-xs font-extrabold text-white block truncate">
              Rp {recommendation.plannedEntry.toLocaleString('id-ID')}
            </span>
            <span className="text-[9px] text-gray-400 block mt-0.5 truncate">
              Ideal Fill Zone
            </span>
          </div>

          {/* 4. ENTRY MODE & SIZING */}
          <div className="p-2.5 bg-[#0B0E14] rounded-lg border border-gray-800">
            <span className="text-[9px] text-gray-400 uppercase font-bold block mb-1">
              4. SUGGESTED SIZING
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded inline-block uppercase bg-[#E5B842]/20 text-[#E5B842] border border-[#E5B842]/30">
              {recommendation.suggestedAllocationPercent}% WALLET
            </span>
            <span className="text-[9px] text-gray-500 block mt-0.5 truncate">
              Slippage: ±{recommendation.expectedSlippagePercent.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Target Levels Matrix */}
      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {/* Stop Loss / Invalidation */}
          <div className="p-2.5 bg-[#0B0E14] rounded-lg border border-gray-800 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-rose-400 font-bold uppercase">
                INVALIDATION / SL
              </span>
              <span className="text-[9px] text-rose-400/80 font-mono">
                {spotAnchor > 0 ? `-${(((spotAnchor - recommendation.stopLoss) / spotAnchor) * 100).toFixed(1)}%` : '--'}
              </span>
            </div>
            <span className="text-rose-400 font-extrabold text-xs block">
              Rp {recommendation.stopLoss.toLocaleString('id-ID')}
            </span>
            <p className="text-[9px] text-gray-400 leading-tight">
              Level batas pembatalan analisa order flow.
            </p>
          </div>

          {/* Take Profit 1 */}
          <div className="p-2.5 bg-[#0B0E14] rounded-lg border border-gray-800 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-emerald-400 font-bold uppercase">
                TAKE PROFIT 1
              </span>
              <span className="text-[9px] text-emerald-400/80 font-mono">
                1:{recommendation.riskRewardRatio}
              </span>
            </div>
            <span className="text-emerald-400 font-extrabold text-xs block">
              Rp {recommendation.takeProfit1.toLocaleString('id-ID')}
            </span>
            <p className="text-[9px] text-gray-400 leading-tight">
              Target likuiditas order book terdekat.
            </p>
          </div>

          {/* Take Profit 2 */}
          <div className="p-2.5 bg-[#0B0E14] rounded-lg border border-gray-800 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-emerald-400 font-bold uppercase">
                TAKE PROFIT 2
              </span>
              <span className="text-[9px] text-emerald-400/80 font-mono">
                1:{(recommendation.riskRewardRatio * 1.6).toFixed(1)}
              </span>
            </div>
            <span className="text-emerald-400 font-extrabold text-xs block">
              Rp {recommendation.takeProfit2.toLocaleString('id-ID')}
            </span>
            <p className="text-[9px] text-gray-400 leading-tight">
              Extended resistance liquidity pool.
            </p>
          </div>
        </div>
      </div>

      {/* Rationale & Drivers */}
      <div className="p-3 bg-[#0B0E14] rounded-lg border border-gray-800 space-y-2 text-xs">
        <div className="flex items-center justify-between pb-1.5 border-b border-gray-800/80 text-[10px]">
          <span className="text-[#E5B842] font-extrabold uppercase flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#E5B842]" />
            QUANTITATIVE & ORDER FLOW RATIONALE:
          </span>
          <span className="text-gray-400 font-mono">
            R:R 1:{recommendation.riskRewardRatio}
          </span>
        </div>
        <p className="text-[11px] text-gray-300 leading-relaxed font-sans">
          {recommendation.aiRationale}
        </p>

        {recommendation.keyDrivers && recommendation.keyDrivers.length > 0 && (
          <div className="pt-2 border-t border-gray-800/80 space-y-1">
            <span className="text-[10px] text-gray-500 uppercase font-bold block">Key Confluence Factors:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {recommendation.keyDrivers.map((driver, idx) => (
                <div key={idx} className="flex items-center space-x-1.5 text-[11px] text-gray-300 font-sans">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E5B842] shrink-0" />
                  <span className="truncate">{driver}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Button */}
      <button
        onClick={() => onApplyToOrder(recommendation)}
        className="w-full py-2.5 rounded-lg bg-[#E5B842] hover:bg-[#d4a737] active:scale-95 text-black font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#E5B842]/20"
      >
        <SlidersHorizontal className="w-4 h-4 text-black" />
        <span>TERAPKAN KE FORM EKSEKUSI SPOT INDODAX</span>
      </button>
    </div>
  );
};
