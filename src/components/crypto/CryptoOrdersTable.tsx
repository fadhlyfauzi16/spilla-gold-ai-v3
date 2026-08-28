import React, { useState } from 'react';
import type {
  CryptoOpenOrder,
  CryptoOrderHistoryItem,
  IndodaxMarketPair,
} from '../../types/crypto';

interface CryptoOrdersTableProps {
  openOrders: CryptoOpenOrder[];
  orderHistory: CryptoOrderHistoryItem[];
  pair: IndodaxMarketPair | null;
  isLoading?: boolean;
  onRefresh?: () => void | Promise<void>;
  onCancelOrder?: (
  orderId: string,
  type: 'BUY' | 'SELL',
) => void | Promise<void>;
}

type Tab = 'OPEN' | 'HISTORY';

const formatIdr = (value: number): string => {
  if (!Number.isFinite(value)) return '-';

  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(value);
};

const formatAmount = (value: number): string => {
  if (!Number.isFinite(value)) return '-';

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 8,
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

const formatDate = (value: string): string => {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('id-ID');
};

const SideBadge: React.FC<{ side: 'BUY' | 'SELL' }> = ({ side }) => (
  <span
    className={`inline-flex rounded px-2 py-1 text-[10px] font-bold ${
      side === 'BUY'
        ? 'bg-emerald-500/10 text-emerald-400'
        : 'bg-red-500/10 text-red-400'
    }`}
  >
    {side}
  </span>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const normalized = status.toUpperCase();

  let className = 'bg-white/5 text-gray-300';

  if (normalized === 'FILLED') {
    className = 'bg-emerald-500/10 text-emerald-400';
  } else if (
    normalized === 'REJECTED' ||
    normalized === 'FAILED' ||
    normalized === 'CANCELLED'
  ) {
    className = 'bg-red-500/10 text-red-400';
  } else if (
    normalized === 'SUBMITTED' ||
    normalized === 'PARTIALLY_FILLED' ||
    normalized === 'OPEN'
  ) {
    className = 'bg-yellow-500/10 text-yellow-400';
  }

  return (
    <span
      className={`inline-flex rounded px-2 py-1 text-[10px] font-semibold ${className}`}
    >
      {normalized.replace(/_/g, ' ')}
    </span>
  );
};

export const CryptoOrdersTable: React.FC<CryptoOrdersTableProps> = ({
  openOrders,
  orderHistory,
  pair,
  isLoading = false,
  onRefresh,
  onCancelOrder,
}) => {
  const [tab, setTab] = useState<Tab>('OPEN');
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(
    null,
  );

  const handleCancel = async (order: CryptoOpenOrder) => {
    if (!onCancelOrder || cancellingOrderId) return;

    const confirmed = window.confirm(
      `Cancel ${order.type} order ${order.symbol} at Rp ${formatPrice(
        order.price,
        pair,
      )}?`,
    );

    if (!confirmed) return;

    try {
      setCancellingOrderId(order.orderId);
      await onCancelOrder(order.orderId, order.type);
    } finally {
      setCancellingOrderId(null);
    }
  };

  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">
            INDODAX EXECUTION LEDGER
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            {pair?.symbol ?? 'Crypto'} • Orders & execution history
          </p>
        </div>

        <button
          type="button"
          onClick={() => void onRefresh?.()}
          disabled={isLoading}
          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-gray-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'SYNCING...' : 'REFRESH'}
        </button>
      </div>

      <div className="mb-4 flex gap-2 border-b border-white/10">
        <button
          type="button"
          onClick={() => setTab('OPEN')}
          className={`border-b-2 px-3 py-2 text-xs font-semibold transition ${
            tab === 'OPEN'
              ? 'border-yellow-400 text-yellow-400'
              : 'border-transparent text-gray-500'
          }`}
        >
          OPEN ORDERS ({openOrders.length})
        </button>

        <button
          type="button"
          onClick={() => setTab('HISTORY')}
          className={`border-b-2 px-3 py-2 text-xs font-semibold transition ${
            tab === 'HISTORY'
              ? 'border-yellow-400 text-yellow-400'
              : 'border-transparent text-gray-500'
          }`}
        >
          EXECUTION HISTORY ({orderHistory.length})
        </button>
      </div>

      {tab === 'OPEN' ? (
        <div className="overflow-x-auto">
          {openOrders.length === 0 ? (
            <div className="flex min-h-[150px] items-center justify-center rounded-lg border border-dashed border-white/10">
              <div className="text-center">
                <div className="text-xs font-medium text-gray-400">
                  NO OPEN ORDERS
                </div>
                <div className="mt-1 text-[10px] text-gray-600">
                  Active INDODAX limit orders will appear here.
                </div>
              </div>
            </div>
          ) : (
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase text-gray-500">
                  <th className="px-3 py-3">Time</th>
                  <th className="px-3 py-3">Pair</th>
                  <th className="px-3 py-3">Side</th>
                  <th className="px-3 py-3 text-right">Price</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-3 py-3 text-right">Remaining</th>
                  <th className="px-3 py-3 text-right">Total IDR</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {openOrders.map((order) => (
                  <tr
                    key={order.orderId}
                    className="border-b border-white/5 text-gray-300"
                  >
                    <td className="px-3 py-3 text-gray-500">
                      {formatDate(order.submitTime)}
                    </td>

                    <td className="px-3 py-3 font-medium text-white">
                      {order.symbol}
                    </td>

                    <td className="px-3 py-3">
                      <SideBadge side={order.type} />
                    </td>

                    <td className="px-3 py-3 text-right">
                      Rp {formatPrice(order.price, pair)}
                    </td>

                    <td className="px-3 py-3 text-right">
                      {formatAmount(order.originalAmount)}
                    </td>

                    <td className="px-3 py-3 text-right">
                      {formatAmount(order.remainAmount)}
                    </td>

                    <td className="px-3 py-3 text-right">
                      Rp {formatIdr(order.totalIdr)}
                    </td>

                    <td className="px-3 py-3">
                      <StatusBadge status={order.status} />
                    </td>

                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void handleCancel(order)}
                        disabled={
                          !onCancelOrder ||
                          cancellingOrderId === order.orderId
                        }
                        className="rounded border border-red-500/20 px-3 py-1.5 text-[10px] font-semibold text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {cancellingOrderId === order.orderId
                          ? 'CANCELLING...'
                          : 'CANCEL'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          {orderHistory.length === 0 ? (
            <div className="flex min-h-[150px] items-center justify-center rounded-lg border border-dashed border-white/10">
              <div className="text-center">
                <div className="text-xs font-medium text-gray-400">
                  NO EXECUTION HISTORY
                </div>
                <div className="mt-1 text-[10px] text-gray-600">
                  Completed or rejected orders will appear here.
                </div>
              </div>
            </div>
          ) : (
            <table className="w-full min-w-[1050px] text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase text-gray-500">
                  <th className="px-3 py-3">Time</th>
                  <th className="px-3 py-3">Pair</th>
                  <th className="px-3 py-3">Side</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3 text-right">Price</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-3 py-3 text-right">Filled</th>
                  <th className="px-3 py-3 text-right">Fill Price</th>
                  <th className="px-3 py-3 text-right">Total IDR</th>
                  <th className="px-3 py-3 text-right">Slippage</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {orderHistory.map((order) => (
                  <React.Fragment key={order.id}>
                    <tr className="border-b border-white/5 text-gray-300">
                      <td className="px-3 py-3 text-gray-500">
                        {formatDate(order.createdAt)}
                      </td>

                      <td className="px-3 py-3 font-medium text-white">
                        {order.pair}
                      </td>

                      <td className="px-3 py-3">
                        <SideBadge side={order.type} />
                      </td>

                      <td className="px-3 py-3">{order.orderType}</td>

                      <td className="px-3 py-3 text-right">
                        Rp {formatPrice(order.price, pair)}
                      </td>

                      <td className="px-3 py-3 text-right">
                        {formatAmount(order.amount)}
                      </td>

                      <td className="px-3 py-3 text-right">
                        {formatAmount(order.filledAmount)}
                      </td>

                      <td className="px-3 py-3 text-right">
                        {order.filledPrice !== undefined
                          ? `Rp ${formatPrice(order.filledPrice, pair)}`
                          : '-'}
                      </td>

                      <td className="px-3 py-3 text-right">
                        Rp {formatIdr(order.totalIdr)}
                      </td>

                      <td className="px-3 py-3 text-right">
                        {order.estimatedSlippagePercent !== undefined
                          ? `${order.estimatedSlippagePercent.toFixed(3)}%`
                          : '-'}
                      </td>

                      <td className="px-3 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>

                    {order.errorMessage && (
                      <tr className="border-b border-red-500/10">
                        <td
                          colSpan={11}
                          className="px-3 py-2 text-[10px] text-red-400"
                        >
                          {order.errorMessage}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
};