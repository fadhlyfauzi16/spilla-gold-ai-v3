import React, { useState } from 'react';
import {
  Wallet,
  ShieldCheck,
  ShieldAlert,
  Key,
  RefreshCw,
  Eye,
  EyeOff,
  LogOut,
  Zap,
  Activity,
  Layers,
  ArrowUpRight,
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

  const isConnected = !!account?.isConnected;
  const availableIdr = account?.availableIdr || 0;
  const portfolioIdr = account?.totalPortfolioEstimatedIdr || 0;

  const baseSymbol = selectedPair.baseCurrency.toUpperCase();
  const assetBalanceObj = account?.balances?.[baseSymbol];
  const assetAvailable = assetBalanceObj?.available || 0;
  const assetEstimatedIdr = assetBalanceObj?.estimatedIdrValue || 0;

  return (
    <div className="bg-[#121620] border border-[#232B3E] rounded-2xl p-5 shadow-lg relative overflow-hidden">
      {/* Top Banner & Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1F2633]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E5B842]/20 to-[#E5B842]/5 border border-[#E5B842]/30 flex items-center justify-center text-[#E5B842]">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
                INDODAX TRADING WALLET
              </h2>
              {isConnected ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                  CONNECTED
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <ShieldAlert className="w-3 h-3 mr-1" />
                  DISCONNECTED
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 flex items-center space-x-1.5 mt-0.5">
              <span>{account?.userName || 'Direct Institutional Gateway'}</span>
              {account?.maskedApiKey && (
                <>
                  <span>•</span>
                  <span className="font-mono text-gray-400">{account.maskedApiKey}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1C2230] border border-[#232B3E] transition-colors"
            title={showBalance ? 'Hide Balance' : 'Show Balance'}
          >
            {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1C2230] border border-[#232B3E] transition-colors disabled:opacity-50"
            title="Refresh Account Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#E5B842]' : ''}`} />
          </button>

          {isConnected ? (
            <button
              onClick={onDisconnect}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-colors flex items-center space-x-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          ) : (
            <button
              onClick={onOpenConnectModal}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#E5B842] text-black hover:bg-[#d4a733] transition-all flex items-center space-x-1.5 shadow-md shadow-[#E5B842]/10"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Connect INDODAX API</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        {/* Available IDR */}
        <div className="p-3.5 rounded-xl bg-[#0B0E14] border border-[#1F2633]">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Available IDR Balance</span>
            <span className="text-[10px] font-mono text-emerald-400 uppercase">Ready To Trade</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {showBalance
              ? `Rp ${availableIdr.toLocaleString('id-ID')}`
              : '••••••••••'}
          </div>
          <div className="text-[11px] text-gray-500 mt-1 flex items-center space-x-1">
            <span>Instant buying power for {selectedPair.symbol}</span>
          </div>
        </div>

        {/* Selected Asset Balance */}
        <div className="p-3.5 rounded-xl bg-[#0B0E14] border border-[#1F2633]">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>{baseSymbol} Holding</span>
            <span className="text-[10px] font-mono text-[#E5B842] uppercase">Active Asset</span>
          </div>
          <div className="text-xl font-bold font-mono text-[#E5B842]">
            {showBalance
              ? `${assetAvailable.toLocaleString('id-ID', { maximumFractionDigits: 4 })} ${baseSymbol}`
              : '••••••••••'}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">
            {showBalance
              ? `≈ Rp ${assetEstimatedIdr.toLocaleString('id-ID')}`
              : '≈ Rp ••••••••'}
          </div>
        </div>

        {/* Total Estimated Portfolio Value */}
        <div className="p-3.5 rounded-xl bg-[#0B0E14] border border-[#1F2633]">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Total Crypto Portfolio (IDR)</span>
            <div className="flex items-center space-x-1 text-[10px] text-gray-400">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span>{account?.health?.latencyMs ? `${account.health.latencyMs}ms` : 'Active'}</span>
            </div>
          </div>
          <div className="text-xl font-bold font-mono text-gray-200">
            {showBalance
              ? `Rp ${portfolioIdr.toLocaleString('id-ID')}`
              : '••••••••••'}
          </div>
          <div className="text-[11px] text-gray-500 mt-1 flex items-center justify-between">
            <span>Aggregated Holdings</span>
            {account?.lastSyncAt && (
              <span className="text-[10px] text-gray-600">
                Synced {new Date(account.lastSyncAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
