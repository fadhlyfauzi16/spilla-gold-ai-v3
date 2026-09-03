import React, { useState } from 'react';
import {
  Globe,
  LineChart,
  Bot,
  History,
  Menu,
  X,
  Coins,
  Users,
  Gauge,
  SmilePlus,
  CalendarDays,
  Newspaper,
  Sliders,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import { ViewTab } from './Navigation';

interface MobileBottomNavProps {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  recommendationSignal?: string;
  isAdmin?: boolean;
  onNavigateToAdmin?: () => void;
  creditBalance?: number;
  onOpenCreditWallet?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  recommendationSignal,
  isAdmin,
  onNavigateToAdmin,
  creditBalance,
  onOpenCreditWallet,
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Check if active tab belongs to the "More" category
  const moreTabIds: ViewTab[] = [
    'ai_recommendation',
    'history',
    'fundamental',
    'technical',
    'sentiment',
    'calendar',
    'news',
    'credit_wallet',
    'engine_settings',
  ];
  const isMoreActive = moreTabIds.includes(activeTab);

  // Primary 4 items in bottom bar
  const primaryTabs: {
    id: ViewTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: string;
  }[] = [
    { id: 'market_overview', label: 'Dashboard', icon: Globe },
    { id: 'live_analysis', label: 'Live AI', icon: LineChart },
    { id: 'crypto_ai_engine', label: 'Crypto', icon: Coins },
    { id: 'follow_master_ai', label: 'Follow Master', icon: Users },
  ];

  // Secondary items shown inside "More" drawer
  const moreItems: {
    id: ViewTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: string;
    desc?: string;
  }[] = [
    {
      id: 'ai_recommendation',
      label: 'AI Recommendation',
      icon: Bot,
      badge: recommendationSignal || 'BUY',
      desc: 'Multi-indicator quantitative trade setups',
    },
    {
      id: 'history',
      label: 'Analysis History',
      icon: History,
      desc: 'Institutional forecast verification record',
    },
    {
      id: 'fundamental',
      label: 'Fundamental Analysis',
      icon: Globe,
      desc: 'Macro sentiment, CPI, yield & rates',
    },
    {
      id: 'technical',
      label: 'Technical Analysis',
      icon: Gauge,
      desc: 'SMC, Order Blocks, Liquidity Sweeps',
    },
    {
      id: 'sentiment',
      label: 'Market Sentiment',
      icon: SmilePlus,
      desc: 'COT positioning & retail trader ratios',
    },
    {
      id: 'calendar',
      label: 'Economic Calendar',
      icon: CalendarDays,
      desc: 'High impact global event releases',
    },
    {
      id: 'news',
      label: 'Market News',
      icon: Newspaper,
      desc: 'Institutional gold & FX live dispatches',
    },
    {
      id: 'credit_wallet',
      label: 'SPILLA AI Credit',
      icon: Coins,
      badge: creditBalance !== undefined ? `${creditBalance.toLocaleString('id-ID')} Cr` : 'TOP UP',
      desc: 'Quota balance & instant midtrans top up',
    },
    {
      id: 'engine_settings',
      label: 'Engine Settings',
      icon: Sliders,
      desc: 'Model weights, MT5 terminal bridge & alerts',
    },
  ];

  const handleSelectTab = (tab: ViewTab) => {
    setIsMoreOpen(false);
    if (tab === 'credit_wallet' && onOpenCreditWallet) {
      onOpenCreditWallet();
      return;
    }
    onTabChange(tab);
  };

  return (
    <>
      {/* Fixed Mobile Bottom Navigation Bar */}
      <nav
        id="mobile-bottom-nav"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B0D13]/95 backdrop-blur-lg border-t border-gray-800/90 md:hidden font-mono select-none"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="grid grid-cols-5 h-15 items-center px-1">
          {primaryTabs.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`relative flex flex-col items-center justify-center h-full py-1 transition-all cursor-pointer ${
                  isActive ? 'text-[#E5B842]' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {/* Active Accent Top Indicator */}
                {isActive && (
                  <span className="absolute top-0 w-8 h-0.5 bg-[#E5B842] rounded-full shadow-[0_0_8px_#E5B842]" />
                )}

                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#E5B842]' : 'text-gray-400'}`} />
                  {item.badge && !isActive && (
                    <span className="absolute -top-1 -right-2 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>

                <span className={`text-[9px] min-[390px]:text-[10px] tracking-tight mt-1 truncate max-w-full px-0.5 ${
                  isActive ? 'font-black text-[#E5B842]' : 'font-semibold text-gray-400'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* 5th Tab: "More" Drawer Trigger */}
          <button
            onClick={() => setIsMoreOpen(true)}
            className={`relative flex flex-col items-center justify-center h-full py-1 transition-all cursor-pointer ${
              isMoreActive || isMoreOpen ? 'text-[#E5B842]' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {/* Active Accent Top Indicator if inside secondary menu */}
            {isMoreActive && (
              <span className="absolute top-0 w-8 h-0.5 bg-[#E5B842] rounded-full shadow-[0_0_8px_#E5B842]" />
            )}

            <div className="relative">
              <Menu className={`w-5 h-5 ${isMoreActive || isMoreOpen ? 'text-[#E5B842]' : 'text-gray-400'}`} />
              {isMoreActive && (
                <span className="absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full bg-[#E5B842]" />
              )}
            </div>

            <span className={`text-[10px] tracking-tight mt-1 truncate max-w-[62px] ${
              isMoreActive || isMoreOpen ? 'font-black text-[#E5B842]' : 'font-semibold text-gray-400'
            }`}>
              More
            </span>
          </button>
        </div>
      </nav>

      {/* "More" Secondary Navigation Bottom Sheet / Drawer */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMoreOpen(false)}
          />

          {/* Drawer Sheet */}
          <div className="relative bg-[#0E1118] border-t border-gray-800 rounded-t-2xl p-4 shadow-2xl max-h-[82vh] overflow-y-auto font-mono flex flex-col z-10 animate-in slide-in-from-bottom duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-800/90">
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#E5B842]" />
                  <span>ALL MODULES & TOOLS</span>
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Quantitative Workstation Navigation</p>
              </div>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="p-1.5 rounded-lg bg-[#121620] hover:bg-gray-800 text-gray-400 hover:text-white cursor-pointer border border-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of Secondary Items */}
            <div className="py-2 divide-y divide-gray-800/40 space-y-1">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer text-left ${
                      isActive
                        ? 'bg-[#E5B842]/10 border border-[#E5B842]/40 text-[#E5B842]'
                        : 'text-gray-300 hover:bg-[#121620] hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-[#E5B842]/20 text-[#E5B842]'
                            : 'bg-[#121620] text-gray-400 border border-gray-800'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold truncate">{item.label}</span>
                          {item.badge && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {item.desc && (
                          <p className="text-[10px] text-gray-500 truncate mt-0.5">{item.desc}</p>
                        )}
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 shrink-0 ml-2 ${
                        isActive ? 'text-[#E5B842]' : 'text-gray-600'
                      }`}
                    />
                  </button>
                );
              })}

              {/* Admin Panel (if Admin user) */}
              {isAdmin && onNavigateToAdmin && (
                <button
                  onClick={() => {
                    setIsMoreOpen(false);
                    onNavigateToAdmin();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all cursor-pointer text-left mt-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold">Admin Control Panel</span>
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-300 border border-amber-500/40 shrink-0">
                          ADMIN
                        </span>
                      </div>
                      <p className="text-[10px] text-amber-400/70 truncate mt-0.5">
                        User management & system configurations
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 text-amber-400 ml-2" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
