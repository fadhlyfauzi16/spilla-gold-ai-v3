import React, { useCallback, useEffect, useState } from 'react';
import {
  Send,
  Bot,
  Settings,
  CheckCircle2,
  Activity,
  Radio,
  BellRing,
  TrendingUp,
  Server,
  ShieldCheck,
  TestTube2,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

import { TelegramBotConfigModal } from './TelegramBotConfigModal';

interface TelegramGatewayViewProps {
  authToken: string;
}

interface TelegramStatusResponse {
  success: boolean;
  connected: boolean;
  apiReady: boolean;
  recipientReady?: boolean;
  bot?: {
    id?: number;
    name?: string | null;
    username?: string | null;
  } | null;
  message?: string;
}

export const TelegramGatewayView: React.FC<TelegramGatewayViewProps> = ({
  authToken,
}) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [testing, setTesting] = useState(false);

  const [botConfig, setBotConfig] = useState<{
    connected: boolean;
    apiReady: boolean;
    recipientReady: boolean;
    botName?: string;
    botUsername?: string;
  }>({
    connected: false,
    apiReady: false,
    recipientReady: false,
  });

  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);

    try {
      const response = await fetch('/api/admin/telegram/status', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/json',
        },
      });

      const data = (await response.json()) as TelegramStatusResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Gagal membaca status Telegram Gateway.');
      }

      setBotConfig({
        connected: Boolean(data.connected),
        apiReady: Boolean(data.apiReady),
        recipientReady: Boolean(data.recipientReady),
        botName: data.bot?.name || undefined,
        botUsername: data.bot?.username || undefined,
      });
    } catch (error: any) {
      setBotConfig({
        connected: false,
        apiReady: false,
        recipientReady: false,
      });

      setTestMessage(error?.message || 'Telegram Gateway belum tersedia.');
      setTestSuccess(false);
    } finally {
      setLoadingStatus(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleTestMessage = async () => {
    if (!botConfig.connected || !botConfig.apiReady) {
      setTestMessage('Telegram Bot belum terhubung ke backend.');
      setTestSuccess(false);
      return;
    }

    setTesting(true);
    setTestMessage(null);
    setTestSuccess(false);

    try {
      const response = await fetch('/api/admin/telegram/test', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Test Message gagal dikirim.');
      }

      setTestMessage(
        data.message || 'Test Message berhasil dikirim ke Telegram.',
      );
      setTestSuccess(true);

      await fetchStatus();
    } catch (error: any) {
      setTestMessage(error?.message || 'Test Message gagal dikirim.');
      setTestSuccess(false);
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="bg-[#111622] border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-72 h-72 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center shrink-0">
                <Send className="w-6 h-6 text-sky-400" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    Telegram Notification Gateway
                  </h2>

                  <span
                    className={`px-2 py-0.5 rounded-md text-[9px] font-black border ${
                      botConfig.connected
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-gray-900 text-gray-400 border-gray-700'
                    }`}
                  >
                    {loadingStatus
                      ? 'CHECKING'
                      : botConfig.connected
                        ? 'CONNECTED'
                        : 'NOT CONNECTED'}
                  </span>
                </div>

                <p className="text-xs text-gray-400 mt-1 max-w-2xl leading-relaxed">
                  Hubungkan bot Telegram resmi dengan SPILLA GOLD untuk menerima
                  notifikasi AI, trading, MT5, Copy Trade, dan system alert.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={fetchStatus}
                disabled={loadingStatus}
                className="px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 hover:text-white text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loadingStatus ? 'animate-spin' : ''}`} />
                REFRESH
              </button>

              <button
                type="button"
                onClick={() => setIsConfigOpen(true)}
                className="px-5 py-3 rounded-xl bg-[#E5B842] hover:bg-amber-400 text-black font-black text-xs flex items-center justify-center gap-2 shrink-0"
              >
                <Settings className="w-4 h-4" />
                {botConfig.connected ? 'RECONFIGURE BOT' : 'CONFIGURE BOT'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-[#111622] border border-gray-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Bot className="w-4 h-4 text-sky-400" />
                  BOT CONNECTION
                </h3>

                <p className="text-[10px] text-gray-500 mt-1">
                  Telegram Bot API connection status
                </p>
              </div>

              <div
                className={`w-3 h-3 rounded-full ${
                  botConfig.connected
                    ? 'bg-emerald-400 shadow-lg shadow-emerald-500/50'
                    : 'bg-gray-600'
                }`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <StatusCard
                label="Connection Status"
                value={loadingStatus ? 'CHECKING...' : botConfig.connected ? 'CONNECTED' : 'NOT CONNECTED'}
                good={botConfig.connected}
              />

              <StatusCard
                label="Bot Username"
                value={botConfig.botUsername || '—'}
                good={Boolean(botConfig.botUsername)}
                mono
              />

              <StatusCard
                label="Bot Name"
                value={botConfig.botName || '—'}
                good={Boolean(botConfig.botName)}
              />

              <StatusCard
                label="Telegram API"
                value={botConfig.apiReady ? 'READY' : 'UNAVAILABLE'}
                good={botConfig.apiReady}
              />
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleTestMessage}
                disabled={!botConfig.connected || testing}
                className="px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 hover:text-white text-[10px] font-black flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    SENDING...
                  </>
                ) : (
                  <>
                    <TestTube2 className="w-3.5 h-3.5" />
                    TEST MESSAGE
                  </>
                )}
              </button>

              {botConfig.connected && (
                <div className="px-3 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-[10px] text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Telegram Gateway siap digunakan.
                </div>
              )}
            </div>

            {testMessage && (
              <div
                className={`mt-3 text-[10px] rounded-lg p-2.5 border flex items-start gap-2 ${
                  testSuccess
                    ? 'text-emerald-300 bg-emerald-500/5 border-emerald-500/20'
                    : 'text-amber-300 bg-amber-500/5 border-amber-500/20'
                }`}
              >
                {testSuccess ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                )}
                <span>{testMessage}</span>
              </div>
            )}
          </div>

          <div className="bg-[#111622] border border-gray-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#E5B842]" />
              <h3 className="text-sm font-black text-white">Security Layer</h3>
            </div>

            <div className="mt-4 space-y-3">
              <SecurityItem
                title="Admin Only"
                text="Hanya administrator yang dapat mengubah konfigurasi."
              />
              <SecurityItem
                title="Server-Side Token"
                text="Token dibaca backend dari server environment."
              />
              <SecurityItem
                title="Server Side API"
                text="Telegram API tidak dipanggil langsung dari browser."
              />
            </div>
          </div>
        </div>

        <div className="bg-[#111622] border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <BellRing className="w-4 h-4 text-[#E5B842]" />
                NOTIFICATION SERVICES
              </h3>

              <p className="text-[10px] text-gray-500 mt-1">
                Modul notifikasi berikut akan diaktifkan setelah Test Message berhasil.
              </p>
            </div>

            <span className="px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-[9px] text-amber-400 font-black">
              COMING NEXT
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
            <ServiceCard
              icon={<TrendingUp className="w-4 h-4" />}
              title="AI Signal"
              description="BUY / SELL / WAIT"
            />
            <ServiceCard
              icon={<Activity className="w-4 h-4" />}
              title="Trade Execution"
              description="Order & execution alert"
            />
            <ServiceCard
              icon={<Server className="w-4 h-4" />}
              title="MT5 Status"
              description="Online / offline worker"
            />
            <ServiceCard
              icon={<Radio className="w-4 h-4" />}
              title="System Alert"
              description="Critical system notification"
            />
          </div>
        </div>
      </div>

      <TelegramBotConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onSaved={() => {
          setIsConfigOpen(false);
          fetchStatus();
        }}
      />
    </>
  );
};

const StatusCard: React.FC<{
  label: string;
  value: string;
  good?: boolean;
  mono?: boolean;
}> = ({ label, value, good = false, mono = false }) => (
  <div className="bg-[#0B0E14] border border-gray-800 rounded-xl p-3.5">
    <span className="text-[9px] text-gray-500 font-bold uppercase">{label}</span>
    <div
      className={`text-xs font-black mt-1 ${
        good ? 'text-emerald-400' : 'text-gray-400'
      } ${mono ? 'font-mono' : ''}`}
    >
      {value}
    </div>
  </div>
);

const SecurityItem: React.FC<{ title: string; text: string }> = ({ title, text }) => (
  <div className="flex items-start gap-2">
    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
    <div>
      <p className="text-[10px] font-bold text-white">{title}</p>
      <p className="text-[9px] text-gray-500">{text}</p>
    </div>
  </div>
);

const ServiceCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <div className="bg-[#0B0E14] border border-gray-800 rounded-xl p-3.5">
    <div className="flex items-center justify-between">
      <div className="w-8 h-8 rounded-lg bg-[#E5B842]/10 text-[#E5B842] flex items-center justify-center">
        {icon}
      </div>
      <span className="text-[9px] text-gray-500 font-black">OFF</span>
    </div>
    <p className="text-xs font-black text-white mt-3">{title}</p>
    <p className="text-[9px] text-gray-500 mt-1">{description}</p>
  </div>
);
