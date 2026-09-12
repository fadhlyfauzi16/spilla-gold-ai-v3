import React, { useState } from 'react';
import {
  X, Send, Bot, ExternalLink, Copy, CheckCircle2, AlertCircle,
  ShieldCheck, KeyRound, Loader2, Eye, EyeOff,
} from 'lucide-react';

interface TelegramBotConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (data: { botName: string; botUsername: string }) => void;
}

export const TelegramBotConfigModal: React.FC<TelegramBotConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [botToken, setBotToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [message, setMessage] = useState<string | null>(null);
  const [verifiedBot, setVerifiedBot] = useState<{ botName: string; botUsername: string } | null>(null);

  if (!isOpen) return null;

  const handleOpenBotFather = () => {
    window.open('https://t.me/BotFather', '_blank', 'noopener,noreferrer');
  };

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText('/newbot');
      setMessage('Command /newbot berhasil disalin.');
    } catch {
      setMessage('Silakan copy manual command /newbot.');
    }
  };

  const handleCheckToken = async () => {
    if (!botToken.trim()) {
      setStatus('ERROR');
      setMessage('Bot Token wajib diisi.');
      return;
    }

    setIsChecking(true);
    setStatus('IDLE');
    setMessage(null);

    // FRONTEND PREVIEW ONLY.
    // Tahap backend nanti: POST /api/admin/telegram/verify
    await new Promise((resolve) => setTimeout(resolve, 800));

    const previewBot = {
      botName: 'SPILLA GOLD Bot',
      botUsername: '@SpillaGoldBot',
    };

    setVerifiedBot(previewBot);
    setStatus('SUCCESS');
    setMessage('Preview UI aktif. Verifikasi Telegram API asli akan dibuat pada tahap backend.');
    setIsChecking(false);
  };

  const handleSave = async () => {
    if (status !== 'SUCCESS' || !verifiedBot) {
      setMessage('Periksa Bot Token terlebih dahulu.');
      return;
    }

    setIsSaving(true);

    // FRONTEND PREVIEW ONLY.
    // Tahap backend nanti: POST /api/admin/telegram/config
    await new Promise((resolve) => setTimeout(resolve, 500));

    onSaved?.(verifiedBot);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-[#0F121A] border border-gray-800 rounded-2xl shadow-2xl">
        <div className="sticky top-0 z-10 bg-[#0F121A]/95 backdrop-blur-xl border-b border-gray-800 px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
              <Send className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">KONFIGURASI BOT TELEGRAM</h2>
              <p className="text-[10px] sm:text-xs text-gray-400">Hubungkan Telegram Notification Gateway ke SPILLA GOLD</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg border border-gray-800 bg-[#141822] hover:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          <div className="p-3.5 rounded-xl bg-[#E5B842]/5 border border-[#E5B842]/20 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#E5B842] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-[#E5B842]">ADMIN ONLY • SECURE CONFIGURATION</p>
              <p className="text-[10px] sm:text-[11px] text-gray-400 mt-1 leading-relaxed">
                Bot Token adalah credential rahasia. Pada versi production, verifikasi dilakukan melalui backend SPILLA GOLD dan token disimpan terenkripsi.
              </p>
            </div>
          </div>

          <Step n="01" title="Buka BotFather">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-[11px] text-gray-400">Gunakan BotFather resmi Telegram untuk membuat bot baru.</p>
              <button
                type="button"
                onClick={handleOpenBotFather}
                className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-[10px] font-black flex items-center justify-center gap-1.5"
              >
                OPEN BOTFATHER <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </Step>

          <Step n="02" title="Buat Bot Baru">
            <p className="text-[11px] text-gray-400 mb-3">Kirim command berikut ke BotFather.</p>
            <div className="flex items-center justify-between bg-[#0B0E14] border border-gray-800 rounded-lg px-3 py-2.5">
              <code className="text-[#E5B842] text-xs font-black">/newbot</code>
              <button type="button" onClick={handleCopyCommand} className="text-gray-500 hover:text-white">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </Step>

          <Step n="03" title="Masukkan Bot Token">
            <label className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#E5B842]" /> BOT TOKEN
            </label>

            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <div className="relative flex-1">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={botToken}
                  onChange={(e) => {
                    setBotToken(e.target.value);
                    setStatus('IDLE');
                    setVerifiedBot(null);
                  }}
                  placeholder="Contoh: 123456789:AA..."
                  className="w-full bg-[#0B0E14] border border-gray-800 rounded-xl pl-3.5 pr-10 py-3 text-xs text-white font-mono placeholder-gray-600 focus:outline-none focus:border-[#E5B842]"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="button"
                onClick={handleCheckToken}
                disabled={isChecking}
                className="px-5 py-3 rounded-xl bg-[#E5B842] hover:bg-amber-400 text-black text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isChecking ? <><Loader2 className="w-4 h-4 animate-spin" /> CHECKING</> : <><Bot className="w-4 h-4" /> PERIKSA</>}
              </button>
            </div>

            {status === 'SUCCESS' && verifiedBot && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-emerald-400">TELEGRAM BOT CONNECTED</p>
                  <p className="text-[11px] text-white mt-1 font-bold">{verifiedBot.botName}</p>
                  <p className="text-[10px] text-sky-400 font-mono">{verifiedBot.botUsername}</p>
                </div>
              </div>
            )}

            {status === 'ERROR' && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="text-[11px] text-rose-300">{message}</span>
              </div>
            )}
          </Step>

          <Step n="04" title="Simpan Konfigurasi">
            <p className="text-[11px] text-gray-400">
              Setelah token berhasil diverifikasi, simpan konfigurasi untuk mengaktifkan Telegram Notification Gateway SPILLA GOLD.
            </p>
          </Step>

          {message && status !== 'ERROR' && (
            <div className="text-[10px] text-gray-400 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
              {message}
            </div>
          )}

          <div className="pt-2 border-t border-gray-800 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 hover:text-white text-xs font-bold"
            >
              BATAL
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={status !== 'SUCCESS' || isSaving}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#E5B842] to-amber-400 text-black text-xs font-black disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> MENYIMPAN...</> : <><ShieldCheck className="w-4 h-4" /> SIMPAN KONFIGURASI</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Step: React.FC<{
  n: string;
  title: string;
  children: React.ReactNode;
}> = ({ n, title, children }) => (
  <div className="grid grid-cols-[38px_1fr] gap-3">
    <div className="w-9 h-9 rounded-full bg-[#E5B842] text-black flex items-center justify-center text-xs font-black">
      {n}
    </div>
    <div className="bg-[#141822] border border-gray-800 rounded-xl p-4">
      <h3 className="text-xs font-black text-white uppercase mb-2">{title}</h3>
      {children}
    </div>
  </div>
);
