import React, { useState } from 'react';
import { Shield, Key, Lock, AlertCircle, CheckCircle2, X, ExternalLink, RefreshCw } from 'lucide-react';

interface ConnectIndodaxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  authToken?: string | null;
}

export const ConnectIndodaxModal: React.FC<ConnectIndodaxModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  authToken,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !apiSecret.trim()) {
      setError('Both INDODAX API Key and API Secret are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/crypto/account/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          apiSecret: apiSecret.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to verify INDODAX credentials.');
      }

      setSuccessMsg(data.message || 'INDODAX account connected successfully!');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Network error connecting to INDODAX API.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#121620] border border-[#232B3E] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#232B3E] bg-[#161B26]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#E5B842]/10 border border-[#E5B842]/30 flex items-center justify-center text-[#E5B842]">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Connect INDODAX Account
              </h3>
              <p className="text-xs text-gray-400">Institutional Direct API Gateway</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#232B3E] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Security Guarantee Banner */}
          <div className="p-3.5 rounded-xl bg-[#0D1117] border border-[#1F2633] flex items-start space-x-3">
            <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-gray-300 space-y-1">
              <p className="font-semibold text-white">Military-Grade AES-256-GCM Vault</p>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Your API Secret is encrypted at rest using isolated 256-bit GCM cipher keys. Private
                requests execute strictly server-side. Secret is never sent to browser or AI.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-2.5 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-2.5 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
              INDODAX API Key (Trade API)
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="e.g. ABCD1234-EFGH5678-IJKL9012"
                className="w-full bg-[#0B0E14] border border-[#232B3E] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#E5B842] focus:ring-1 focus:ring-[#E5B842] font-mono transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
              INDODAX API Secret
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="Enter your confidential Trade API secret"
                className="w-full bg-[#0B0E14] border border-[#232B3E] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#E5B842] focus:ring-1 focus:ring-[#E5B842] font-mono transition-colors"
              />
            </div>
          </div>

          {/* Quick Guide */}
          <div className="p-3 rounded-xl bg-[#161B26] border border-[#232B3E] text-[11px] text-gray-400 space-y-1.5">
            <div className="flex items-center justify-between text-gray-300 font-semibold">
              <span>Required API Permissions:</span>
              <a
                href="https://indodax.com/trade_api"
                target="_blank"
                rel="noreferrer"
                className="text-[#E5B842] hover:underline flex items-center space-x-1"
              >
                <span>Indodax Trade API</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-gray-400">
              <li>
                <span className="text-white">View Info</span> (read balances & order status)
              </li>
              <li>
                <span className="text-white">Trade</span> (place & cancel limit/market orders)
              </li>
              <li>
                <span className="text-rose-400">Withdraw is NOT required</span> (disable for safety)
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#232B3E] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#E5B842] text-black hover:bg-[#d4a733] transition-all disabled:opacity-50 flex items-center space-x-2 shadow-lg shadow-[#E5B842]/10"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying API...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Verify & Connect</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
