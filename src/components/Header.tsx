import React, { useState, useEffect } from 'react';
import { RefreshCw, Clock, Bell, Settings, ShieldCheck, User, ShieldAlert, LogOut, Bot, Sparkles, Coins, PlusCircle } from 'lucide-react';
import { MarketPrice, AuthUser } from '../types';
import { normalizeCentPrice, formatSymbolLabel } from '../utils/priceUtils';
import spillaLogo from '../assets/images/spilla_gold_logo_1786418245382.jpg';

interface HeaderProps {
  marketPrice: MarketPrice | null;
  lastUpdated: string;
  onRefresh: () => void;
  isRefreshing: boolean;
  onNavigateTo?: (tab: string) => void;
  currentUser?: AuthUser | null;
  onNavigateToAdmin?: () => void;
  onLogout?: () => void;
  onOpenAssistant?: () => void;
  creditBalance?: number;
  onOpenCreditWallet?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  marketPrice,
  lastUpdated,
  onRefresh,
  isRefreshing,
  onNavigateTo,
  currentUser,
  onNavigateToAdmin,
  onLogout,
  onOpenAssistant,
  creditBalance = 0,
  onOpenCreditWallet,
}) => {
  const [utcTime, setUtcTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().replace('GMT', 'UTC').split(' ').slice(4, 5)[0]);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isPositive = (marketPrice?.change24h || 0) >= 0;
  const session = marketPrice?.session || 'LONDON_NY_OVERLAP';

  return (
    <header className="bg-[#0F1115] border-b border-gray-800/90 px-3 md:px-6 py-2 sticky top-0 z-50 shadow-md font-mono">
      {/* DESKTOP HEADER (md and above) - EXACTLY PRESERVED */}
      <div className="hidden md:flex items-center justify-between w-full">
        {/* Brand Logo & Name */}
        <div className="flex items-center space-x-3">
          <img
            src={spillaLogo}
            alt="SPILLA GOLD Logo"
            className="w-9 h-9 rounded-lg object-cover border border-[#E5B842]/40 shadow-md shadow-[#E5B842]/20 shrink-0"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm lg:text-base font-extrabold tracking-wider text-white uppercase flex items-center gap-1.5">
                <span>SPILLA GOLD</span>
                <span className="text-[#E5B842] text-[10px] font-normal tracking-normal lowercase bg-[#E5B842]/10 px-1.5 py-0.5 rounded border border-[#E5B842]/20">
                  Analysis Engine
                </span>
              </h1>
            </div>
            <p className="text-[10px] text-gray-400">Institutional XAUUSD Quantitative Workstation</p>
          </div>
        </div>

        {/* User Profile & Actions */}
        <div className="flex items-center space-x-3">
          {/* Logged in User Profile Info */}
          {currentUser && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#121620] border border-gray-800 text-xs">
              <div className="w-6 h-6 rounded-full bg-[#E5B842]/20 border border-[#E5B842]/40 flex items-center justify-center text-[#E5B842] font-bold">
                {currentUser.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <div className="font-bold text-white leading-tight flex items-center gap-1.5">
                  <span>{currentUser.fullName}</span>
                  {currentUser.role === 'ADMIN' && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      ADMIN
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-gray-400">{currentUser.accountType || 'Trader Individu'}</p>
              </div>

              {/* Admin Panel Button Shortcut */}
              {currentUser.role === 'ADMIN' && onNavigateToAdmin && (
                <button
                  onClick={onNavigateToAdmin}
                  className="ml-1 px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Panel Kontrol Admin"
                >
                  <ShieldAlert className="w-3 h-3" />
                  <span className="hidden lg:inline">Admin Panel</span>
                </button>
              )}
            </div>
          )}

          {/* SPILLA AI Credit Pill Button */}
          {currentUser && onOpenCreditWallet && (
            <button
              onClick={onOpenCreditWallet}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/15 to-yellow-500/10 border border-[#E5B842]/40 hover:border-[#E5B842] text-xs transition-all shadow-sm cursor-pointer group"
              title="Buka SPILLA AI Credit Wallet & Top Up"
            >
              <div className="flex items-center gap-1.5 font-mono">
                <Coins className="w-3.5 h-3.5 text-[#E5B842]" />
                <span className="font-black text-[#E5B842]">
                  {creditBalance.toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-gray-400 font-sans hidden md:inline">Credit</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-[#E5B842] text-black flex items-center gap-0.5 group-hover:bg-amber-400">
                <PlusCircle className="w-2.5 h-2.5" />
                <span>Top Up</span>
              </span>
            </button>
          )}

          <div className="hidden sm:flex flex-col text-right text-[10px] text-gray-400 border-r border-gray-800 pr-3">
            <div className="flex items-center gap-1 font-bold text-white">
              <Clock className="w-3 h-3 text-[#E5B842]" />
              <span>UTC: {utcTime || '12:00:00'}</span>
            </div>
            <span className="text-[9px] text-gray-500">Sync: {new Date(lastUpdated).toLocaleTimeString()}</span>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#E5B842] hover:bg-[#c49f27] text-black font-extrabold text-xs transition-colors shadow-md shadow-[#E5B842]/10 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Syncing...' : 'Sync Engine'}</span>
          </button>

          <button
            onClick={() => onNavigateTo && onNavigateTo('engine_settings' as any)}
            className="p-1.5 rounded bg-[#121620] hover:bg-gray-800 text-gray-300 border border-gray-800 cursor-pointer"
            title="Engine Settings"
          >
            <Settings className="w-4 h-4 text-gray-300" />
          </button>

          {/* Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 rounded bg-gray-900 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-gray-800 transition-colors cursor-pointer"
              title="Keluar / Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* MOBILE COMPACT HEADER (below md) */}
      <div className="flex md:hidden flex-col w-full gap-2">
        {/* Row 1: Brand & Profile / Menu */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <img
              src={spillaLogo}
              alt="SPILLA GOLD Logo"
              className="w-7 h-7 rounded-lg object-cover border border-[#E5B842]/40 shadow-sm shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0 flex items-center gap-1.5">
              <span className="text-xs font-black tracking-wider text-white uppercase truncate">
                SPILLA GOLD
              </span>
              <span className="text-[9px] font-bold text-[#E5B842] bg-[#E5B842]/15 px-1 rounded border border-[#E5B842]/30 shrink-0">
                AI
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            {currentUser && (
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#121620] border border-gray-800 text-[11px] font-bold text-white"
                title={`${currentUser.fullName} (${currentUser.role})`}
              >
                <div className="w-4 h-4 rounded-full bg-[#E5B842]/20 border border-[#E5B842]/40 flex items-center justify-center text-[#E5B842] text-[9px] font-black">
                  {currentUser.fullName.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[70px] truncate">{currentUser.fullName.split(' ')[0]}</span>
                {currentUser.role === 'ADMIN' && (
                  <span className="text-[8px] font-black px-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    ADM
                  </span>
                )}
              </div>
            )}

            {currentUser?.role === 'ADMIN' && onNavigateToAdmin && (
              <button
                onClick={onNavigateToAdmin}
                className="p-1.5 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 transition-colors cursor-pointer"
                title="Panel Kontrol Admin"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => onNavigateTo && onNavigateTo('engine_settings' as any)}
              className="p-1.5 rounded bg-[#121620] hover:bg-gray-800 text-gray-300 border border-gray-800 cursor-pointer"
              title="Engine Settings"
            >
              <Settings className="w-3.5 h-3.5 text-gray-300" />
            </button>

            {onLogout && (
              <button
                onClick={onLogout}
                className="p-1.5 rounded bg-gray-900 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-gray-800 transition-colors cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Credit Balance, Top Up, Refresh */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-800/70 gap-2">
          {/* Credit balance display */}
          <div
            onClick={onOpenCreditWallet}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#121620] border border-[#E5B842]/30 text-xs cursor-pointer active:scale-95 transition-transform min-w-0"
            title="Buka Credit Wallet"
          >
            <Coins className="w-3.5 h-3.5 text-[#E5B842] shrink-0" />
            <span className="font-mono font-black text-[#E5B842] text-[11px] truncate">
              {creditBalance.toLocaleString('id-ID')}
            </span>
            <span className="text-[9px] text-gray-400 font-medium shrink-0">Cr</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Top Up button */}
            {onOpenCreditWallet && (
              <button
                onClick={onOpenCreditWallet}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-[#E5B842]/50 hover:border-[#E5B842] text-[11px] font-bold text-[#E5B842] transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <PlusCircle className="w-3 h-3 text-[#E5B842]" />
                <span>Top Up</span>
              </button>
            )}

            {/* Refresh / Sync Engine */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#E5B842] hover:bg-[#c49f27] text-black font-extrabold text-[11px] transition-colors shadow-sm disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
