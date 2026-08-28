import React, { useMemo } from 'react';
import type {
  IndodaxDepthData,
  IndodaxMarketPair,
  IndodaxDepthOrder,
} from '../../types/crypto';

interface CryptoOrderBookDepthProps {
  depth: IndodaxDepthData | null;
  pair: IndodaxMarketPair | null;
  onSelectPrice?: (price: number) => void;
}

const formatIdr = (value: number): string => {
  if (!Number.isFinite(value)) return '-';

  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(value);
};

const formatAmount = (value: number, decimals = 8): string => {
  if (!Number.isFinite(value)) return '-';

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: decimals,
  }).format(value);
};

const formatPrice = (
  value: number,
  pair: IndodaxMarketPair | null,
): string => {
  if (!Number.isFinite(value)) return '-';

  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: pair?.priceScale ?? 0,
    maximumFractionDigits: pair?.priceScale ?? 0,
  }).format(value);
};

const DepthRows: React.FC<{
  orders: IndodaxDepthOrder[];
  side: 'BID' | 'ASK';
  pair: IndodaxMarketPair | null;
  maxTotal: number;
  onSelectPrice?: (price: number) => void;
}> = ({ orders, side, pair, maxTotal, onSelectPrice }) => {
  if (!orders.length) {
    return (
      <div className="py-6 text-center text-xs text-gray-500">
        NO {side} LIQUIDITY
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {orders.slice(0, 12).map((order, index) => {
        const width =
          maxTotal > 0
            ? Math.min(100, Math.max(2, (order.totalIdr / maxTotal) * 100))
            : 0;

        return (
          <button
            key={`${side}-${order.price}-${index}`}
            type="button"
            onClick={() => onSelectPrice?.(order.price)}
            className="relative grid w-full grid-cols-3 overflow-hidden rounded px-2 py-1.5 text-left text-xs transition hover:bg-white/5"
            title={`Use ${side.toLowerCase()} price ${formatPrice(
              order.price,
              pair,
            )}`}
          >
            <div
              className={`absolute inset-y-0 ${
                side === 'BID' ? 'left-0' : 'right-0'
              } ${
                side === 'BID' ? 'bg-emerald-500/10' : 'bg-red-500/10'
              }`}
              style={{ width: `${width}%` }}
            />

            <span
              className={`relative z-10 font-medium ${
                side === 'BID' ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {formatPrice(order.price, pair)}
            </span>

            <span className="relative z-10 text-right text-gray-300">
              {formatAmount(order.amount)}
            </span>

            <span className="relative z-10 text-right text-gray-400">
              Rp {formatIdr(order.totalIdr)}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export const CryptoOrderBookDepth: React.FC<
  CryptoOrderBookDepthProps
> = ({ depth, pair, onSelectPrice }) => {
  const maxOrderTotal = useMemo(() => {
    if (!depth) return 0;

    return Math.max(
      0,
      ...depth.bids.map((item) => item.totalIdr),
      ...depth.asks.map((item) => item.totalIdr),
    );
  }, [depth]);

  if (!depth) {
    return (
      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-white">
            ORDER BOOK & LIQUIDITY DEPTH
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Waiting for live INDODAX market depth.
          </p>
        </div>

        <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed border-white/10">
          <span className="text-xs font-medium tracking-wider text-gray-500">
            MARKET DATA UNAVAILABLE
          </span>
        </div>
      </section>
    );
  }

  const imbalance = depth.orderBookImbalancePercent;
  const imbalanceText =
    imbalance > 5
      ? 'BUY PRESSURE'
      : imbalance < -5
        ? 'SELL PRESSURE'
        : 'BALANCED';

  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">
            ORDER BOOK & LIQUIDITY DEPTH
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            {pair?.symbol ?? depth.symbol} • Live INDODAX Depth
          </p>
        </div>

        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-gray-500">
            Liquidity
          </div>
          <div className="text-xs font-semibold text-yellow-400">
            {depth.liquidityConcentration}
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <div className="text-[10px] uppercase text-gray-500">
            Buy Pressure
          </div>
          <div className="mt-1 text-sm font-semibold text-emerald-400">
            {depth.buyPressureRatio.toFixed(1)}%
          </div>
        </div>

        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <div className="text-[10px] uppercase text-gray-500">
            Sell Pressure
          </div>
          <div className="mt-1 text-sm font-semibold text-red-400">
            {depth.sellPressureRatio.toFixed(1)}%
          </div>
        </div>

        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <div className="text-[10px] uppercase text-gray-500">
            Imbalance
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            {imbalance.toFixed(1)}%
          </div>
        </div>

        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <div className="text-[10px] uppercase text-gray-500">
            Order Flow
          </div>
          <div className="mt-1 text-sm font-semibold text-yellow-400">
            {imbalanceText}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-1 flex justify-between text-[10px]">
          <span className="text-emerald-400">
            BUY {depth.buyPressureRatio.toFixed(1)}%
          </span>
          <span className="text-red-400">
            SELL {depth.sellPressureRatio.toFixed(1)}%
          </span>
        </div>

        <div className="flex h-2 overflow-hidden rounded-full bg-white/5">
          <div
            className="bg-emerald-500"
            style={{ width: `${depth.buyPressureRatio}%` }}
          />
          <div
            className="bg-red-500"
            style={{ width: `${depth.sellPressureRatio}%` }}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 grid grid-cols-3 px-2 text-[10px] uppercase text-gray-500">
            <span>Bid Price</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Total IDR</span>
          </div>

          <DepthRows
            orders={depth.bids}
            side="BID"
            pair={pair}
            maxTotal={maxOrderTotal}
            onSelectPrice={onSelectPrice}
          />

          <div className="mt-2 text-[10px] text-gray-500">
            Total Bid Depth: Rp {formatIdr(depth.totalBidDepthIdr)}
          </div>
        </div>

        <div>
          <div className="mb-2 grid grid-cols-3 px-2 text-[10px] uppercase text-gray-500">
            <span>Ask Price</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Total IDR</span>
          </div>

          <DepthRows
            orders={depth.asks}
            side="ASK"
            pair={pair}
            maxTotal={maxOrderTotal}
            onSelectPrice={onSelectPrice}
          />

          <div className="mt-2 text-[10px] text-gray-500">
            Total Ask Depth: Rp {formatIdr(depth.totalAskDepthIdr)}
          </div>
        </div>
      </div>

      <div className="mt-4 text-right text-[10px] text-gray-600">
        Updated {new Date(depth.updatedAt).toLocaleTimeString('id-ID')}
      </div>
    </section>
  );
};