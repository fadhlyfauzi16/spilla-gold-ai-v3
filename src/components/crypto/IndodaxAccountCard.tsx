import React, { useState } from 'react';
import {
  Link2,
  Key,
  Cpu,
  RefreshCw,
  Eye,
  EyeOff,
  LogOut,
  Wallet,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { IndodaxUserAccountInfo, IndodaxMarketPair } from '../../types/crypto';

interface IndodaxAccountCardProps {
  account: IndodaxUserAccountInfo | null;
  selectedPair: IndodaxMarketPair;
  isLoading: boolean;
  onRefresh: () => void;
  onOpenConnectModal: () => void;
  onDisconnect: () => void;
}

export const IndodaxAccountCard: React.FC<IndodaxAccountCardProps> = ({
  account,
  selectedPair,
  isLoading,
  onRefresh,
  onOpenConnectModal,
  onDisconnect,
}) => {
  const [showBalance, setShowBalance] = useState(true);

  const isConnected = Boolean(account?.isConnected);
  const availableIdr = account?.availableIdr || 0;
  const portfolioIdr = account?.totalPortfolioEstimatedIdr || 0;

  const baseSymbol = selectedPair.baseCurrency.toUpperCase();
  const assetBalanceObj = account?.balances?.[baseSymbol];
  const assetAvailable = assetBalanceObj?.available || 0;
  const assetEstimatedIdr = assetBalanceObj?.estimatedIdrValue || 0;

  // 1. STATE: NOT CONNECTED (Exact match to Mt5AccountStatusWidget not connected state)
  if (!isConnected && !isLoading) {
    return (
      <div className="bg-[#121620] border border-gray-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg font-mono">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gray-800/80 border border-gray-700 flex items-center justify-center text-gray-400 shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-white uppercase tracking-wider">
                INDODAX TRADING ACCOUNT
              </span>
              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-gray-800 text-gray-400 border border-gray-700">
                NOT CONNECTED
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-sans mt-0.5">
              Hubungkan API Key INDODAX Anda untuk eksekusi spot langsung, pembacaan saldo, dan telemetri order flow.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenConnectModal}
          className="px-4 py-2 rounded-lg bg-[#E5B842] hover:bg-[#d4a737] active:scale-95 text-black font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#E5B842]/10 shrink-0"
        >
          <Key className="w-3.5 h-3.5" />
          <span>CONNECT INDODAX API</span>
        </button>
      </div>
    );
  }

  // 2. STATE: CONNECTED (Exact match to Mt5AccountStatusWidget connected layout & theme)
  return (
    <div className="rounded-xl border transition-all p-4 shadow-xl font-mono bg-gradient-to-r from-[#121620] to-[#0d1e18] border-emerald-500/40 shadow-emerald-950/20 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800/80 pb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 shadow-md shadow-emerald-500/20 shrink-0">
            <Cpu className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-white tracking-wide uppercase">
                INDODAX SPOT GATEWAY CONNECTED
              </span>
              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                ONLINE • LIVE SPOT
              </span>
            </div>
            <div className="text-[10px] text-gray-400 flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-gray-300 font-bold">{account?.userName || 'Direct Institutional Gateway'}</span>
              {account?.maskedApiKey && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="font-mono text-gray-400">{account.maskedApiKey}</span>
                </>
              )}
              <span className="text-gray-600">•</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                AES-256 VAULT PROTECTED
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-700/80 transition-colors"
            title={showBalance ? 'Sembunyikan Saldo' : 'Tampilkan Saldo'}
          >
            {showBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-700/80 transition-colors disabled:opacity-50"
            title="Refresh Saldo & Status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#E5B842]' : ''}`} />
          </button>
          <button
            onClick={onDisconnect}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <LogOut className="w-3 h-3" />
            <span>DISCONNECT</span>
          </button>
        </div>
      </div>

      {/* Account Balances Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Available IDR */}
        <div className="bg-[#0B0E14] p-3 rounded-lg border border-gray-800 space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-400 uppercase font-bold">SALDO IDR SIAP TRADING</span>
            <span className="text-emerald-400 font-bold text-[9px] uppercase">READY TO BUY</span>
          </div>
          <div className="text-sm sm:text-base font-black font-mono text-white">
            {showBalance ? `Rp ${availableIdr.toLocaleString('id-ID')}` : '••••••••••'}
          </div>
          <div className="text-[9px] text-gray-500">Buying power aktif untuk {selectedPair.symbol}</div>
        </div>

        {/* Selected Asset Holding */}
        <div className="bg-[#0B0E14] p-3 rounded-lg border border-gray-800 space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-400 uppercase font-bold">{baseSymbol} HOLDING</span>
            <span className="text-[#E5B842] font-bold text-[9px] uppercase">ACTIVE ASSET</span>
          </div>
          <div className="text-sm sm:text-base font-black font-mono text-[#E5B842]">
            {showBalance
              ? `${assetAvailable.toLocaleString('id-ID', { maximumFractionDigits: 4 })} ${baseSymbol}`
              : '••••••••••'}
          </div>
          <div className="text-[9px] text-gray-500">
            {showBalance && assetEstimatedIdr > 0 ? `≈ Rp ${assetEstimatedIdr.toLocaleString('id-ID')}` : 'Spot inventory'}
          </div>
        </div>

        {/* Total Estimated Portfolio */}
        <div className="bg-[#0B0E14] p-3 rounded-lg border border-gray-800 space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-400 uppercase font-bold">ESTIMASI TOTAL PORTFOLIO</span>
            <span className="text-blue-400 font-bold text-[9px] uppercase">INDODAX VAULT</span>
          </div>
          <div className="text-sm sm:text-base font-black font-mono text-emerald-400">
            {showBalance ? `Rp ${portfolioIdr.toLocaleString('id-ID')}` : '••••••••••'}
          </div>
          <div className="text-[9px] text-gray-500">Total IDR + Semua Crypto Holdings</div>
        </div>
      </div>
    </div>
  );
};
