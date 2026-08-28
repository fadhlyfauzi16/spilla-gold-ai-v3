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
}

export const CryptoAiRecommendationCard: React.FC<CryptoAiRecommendationCardProps> = ({
  recommendation,
  technicals,
  pair,
  isLoading,
  onRefreshAi,
  onApplyToOrder,
}) => {
  if (!recommendation) {
    return (
      <div className="bg-[#121620] border border-[#232B3E] rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center min-h-[350px] text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#E5B842]/10 border border-[#E5B842]/30 flex items-center justify-center text-[#E5B842] animate-bounce">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            AI Crypto Intelligence Engine
          </h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm">
            Generate institutional technical, order flow, and slippage-guided recommendation for{' '}
            {pair.symbol}.
          </p>
        </div>
        <button
          onClick={onRefreshAi}
          disabled={isLoading}
          className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#E5B842] text-black hover:bg-[#d4a733] transition-all flex items-center space-x-2 shadow-lg shadow-[#E5B842]/10 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analyzing Order Flow with Gemini...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate AI Analysis Now</span>
            </>
          )}
        </button>
      </div>
    );
  }

  const isBuy = recommendation.action.includes('BUY');
  const isSell = recommendation.action.includes('SELL');

  return (
    <div className="bg-[#121620] border border-[#232B3E] rounded-2xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E5B842]/20 to-[#E5B842]/5 border border-[#E5B842]/30 flex items-center justify-center text-[#E5B842]">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                QUANTITATIVE AI RECOMMENDATION
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E5B842]/10 text-[#E5B842] border border-[#E5B842]/30">
                GEMINI 3.7 FLASH
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              {recommendation.marketStructure || `${pair.symbol} Institutional Setup`}
            </p>
          </div>
        </div>

        <button
          onClick={onRefreshAi}
          disabled={isLoading}
          className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1C2230] border border-[#232B3E] transition-colors disabled:opacity-50"
          title="Regenerate Analysis"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#E5B842]' : ''}`} />
        </button>
      </div>

      {/* Main Signal Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
          isBuy
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : isSell
            ? 'bg-rose-500/10 border-rose-500/30'
            : 'bg-amber-500/10 border-amber-500/30'
        }`}
      >
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
              isBuy
                ? 'bg-emerald-500 text-black'
                : isSell
                ? 'bg-rose-500 text-white'
                : 'bg-amber-500 text-black'
            }`}
          >
            {isBuy ? (
              <ArrowUpRight className="w-6 h-6" />
            ) : isSell ? (
              <ArrowDownRight className="w-6 h-6" />
            ) : (
              <Clock className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="text-[10px] text-gray-400 uppercase font-semibold">
              Action Verdict
            </div>
            <div
              className={`text-lg font-black tracking-wide ${
                isBuy ? 'text-emerald-400' : isSell ? 'text-rose-400' : 'text-amber-400'
              }`}
            >
              {recommendation.action.replace('_', ' ')}
            </div>
          </div>
        </div>

        {/* Confidence Gauge */}
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-[10px] text-gray-400 uppercase">AI Confidence</div>
            <div className="text-lg font-bold font-mono text-white">
              {recommendation.confidence}%
            </div>
          </div>
          <div className="w-12 h-12 relative flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-gray-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={isBuy ? 'text-emerald-400' : isSell ? 'text-rose-400' : 'text-[#E5B842]'}
                strokeDasharray={`${recommendation.confidence}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-[10px] font-bold text-white font-mono">
              {recommendation.confidence}%
            </span>
          </div>
        </div>
      </div>

      {/* Target Price Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#1F2633]">
          <div className="text-[10px] text-gray-400 uppercase font-semibold">Planned Entry</div>
          <div className="text-xs font-bold font-mono text-white mt-1">
            Rp {recommendation.plannedEntry.toLocaleString('id-ID')}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#1F2633]">
          <div className="text-[10px] text-emerald-400 uppercase font-semibold">Take Profit 1</div>
          <div className="text-xs font-bold font-mono text-emerald-400 mt-1">
            Rp {recommendation.takeProfit1.toLocaleString('id-ID')}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#1F2633]">
          <div className="text-[10px] text-emerald-400 uppercase font-semibold">Take Profit 2</div>
          <div className="text-xs font-bold font-mono text-emerald-400 mt-1">
            Rp {recommendation.takeProfit2.toLocaleString('id-ID')}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#0B0E14] border border-[#1F2633]">
          <div className="text-[10px] text-rose-400 uppercase font-semibold">Stop Loss / Inval.</div>
          <div className="text-xs font-bold font-mono text-rose-400 mt-1">
            Rp {recommendation.stopLoss.toLocaleString('id-ID')}
          </div>
        </div>
      </div>

      {/* Allocation & Risk Specs */}
      <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
        <div className="p-2.5 rounded-xl bg-[#0B0E14] border border-[#1F2633]">
          <div className="text-[10px] text-gray-500 uppercase">Suggested Sizing</div>
          <div className="text-xs font-bold font-mono text-[#E5B842] mt-0.5">
            {recommendation.suggestedAllocationPercent}% Wallet
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-[#0B0E14] border border-[#1F2633]">
          <div className="text-[10px] text-gray-500 uppercase">Risk / Reward</div>
          <div className="text-xs font-bold font-mono text-white mt-0.5">
            1 : {recommendation.riskRewardRatio}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-[#0B0E14] border border-[#1F2633]">
          <div className="text-[10px] text-gray-500 uppercase">Expected Slippage</div>
          <div className="text-xs font-bold font-mono text-gray-300 mt-0.5">
            {recommendation.expectedSlippagePercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Rationale & Drivers */}
      <div className="p-3.5 rounded-xl bg-[#0B0E14] border border-[#1F2633] space-y-2 text-xs">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          Quantitative Rationale
        </div>
        <p className="text-gray-300 text-xs leading-relaxed">{recommendation.aiRationale}</p>

        {recommendation.keyDrivers && recommendation.keyDrivers.length > 0 && (
          <div className="pt-2 border-t border-[#1F2633] space-y-1">
            <div className="text-[10px] text-gray-500 uppercase font-semibold">Key Catalysts:</div>
            <div className="space-y-1">
              {recommendation.keyDrivers.map((driver, idx) => (
                <div key={idx} className="flex items-center space-x-2 text-[11px] text-gray-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E5B842]" />
                  <span>{driver}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Action Button */}
      <button
        onClick={() => onApplyToOrder(recommendation)}
        className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#E5B842]/10 hover:bg-[#E5B842]/20 text-[#E5B842] border border-[#E5B842]/30 transition-all flex items-center justify-center space-x-2"
      >
        <SlidersHorizontal className="w-4 h-4" />
        <span>Apply Parameters to Order Execution Panel</span>
      </button>
    </div>
  );
};
