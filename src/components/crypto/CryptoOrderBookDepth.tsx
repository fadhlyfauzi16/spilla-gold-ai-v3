import React from 'react';
import { Layers, TrendingUp, TrendingDown, Scale, Zap, ShieldCheck } from 'lucide-react';
import { IndodaxDepthData, IndodaxMarketPair } from '../../types/crypto';

interface CryptoOrderBookDepthProps {
  depth: IndodaxDepthData | null;
  pair: IndodaxMarketPair;
  onSelectPrice?: (price: number) => void;
}

export const CryptoOrderBookDepth: React.FC<CryptoOrderBookDepthProps> = ({
  depth,
  pair,
  onSelectPrice,
}) => {
  if (!depth) {
    return (
      <div className="bg-[#121620] border border-gray-800 rounded-xl p-6 flex flex-col items-center justify-center min-h-[300px] text-gray-500 text-xs font-mono">
        <Layers className="w-8 h-8 text-gray-600 mb-2 animate-pulse" />
        <span>MEMUAT KEDALAMAN ORDER BOOK INDODAX...</span>
      </div>
    );
  }

  const bids = depth.bids.slice(0, 10);
  const asks = depth.asks.slice(0, 10);

  const maxCumulativeIdr = Math.max(
    bids.length > 0 ? bids[bids.length - 1].cumulativeIdr : 1,
    asks.length > 0 ? asks[asks.length - 1].cumulativeIdr : 1
  );

  const buyRatio = depth.buyPressureRatio;
  const sellRatio = depth.sellPressureRatio;

  return (
    <div className="bg-[#121620] border border-gray-800 rounded-xl p-5 shadow-xl space-y-4 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#E5B842]/15 border border-[#E5B842]/30 flex items-center justify-center text-[#E5B842]">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-extrabold text-white uppercase tracking-wider">
              ORDER FLOW & MARKET DEPTH
            </h2>
            <p className="text-[10px] text-gray-400">Live INDODAX Bid/Ask Real-Time Distribution</p>
          </div>
        </div>

        {/* Liquidity Tier Badge */}
        <div className="flex items-center space-x-2">
          <span
            className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
              depth.liquidityConcentration === 'HIGH'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : depth.liquidityConcentration === 'MODERATE'
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                : depth.liquidityConcentration === 'LOW'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            {depth.liquidityConcentration} LIQUIDITY
          </span>
        </div>
      </div>

      {/* Order Flow Pressure Meter */}
      <div className="p-3 rounded-lg bg-[#0B0E14] border border-gray-800 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <div className="flex items-center space-x-1 text-emerald-400 text-[11px]">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>BUY PRESSURE: {buyRatio}%</span>
          </div>
          <div className="flex items-center space-x-1 text-gray-400 font-mono text-[10px]">
            <Scale className="w-3 h-3 text-[#E5B842]" />
            <span>
              Imbalance: {depth.orderBookImbalancePercent > 0 ? '+' : ''}
              {depth.orderBookImbalancePercent}%
            </span>
          </div>
          <div className="flex items-center space-x-1 text-rose-400 text-[11px]">
            <span>SELL: {sellRatio}%</span>
            <TrendingDown className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 rounded-full bg-gray-900 overflow-hidden flex border border-gray-800">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${buyRatio}%` }}
          />
          <div
            className="h-full bg-rose-500 transition-all duration-500"
            style={{ width: `${sellRatio}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[9px] text-gray-500 font-mono pt-0.5">
          <span>Bid Depth: Rp {(depth.totalBidDepthIdr / 1_000_000).toFixed(1)}M</span>
          <span>Ask Depth: Rp {(depth.totalAskDepthIdr / 1_000_000).toFixed(1)}M</span>
        </div>
      </div>

      {/* Split Order Book Table */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* BIDS (BUY ORDERS) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-emerald-400 pb-1 border-b border-emerald-500/20 px-1">
            <span>BID (IDR)</span>
            <span>VOL ({pair.baseCurrency})</span>
          </div>
          <div className="space-y-0.5 max-h-[220px] overflow-y-auto pr-1">
            {bids.map((b, idx) => {
              const depthPct = Math.min(100, (b.cumulativeIdr / maxCumulativeIdr) * 100);
              return (
                <div
                  key={`bid-${idx}`}
                  onClick={() => onSelectPrice && onSelectPrice(b.price)}
                  className="relative flex items-center justify-between py-1 px-1.5 rounded cursor-pointer hover:bg-emerald-500/15 transition-colors font-mono text-[11px] group"
                  title="Klik untuk mengisi harga di form eksekusi"
                >
                  <div
                    className="absolute inset-y-0 right-0 bg-emerald-500/10 rounded transition-all"
                    style={{ width: `${depthPct}%` }}
                  />
                  <span className="relative z-10 font-bold text-emerald-400 group-hover:underline">
                    {b.price.toLocaleString('id-ID')}
                  </span>
                  <span className="relative z-10 text-gray-300 text-[10px]">
                    {b.amount.toLocaleString('id-ID', { maximumFractionDigits: 4 })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ASKS (SELL ORDERS) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-rose-400 pb-1 border-b border-rose-500/20 px-1">
            <span>ASK (IDR)</span>
            <span>VOL ({pair.baseCurrency})</span>
          </div>
          <div className="space-y-0.5 max-h-[220px] overflow-y-auto pr-1">
            {asks.map((a, idx) => {
              const depthPct = Math.min(100, (a.cumulativeIdr / maxCumulativeIdr) * 100);
              return (
                <div
                  key={`ask-${idx}`}
                  onClick={() => onSelectPrice && onSelectPrice(a.price)}
                  className="relative flex items-center justify-between py-1 px-1.5 rounded cursor-pointer hover:bg-rose-500/15 transition-colors font-mono text-[11px] group"
                  title="Klik untuk mengisi harga di form eksekusi"
                >
                  <div
                    className="absolute inset-y-0 right-0 bg-rose-500/10 rounded transition-all"
                    style={{ width: `${depthPct}%` }}
                  />
                  <span className="relative z-10 font-bold text-rose-400 group-hover:underline">
                    {a.price.toLocaleString('id-ID')}
                  </span>
                  <span className="relative z-10 text-gray-300 text-[10px]">
                    {a.amount.toLocaleString('id-ID', { maximumFractionDigits: 4 })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
