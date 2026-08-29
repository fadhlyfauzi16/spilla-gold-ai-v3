import React, { useState, useEffect } from 'react';
import {
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Lock,
  ArrowRight,
  Info,
  DollarSign,
  AlertCircle,
  Zap,
} from 'lucide-react';
import {
  IndodaxMarketPair,
  IndodaxUserAccountInfo,
  IndodaxDepthData,
  CryptoOrderResult,
  CryptoOrderExecutionPayload,
  CryptoLiquiditySlippageEstimate,
} from '../../types/crypto';

interface CryptoOrderExecutionPanelProps {
  pair: IndodaxMarketPair;
  account: IndodaxUserAccountInfo | null;
  depth: IndodaxDepthData | null;
  currentPrice: number;
  authToken?: string | null;
  onOrderExecuted: () => void;
  onOpenConnectModal: () => void;
  initialPrice?: number;
}

export const CryptoOrderExecutionPanel: React.FC<CryptoOrderExecutionPanelProps> = ({
  pair,
  account,
  depth,
  currentPrice,
  authToken,
  onOrderExecuted,
  onOpenConnectModal,
  initialPrice,
}) => {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'LIMIT' | 'MARKET'>('LIMIT');
  const [priceInput, setPriceInput] = useState<string>(String(currentPrice || 100));
  const [amountIdrInput, setAmountIdrInput] = useState<string>('');
  const [amountAssetInput, setAmountAssetInput] = useState<string>('');
  const [selectedAllocation, setSelectedAllocation] = useState<number | null>(null);
  const [maxSlippagePercent, setMaxSlippagePercent] = useState<number>(2.0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [executionResult, setExecutionResult] = useState<CryptoOrderResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isConnected = Boolean(account?.isConnected);
  const availableIdr = account?.availableIdr || 0;
  const baseCurrency = pair.baseCurrency.toUpperCase();
  const availableAsset = account?.balances?.[baseCurrency]?.available || 0;

  // Sync initial price if requested
  useEffect(() => {
    if (initialPrice && initialPrice > 0) {
      setPriceInput(String(Math.round(initialPrice)));
    } else if (currentPrice > 0 && (!priceInput || priceInput === '0')) {
      setPriceInput(String(Math.round(currentPrice)));
    }
  }, [initialPrice, currentPrice]);

  const targetPrice = parseFloat(priceInput) || currentPrice || 1;

  // Sync IDR <-> Asset amounts
  const handleAmountIdrChange = (val: string) => {
    setAmountIdrInput(val);
    setSelectedAllocation(null);
    const num = parseFloat(val);
    if (!isNaN(num) && targetPrice > 0) {
      setAmountAssetInput((num / targetPrice).toFixed(4));
    } else {
      setAmountAssetInput('');
    }
  };

  const handleAmountAssetChange = (val: string) => {
    setAmountAssetInput(val);
    setSelectedAllocation(null);
    const num = parseFloat(val);
    if (!isNaN(num) && targetPrice > 0) {
      setAmountIdrInput(Math.round(num * targetPrice).toString());
    } else {
      setAmountIdrInput('');
    }
  };

  const applyAllocation = (pct: number) => {
    setSelectedAllocation(pct);
    if (side === 'BUY') {
      const targetIdr = Math.round((availableIdr * pct) / 100);
      setAmountIdrInput(targetIdr.toString());
      if (targetPrice > 0) {
        setAmountAssetInput((targetIdr / targetPrice).toFixed(4));
      }
    } else {
      const targetAsset = (availableAsset * pct) / 100;
      setAmountAssetInput(targetAsset.toFixed(4));
      if (targetPrice > 0) {
        setAmountIdrInput(Math.round(targetAsset * targetPrice).toString());
      }
    }
  };

  const totalIdr = parseFloat(amountIdrInput) || 0;
  const totalAsset = parseFloat(amountAssetInput) || 0;

  const handleOpenConfirm = () => {
    setErrorMsg(null);
    setExecutionResult(null);

    if (!isConnected) {
      onOpenConnectModal();
      return;
    }

    if (totalIdr < pair.minTotalIdr) {
      setErrorMsg(
        `Minimal nilai order INDODAX adalah Rp ${pair.minTotalIdr.toLocaleString('id-ID')}.`
      );
      return;
    }

    if (side === 'BUY' && totalIdr > availableIdr) {
      setErrorMsg(`Saldo IDR tidak mencukupi (Tersedia: Rp ${availableIdr.toLocaleString('id-ID')}).`);
      return;
    }

    if (side === 'SELL' && totalAsset > availableAsset) {
      setErrorMsg(
        `Saldo ${baseCurrency} tidak mencukupi (Tersedia: ${availableAsset.toLocaleString('id-ID', { maximumFractionDigits: 4 })}).`
      );
      return;
    }

    setShowConfirmModal(true);
  };

  const handleExecute = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    setExecutionResult(null);

    const idempotencyKey = `exec-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    const payload: CryptoOrderExecutionPayload = {
      pairId: pair.id,
      symbol: pair.symbol,
      type: side,
      orderType,
      price: targetPrice,
      amountIdr: totalIdr,
      amountAsset: totalAsset,
      maxSlippagePercent,
      idempotencyKey,
    };

    try {
      const res = await fetch('/api/crypto/orders/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data: CryptoOrderResult = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Order submission ditolak oleh INDODAX API.');
      }

      setExecutionResult(data);
      setShowConfirmModal(false);
      onOrderExecuted();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengeksekusi order pada INDODAX API.');
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#121620] border border-gray-800 rounded-xl p-5 shadow-xl space-y-4 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-800">
        <div className="flex items-center space-x-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
              side === 'BUY'
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                : 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
            }`}
          >
            {side}
          </div>
          <div>
            <h2 className="text-xs font-extrabold text-white uppercase tracking-wider">
              INDODAX SPOT ORDER ROUTER
            </h2>
            <p className="text-[10px] text-gray-400">Institutional Direct Execution Gateway</p>
          </div>
        </div>

        {/* Limit / Market Switch */}
        <div className="flex items-center space-x-1 p-0.5 bg-[#0B0E14] border border-gray-800 rounded-lg">
          <button
            type="button"
            onClick={() => setOrderType('LIMIT')}
            className={`px-2.5 py-1 rounded text-[10px] font-black uppercase transition-all ${
              orderType === 'LIMIT' ? 'bg-[#E5B842] text-black shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            Limit
          </button>
          <button
            type="button"
            onClick={() => {
              setOrderType('MARKET');
              setPriceInput(String(Math.round(currentPrice)));
            }}
            className={`px-2.5 py-1 rounded text-[10px] font-black uppercase transition-all ${
              orderType === 'MARKET' ? 'bg-[#E5B842] text-black shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            Market
          </button>
        </div>
      </div>

      {/* Side Tabs (BUY / SELL) */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-[#0B0E14] border border-gray-800 rounded-lg">
        <button
          type="button"
          onClick={() => setSide('BUY')}
          className={`py-2 rounded text-xs font-black uppercase transition-all cursor-pointer ${
            side === 'BUY'
              ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          BUY {baseCurrency}
        </button>
        <button
          type="button"
          onClick={() => setSide('SELL')}
          className={`py-2 rounded text-xs font-black uppercase transition-all cursor-pointer ${
            side === 'SELL'
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          SELL {baseCurrency}
        </button>
      </div>

      {/* Balance Indicator */}
      <div className="flex items-center justify-between text-[10px] text-gray-400 px-1 font-bold">
        <span>TERSEDIA:</span>
        <span className="font-mono text-white">
          {side === 'BUY'
            ? `Rp ${availableIdr.toLocaleString('id-ID')}`
            : `${availableAsset.toLocaleString('id-ID', { maximumFractionDigits: 4 })} ${baseCurrency}`}
        </span>
      </div>

      {/* Price Input */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase">
          <span>HARGA ORDER (IDR)</span>
          <div className="flex items-center space-x-2">
            {depth?.asks && depth.asks[0] && (
              <button
                type="button"
                onClick={() => setPriceInput(String(depth.asks[0].price))}
                className="text-[9px] text-emerald-400 hover:underline"
              >
                Ask: {depth.asks[0].price.toLocaleString('id-ID')}
              </button>
            )}
            {depth?.bids && depth.bids[0] && (
              <button
                type="button"
                onClick={() => setPriceInput(String(depth.bids[0].price))}
                className="text-[9px] text-rose-400 hover:underline"
              >
                Bid: {depth.bids[0].price.toLocaleString('id-ID')}
              </button>
            )}
          </div>
        </div>
        <div className="relative">
          <input
            type="number"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            disabled={orderType === 'MARKET'}
            className="w-full bg-[#0B0E14] border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#E5B842] transition-colors disabled:opacity-50"
          />
        </div>
      </div>

      {/* Amount in IDR */}
      <div className="space-y-1">
        <label className="block text-[10px] text-gray-400 font-bold uppercase">
          NILAI TOTAL ORDER (IDR)
        </label>
        <div className="relative">
          <input
            type="number"
            value={amountIdrInput}
            onChange={(e) => handleAmountIdrChange(e.target.value)}
            placeholder={`Min. Rp ${pair.minTotalIdr.toLocaleString('id-ID')}`}
            className="w-full bg-[#0B0E14] border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#E5B842] transition-colors"
          />
        </div>
      </div>

      {/* Amount in Asset */}
      <div className="space-y-1">
        <label className="block text-[10px] text-gray-400 font-bold uppercase">
          JUMLAH KUANTITAS ({baseCurrency})
        </label>
        <div className="relative">
          <input
            type="number"
            value={amountAssetInput}
            onChange={(e) => handleAmountAssetChange(e.target.value)}
            placeholder="0.0000"
            className="w-full bg-[#0B0E14] border border-gray-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#E5B842] transition-colors"
          />
        </div>
      </div>

      {/* Quick Allocation Percent Buttons */}
      <div className="grid grid-cols-5 gap-1.5 pt-1">
        {[5, 10, 25, 50, 100].map((pct) => (
          <button
            key={pct}
            type="button"
            onClick={() => applyAllocation(pct)}
            className={`py-1.5 rounded text-[10px] font-black font-mono transition-all border cursor-pointer ${
              selectedAllocation === pct
                ? 'bg-[#E5B842] text-black border-[#E5B842] shadow-md shadow-[#E5B842]/20'
                : 'bg-[#0B0E14] text-gray-300 border-gray-800 hover:bg-gray-800'
            }`}
          >
            {pct === 100 ? 'MAX' : `${pct}%`}
          </button>
        ))}
      </div>

      {/* Slippage Guard Settings */}
      <div className="p-3 rounded-lg bg-[#0B0E14] border border-gray-800 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase">
          <div className="flex items-center space-x-1">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>SLIPPAGE GUARD PROTECTION</span>
          </div>
          <span className="text-emerald-400 font-mono font-bold">{maxSlippagePercent}% MAX</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {[0.5, 1.0, 2.0, 3.0].map((tol) => (
            <button
              key={tol}
              type="button"
              onClick={() => setMaxSlippagePercent(tol)}
              className={`py-1 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                maxSlippagePercent === tol
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                  : 'bg-[#121620] text-gray-400 hover:text-white border border-gray-800'
              }`}
            >
              {tol}%
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start space-x-2 text-xs text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Success Notification */}
      {executionResult && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-1 text-xs text-emerald-300">
          <div className="flex items-center space-x-2 font-bold text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>{executionResult.message}</span>
          </div>
          {executionResult.indodaxOrderId && (
            <div className="text-[10px] text-gray-300 font-mono">
              INDODAX Order ID: #{executionResult.indodaxOrderId}
            </div>
          )}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="button"
        onClick={handleOpenConfirm}
        disabled={isSubmitting}
        className={`w-full py-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50 cursor-pointer active:scale-95 ${
          !isConnected
            ? 'bg-[#E5B842] text-black hover:bg-[#d4a733] shadow-[#E5B842]/20'
            : side === 'BUY'
            ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20'
            : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
        }`}
      >
        {!isConnected ? (
          <>
            <Lock className="w-4 h-4" />
            <span>HUBUNGKAN INDODAX API UNTUK EKSEKUSI</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            <span>
              {side} {totalAsset > 0 ? `${totalAsset} ${baseCurrency}` : pair.symbol}
            </span>
          </>
        )}
      </button>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono">
          <div className="bg-[#121620] border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center space-x-3 pb-3 border-b border-gray-800">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                  side === 'BUY' ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white'
                }`}
              >
                {side}
              </div>
              <div>
                <h4 className="text-sm font-black text-white uppercase">KONFIRMASI EKSEKUSI INDODAX</h4>
                <p className="text-[10px] text-gray-400 font-sans">Institutional Direct Spot Order</p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#0B0E14] border border-gray-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Market Pair</span>
                <span className="font-bold text-white font-mono">{pair.symbol}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Action Side</span>
                <span className={`font-bold ${side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {side}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Harga Order</span>
                <span className="font-mono text-white font-bold">
                  Rp {targetPrice.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Kuantitas</span>
                <span className="font-mono text-[#E5B842] font-bold">
                  {totalAsset} {baseCurrency}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                <span className="text-gray-300 font-semibold">Total Nilai Order</span>
                <span className="font-mono text-white font-extrabold text-sm">
                  Rp {totalIdr.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-300 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Slippage Guard aktif (Toleransi batas: {maxSlippagePercent}%).</span>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecute}
                disabled={isSubmitting}
                className={`px-5 py-2.5 rounded-lg text-xs font-black transition-all flex items-center space-x-2 cursor-pointer ${
                  side === 'BUY'
                    ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                    : 'bg-rose-500 text-white hover:bg-rose-400'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Mentransmisikan ke INDODAX...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>OTORISASI & EKSEKUSI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
