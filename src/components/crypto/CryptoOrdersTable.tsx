import React, { useState } from 'react';
import {
  History,
  ListOrdered,
  XCircle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  ExternalLink,
} from 'lucide-react';
import {
  CryptoOpenOrder,
  CryptoOrderHistoryItem,
  IndodaxMarketPair,
} from '../../types/crypto';

interface CryptoOrdersTableProps {
  openOrders: CryptoOpenOrder[];
  orderHistory: CryptoOrderHistoryItem[];
  pair: IndodaxMarketPair;
  isLoading: boolean;
  onRefresh: () => void;
  onCancelOrder: (orderId: string, type: 'BUY' | 'SELL') => Promise<void>;
}

export const CryptoOrdersTable: React.FC<CryptoOrdersTableProps> = ({
  openOrders,
  orderHistory,
  pair,
  isLoading,
  onRefresh,
  onCancelOrder,
}) => {
  const [activeTab, setActiveTab] = useState<'OPEN' | 'HISTORY'>('OPEN');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancel = async (orderId: string, type: 'BUY' | 'SELL') => {
    setCancellingId(orderId);
    try {
      await onCancelOrder(orderId, type);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="bg-[#121620] border border-gray-800 rounded-xl p-5 shadow-xl space-y-4 font-mono">
      {/* Header & Tabs */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('OPEN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'OPEN'
                ? 'bg-[#E5B842] text-black shadow-md shadow-[#E5B842]/20'
                : 'text-gray-400 hover:text-white bg-[#0B0E14] border border-gray-800'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            <span>OPEN ORDERS ({openOrders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all flex items-center space-x-2 cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'bg-[#E5B842] text-black shadow-md shadow-[#E5B842]/20'
                : 'text-gray-400 hover:text-white bg-[#0B0E14] border border-gray-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>EXECUTION LEDGER</span>
          </button>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-700/80 transition-colors disabled:opacity-50 cursor-pointer"
          title="Refresh Orders"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#E5B842]' : ''}`} />
        </button>
      </div>

      {/* Tables */}
      <div className="overflow-x-auto">
        {activeTab === 'OPEN' ? (
          openOrders.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500 space-y-1">
              <Clock className="w-6 h-6 text-gray-600 mx-auto mb-2" />
              <p className="font-bold text-gray-400 uppercase">TIDAK ADA OPEN ORDER AKTIF DI INDODAX</p>
              <p className="text-[10px] text-gray-600 font-sans">Order limit baru akan tampil di sini hingga terisi penuh (filled).</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800 text-[10px] uppercase font-bold">
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Pair</th>
                  <th className="py-2.5 px-3">Side</th>
                  <th className="py-2.5 px-3">Harga (IDR)</th>
                  <th className="py-2.5 px-3">Jumlah</th>
                  <th className="py-2.5 px-3">Total (IDR)</th>
                  <th className="py-2.5 px-3">Waktu</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80 font-mono">
                {openOrders.map((ord) => (
                  <tr key={ord.indodaxOrderId} className="hover:bg-[#0B0E14] transition-colors">
                    <td className="py-2.5 px-3 text-gray-300 font-bold">#{ord.indodaxOrderId}</td>
                    <td className="py-2.5 px-3 text-white font-semibold">{ord.symbol}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          ord.type === 'BUY'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {ord.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-white font-bold">Rp {ord.price.toLocaleString('id-ID')}</td>
                    <td className="py-2.5 px-3 text-gray-300">
                      {ord.remainAmount.toLocaleString('id-ID', { maximumFractionDigits: 4 })}
                    </td>
                    <td className="py-2.5 px-3 text-[#E5B842] font-bold">
                      Rp {ord.totalIdr.toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 text-gray-500 text-[10px]">
                      {new Date(ord.submitTime).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleCancel(ord.indodaxOrderId, ord.type)}
                        disabled={cancellingId === ord.indodaxOrderId}
                        className="px-2.5 py-1 rounded text-[10px] font-black uppercase text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {cancellingId === ord.indodaxOrderId ? 'Cancelling...' : 'Cancel'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : orderHistory.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500 space-y-1">
            <History className="w-6 h-6 text-gray-600 mx-auto mb-2" />
            <p className="font-bold text-gray-400 uppercase">BELUM ADA LOG RIWAYAT EKSEKUSI</p>
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800 text-[10px] uppercase font-bold">
                <th className="py-2.5 px-3">Waktu</th>
                <th className="py-2.5 px-3">Pair</th>
                <th className="py-2.5 px-3">Side</th>
                <th className="py-2.5 px-3">Harga</th>
                <th className="py-2.5 px-3">Jumlah</th>
                <th className="py-2.5 px-3">Total Nilai</th>
                <th className="py-2.5 px-3">Slippage</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/80 font-mono">
              {orderHistory.map((item) => (
                <tr key={item.id} className="hover:bg-[#0B0E14] transition-colors">
                  <td className="py-2.5 px-3 text-gray-500 text-[10px]">
                    {new Date(item.createdAt).toLocaleString('id-ID', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-2.5 px-3 text-white font-semibold">{item.pair}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        item.type === 'BUY'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {item.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-gray-300 font-bold">
                    Rp {item.price.toLocaleString('id-ID')}
                  </td>
                  <td className="py-2.5 px-3 text-gray-300">
                    {item.amount.toLocaleString('id-ID', { maximumFractionDigits: 4 })}
                  </td>
                  <td className="py-2.5 px-3 text-[#E5B842] font-bold">
                    Rp {item.totalIdr.toLocaleString('id-ID')}
                  </td>
                  <td className="py-2.5 px-3 text-gray-400">
                    {item.estimatedSlippagePercent !== undefined
                      ? `${item.estimatedSlippagePercent.toFixed(2)}%`
                      : '0.00%'}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        item.status === 'FILLED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : item.status === 'SUBMITTED'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                          : item.status === 'CANCELLED'
                          ? 'bg-gray-800 text-gray-400 border border-gray-700'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
