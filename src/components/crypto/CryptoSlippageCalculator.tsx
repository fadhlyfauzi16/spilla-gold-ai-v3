import React, { useState, useEffect } from 'react';
import { Calculator, ShieldAlert, ShieldCheck, AlertTriangle, ArrowRight, Gauge } from 'lucide-react';
import {
  IndodaxDepthData,
  IndodaxMarketPair,
  CryptoLiquiditySlippageEstimate,
} from '../../types/crypto';

interface CryptoSlippageCalculatorProps {
  depth: IndodaxDepthData | null;
  pair: IndodaxMarketPair;
  currentPrice: number;
}

export const CryptoSlippageCalculator: React.FC<CryptoSlippageCalculatorProps> = ({
  depth,
  pair,
  currentPrice,
}) => {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [inputAmount, setInputAmount] = useState<string>('5000000');
  const [unit, setUnit] = useState<'IDR' | 'ASSET'>('IDR');
  const [estimate, setEstimate] = useState<CryptoLiquiditySlippageEstimate | null>(null);

  useEffect(() => {
    const num = parseFloat(inputAmount) || 0;
    if (!depth || num <= 0) {
      setEstimate(null);
      return;
    }

    const orders = side === 'BUY' ? depth.asks : depth.bids;
    const bestPrice = orders.length > 0 ? orders[0].price : currentPrice;

    let remaining = num;
    let accumulatedFilledQty = 0;
    let accumulatedFilledIdr = 0;

    if (side === 'BUY') {
      if (unit === 'IDR') {
        let remainingIdr = num;
        for (const o of orders) {
          if (remainingIdr <= 0) break;
          const orderMaxIdr = o.price * o.amount;
          const fillIdr = Math.min(remainingIdr, orderMaxIdr);
          const fillQty = fillIdr / o.price;
          accumulatedFilledQty += fillQty;
          accumulatedFilledIdr += fillIdr;
          remainingIdr -= fillIdr;
        }
      } else {
        let remainingQty = num;
        for (const o of orders) {
          if (remainingQty <= 0) break;
          const fillQty = Math.min(remainingQty, o.amount);
          const fillIdr = fillQty * o.price;
          accumulatedFilledQty += fillQty;
          accumulatedFilledIdr += fillIdr;
          remainingQty -= fillQty;
        }
      }
    } else {
      // SELL
      if (unit === 'ASSET') {
        let remainingQty = num;
        for (const o of orders) {
          if (remainingQty <= 0) break;
          const fillQty = Math.min(remainingQty, o.amount);
          const fillIdr = fillQty * o.price;
          accumulatedFilledQty += fillQty;
          accumulatedFilledIdr += fillIdr;
          remainingQty -= fillQty;
        }
      } else {
        let remainingIdr = num;
        for (const o of orders) {
          if (remainingIdr <= 0) break;
          const orderMaxIdr = o.price * o.amount;
          const fillIdr = Math.min(remainingIdr, orderMaxIdr);
          const fillQty = fillIdr / o.price;
          accumulatedFilledQty += fillQty;
          accumulatedFilledIdr += fillIdr;
          remainingIdr -= fillIdr;
        }
      }
    }

    const estimatedVwap =
      accumulatedFilledQty > 0 ? accumulatedFilledIdr / accumulatedFilledQty : bestPrice;

    let slippagePercent = 0;
    if (bestPrice > 0 && estimatedVwap > 0) {
      if (side === 'BUY') {
        slippagePercent = ((estimatedVwap - bestPrice) / bestPrice) * 100;
      } else {
        slippagePercent = ((bestPrice - estimatedVwap) / bestPrice) * 100;
      }
    }
    slippagePercent = Math.max(0, slippagePercent);

    const targetVal = unit === 'IDR' ? num : num * bestPrice;
    const coverage = targetVal > 0 ? Math.min(100, (accumulatedFilledIdr / targetVal) * 100) : 0;

    let slippageRiskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' = 'LOW';
    let isSafeToExecute = true;
    let warningMessage: string | undefined;

    if (slippagePercent > 3.0 || coverage < 95) {
      slippageRiskLevel = 'EXTREME';
      isSafeToExecute = false;
      warningMessage = `CRITICAL SLIPPAGE: Dampak harga ${slippagePercent.toFixed(2)}% dengan cakupan likuiditas ${coverage.toFixed(0)}%. Ukuran order melampaui kedalaman order book instan.`;
    } else if (slippagePercent > 1.5) {
      slippageRiskLevel = 'HIGH';
      warningMessage = `HIGH SLIPPAGE: Kedalaman pasar tipis. Estimasi dampak harga ${slippagePercent.toFixed(2)}%.`;
    } else if (slippagePercent > 0.5) {
      slippageRiskLevel = 'MODERATE';
      warningMessage = `MODERATE SLIPPAGE: Dampak harga moderat (${slippagePercent.toFixed(2)}%).`;
    }

    setEstimate({
      pairId: pair.id,
      side,
      inputAmount: num,
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
    });
  }, [depth, side, inputAmount, unit, currentPrice, pair]);

  const quickPresets = [
    { label: 'Rp 1M', value: '1000000', unit: 'IDR' as const },
    { label: 'Rp 5M', value: '5000000', unit: 'IDR' as const },
    { label: 'Rp 25M', value: '25000000', unit: 'IDR' as const },
    { label: 'Rp 100M', value: '100000000', unit: 'IDR' as const },
  ];

  return (
    <div className="bg-[#121620] border border-gray-800 rounded-xl p-5 shadow-xl space-y-4 font-mono">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-800">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#E5B842]/15 border border-[#E5B842]/30 flex items-center justify-center text-[#E5B842]">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-extrabold text-white uppercase tracking-wider">
              SLIPPAGE & VWAP SIMULATOR
            </h2>
            <p className="text-[10px] text-gray-400">Order Book Walk-Through Impact Analysis</p>
          </div>
        </div>

        {estimate && (
          <span
            className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
              estimate.slippageRiskLevel === 'LOW'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : estimate.slippageRiskLevel === 'MODERATE'
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                : estimate.slippageRiskLevel === 'HIGH'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            {estimate.slippageRiskLevel} IMPACT RISK
          </span>
        )}
      </div>

      {/* Input Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Side */}
        <div>
          <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">EXECUTION SIDE</label>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#0B0E14] border border-gray-800 rounded-lg">
            <button
              type="button"
              onClick={() => setSide('BUY')}
              className={`py-1.5 rounded text-xs font-black uppercase transition-all ${
                side === 'BUY'
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              BUY (Ask)
            </button>
            <button
              type="button"
              onClick={() => setSide('SELL')}
              className={`py-1.5 rounded text-xs font-black uppercase transition-all ${
                side === 'SELL'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              SELL (Bid)
            </button>
          </div>
        </div>

        {/* Amount Input */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase mb-1">
            <span>SIMULATED TRADE SIZE</span>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setUnit('IDR')}
                className={`text-[9px] font-black px-2 py-0.5 rounded transition-colors ${
                  unit === 'IDR' ? 'bg-[#E5B842] text-black' : 'text-gray-400 hover:text-white bg-[#0B0E14] border border-gray-800'
                }`}
              >
                IDR
              </button>
              <button
                type="button"
                onClick={() => setUnit('ASSET')}
                className={`text-[9px] font-black px-2 py-0.5 rounded transition-colors ${
                  unit === 'ASSET' ? 'bg-[#E5B842] text-black' : 'text-gray-400 hover:text-white bg-[#0B0E14] border border-gray-800'
                }`}
              >
                {pair.baseCurrency}
              </button>
            </div>
          </div>
          <div className="relative">
            <input
              type="number"
              value={inputAmount}
              onChange={(e) => setInputAmount(e.target.value)}
              placeholder="e.g. 5000000"
              className="w-full bg-[#0B0E14] border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#E5B842] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Preset Chips */}
      <div className="flex items-center space-x-2">
        <span className="text-[9px] text-gray-500 uppercase font-bold">QUICK SIZES:</span>
        {quickPresets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              setUnit(p.unit);
              setInputAmount(p.value);
            }}
            className="px-2.5 py-1 rounded bg-[#0B0E14] hover:bg-gray-800 border border-gray-800 text-[10px] text-gray-300 font-mono transition-colors cursor-pointer"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Results Box */}
      {estimate && (
        <div className="p-3.5 rounded-lg bg-[#0B0E14] border border-gray-800 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {/* Top of Book */}
            <div className="p-2 rounded bg-[#121620] border border-gray-800">
              <div className="text-[9px] text-gray-500 uppercase font-bold">BEST BOOK PRICE</div>
              <div className="text-xs font-bold font-mono text-gray-300 mt-0.5">
                Rp {estimate.bestPrice.toLocaleString('id-ID')}
              </div>
            </div>

            {/* Estimated VWAP */}
            <div className="p-2 rounded bg-[#121620] border border-gray-800">
              <div className="text-[9px] text-gray-500 uppercase font-bold">ESTIMATED VWAP</div>
              <div className="text-xs font-bold font-mono text-[#E5B842] mt-0.5">
                Rp {estimate.estimatedVwap.toLocaleString('id-ID')}
              </div>
            </div>

            {/* Expected Slippage */}
            <div className="p-2 rounded bg-[#121620] border border-gray-800">
              <div className="text-[9px] text-gray-500 uppercase font-bold">EXPECTED SLIPPAGE</div>
              <div
                className={`text-xs font-bold font-mono mt-0.5 ${
                  estimate.estimatedSlippagePercent > 1.5
                    ? 'text-rose-400'
                    : estimate.estimatedSlippagePercent > 0.5
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {estimate.estimatedSlippagePercent.toFixed(2)}%
              </div>
            </div>

            {/* Depth Coverage */}
            <div className="p-2 rounded bg-[#121620] border border-gray-800">
              <div className="text-[9px] text-gray-500 uppercase font-bold">DEPTH COVERAGE</div>
              <div className="text-xs font-bold font-mono text-white mt-0.5">
                {estimate.liquidityCoveragePercent}%
              </div>
            </div>
          </div>

          {/* Warning / Safety Message */}
          {estimate.warningMessage ? (
            <div
              className={`p-2.5 rounded text-[10px] flex items-center space-x-2 ${
                estimate.slippageRiskLevel === 'EXTREME'
                  ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                  : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{estimate.warningMessage}</span>
            </div>
          ) : (
            <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-300 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>
                Kondisi likuiditas optimal. Kedalaman order book mencukupi dengan estimasi slippage minimal.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
