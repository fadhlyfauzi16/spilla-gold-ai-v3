import React, { useState, useEffect, useRef } from 'react';
import {
  Coins,
  CreditCard,
  History,
  Settings,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  Eye,
  Building,
  Check,
  FileSpreadsheet,
  Download,
  Upload,
  ShieldCheck,
  ArrowUpDown,
  FileText,
  AlertCircle,
  Layers,
  Sparkles,
  Database,
  SlidersHorizontal,
} from 'lucide-react';
import {
  AdminCreditStats,
  UserWalletWithProfile,
  TopUpRequest,
  CreditTransaction,
  PaymentSettings,
  CreditReconciliationReport,
  CreditReconciliationItem,
  ExcelImportPreview,
  ExcelImportCommitResult,
} from '../types/credit';

interface AdminCreditManagementViewProps {
  authToken: string;
}

export const AdminCreditManagementView: React.FC<AdminCreditManagementViewProps> = ({
  authToken,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'TOPUPS' | 'USERS' | 'TRANSACTIONS' | 'RECONCILIATION' | 'EXCEL_BACKUP' | 'SETTINGS'>('TOPUPS');
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<AdminCreditStats>({
    totalCreditSoldIdr: 0,
    creditInUserWallets: 0,
    totalCreditUsed: 0,
    totalAiAnalysis: 0,
    pendingTopUpCount: 0,
    pendingTopUpAmountIdr: 0,
  });

  const [topups, setTopups] = useState<TopUpRequest[]>([]);
  const [wallets, setWallets] = useState<UserWalletWithProfile[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    bankName: '',
    accountNumber: '',
    accountName: '',
    instructions: '',
    isActive: true,
    updatedAt: '',
  });

  // Filters & Search
  const [topupStatusFilter, setTopupStatusFilter] = useState<string>('PENDING');
  const [topupSearch, setTopupSearch] = useState<string>('');
  const [userSearch, setUserSearch] = useState<string>('');
  const [userSortBy, setUserSortBy] = useState<'balance_desc' | 'balance_asc' | 'used_desc' | 'recent_tx'>('balance_desc');
  const [txTypeFilter, setTxTypeFilter] = useState<string>('ALL');
  const [txSearch, setTxSearch] = useState<string>('');

  // Selected Topup Detail Modal
  const [selectedTopup, setSelectedTopup] = useState<TopUpRequest | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState<string>('');
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const [actionAlert, setActionAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Adjust Credit Modal
  const [adjustModalUser, setAdjustModalUser] = useState<UserWalletWithProfile | null>(null);
  const [adjustType, setAdjustType] = useState<'ADD' | 'DEDUCT'>('ADD');
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('');

  // User Individual Ledger Modal
  const [selectedUserLedger, setSelectedUserLedger] = useState<{ user: UserWalletWithProfile; items: CreditTransaction[] } | null>(null);
  const [isLoadingUserLedger, setIsLoadingUserLedger] = useState<boolean>(false);

  // Payment Settings Form
  const [bankForm, setBankForm] = useState<Partial<PaymentSettings>>({});
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);

  // Reconciliation State
  const [reconReport, setReconReport] = useState<CreditReconciliationReport | null>(null);
  const [isReconciling, setIsReconciling] = useState<boolean>(false);
  const [reconRepairModal, setReconRepairModal] = useState<CreditReconciliationItem | null>(null);
  const [repairReason, setRepairReason] = useState<string>('');
  const [isRepairing, setIsRepairing] = useState<boolean>(false);

  // Excel Backup & Restore State
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ExcelImportPreview | null>(null);
  const [isPreviewingImport, setIsPreviewingImport] = useState<boolean>(false);
  const [importMode, setImportMode] = useState<'MERGE' | 'RESTORE'>('MERGE');
  const [isCommittingImport, setIsCommittingImport] = useState<boolean>(false);
  const [commitResult, setCommitResult] = useState<ExcelImportCommitResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAdminCreditData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${authToken}` };

      // 1. Stats
      const statsRes = await fetch('/api/admin/credit/stats', { headers });
      const statsJson = await statsRes.json();
      if (statsJson.success && statsJson.stats) {
        setStats(statsJson.stats);
      }

      // 2. Topups
      const topupRes = await fetch(`/api/admin/credit/topups?status=${topupStatusFilter}&search=${encodeURIComponent(topupSearch)}`, { headers });
      const topupJson = await topupRes.json();
      if (topupJson.success && topupJson.topups) {
        setTopups(topupJson.topups);
      }

      // 3. User Wallets
      const walletsRes = await fetch(`/api/admin/credit/wallets?search=${encodeURIComponent(userSearch)}&sortBy=${userSortBy}`, { headers });
      const walletsJson = await walletsRes.json();
      if (walletsJson.success && walletsJson.wallets) {
        setWallets(walletsJson.wallets);
      }

      // 4. Transactions Ledger
      const txRes = await fetch(`/api/admin/credit/transactions?type=${txTypeFilter}&search=${encodeURIComponent(txSearch)}`, { headers });
      const txJson = await txRes.json();
      if (txJson.success && txJson.transactions) {
        setTransactions(txJson.transactions);
      }

      // 5. Payment Settings
      const setRes = await fetch('/api/admin/credit/payment-settings', { headers });
      const setJson = await setRes.json();
      if (setJson.success && setJson.paymentSettings) {
        setPaymentSettings(setJson.paymentSettings);
        setBankForm(setJson.paymentSettings);
      }
    } catch (err) {
      console.error('[Admin Credit Management] Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminCreditData();
  }, [authToken, topupStatusFilter, topupSearch, userSearch, userSortBy, txTypeFilter, txSearch]);

  // Fetch Reconciliation Report
  const handleFetchReconciliation = async () => {
    setIsReconciling(true);
    try {
      const res = await fetch('/api/admin/credit/reconciliation', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success && data.report) {
        setReconReport(data.report);
      } else {
        setActionAlert({ type: 'error', message: data.message || 'Gagal mengambil laporan rekonsiliasi.' });
      }
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || 'Gagal terhubung ke server.' });
    } finally {
      setIsReconciling(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'RECONCILIATION') {
      handleFetchReconciliation();
    }
  }, [activeSubTab]);

  // Handle Confirm Payment
  const handleConfirmTopUp = async (topupId: string) => {
    if (!window.confirm(`Konfirmasi pembayaran dan tambahkan Credit ke akun pengguna?`)) return;

    setIsProcessingAction(true);
    setActionAlert(null);
    try {
      const res = await fetch(`/api/admin/credit/topup/${topupId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ adminNotes: adminNoteInput }),
      });
      const data = await res.json();
      if (data.success) {
        setActionAlert({ type: 'success', message: data.message });
        setSelectedTopup(null);
        setAdminNoteInput('');
        fetchAdminCreditData();
      } else {
        setActionAlert({ type: 'error', message: data.message || 'Gagal mengonfirmasi pembayaran.' });
      }
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || 'Terjadi kesalahan sistem.' });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handle Reject Payment
  const handleRejectTopUp = async (topupId: string) => {
    if (!adminNoteInput || adminNoteInput.trim().length < 3) {
      alert('Alasan penolakan (Admin Notes) wajib diisi.');
      return;
    }
    if (!window.confirm(`Tolak pengajuan Top Up ini?`)) return;

    setIsProcessingAction(true);
    setActionAlert(null);
    try {
      const res = await fetch(`/api/admin/credit/topup/${topupId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ adminNotes: adminNoteInput }),
      });
      const data = await res.json();
      if (data.success) {
        setActionAlert({ type: 'success', message: data.message });
        setSelectedTopup(null);
        setAdminNoteInput('');
        fetchAdminCreditData();
      } else {
        setActionAlert({ type: 'error', message: data.message || 'Gagal menolak Top Up.' });
      }
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || 'Terjadi kesalahan sistem.' });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handle Adjust Credit
  const handleAdjustCreditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalUser) return;

    const amount = Number(adjustAmount);
    if (!amount || amount <= 0) {
      alert('Nominal penyesuaian harus lebih dari 0.');
      return;
    }
    if (!adjustReason || adjustReason.trim().length < 3) {
      alert('Alasan penyesuaian wajib diisi minimal 3 karakter.');
      return;
    }

    setIsProcessingAction(true);
    try {
      const res = await fetch('/api/admin/credit/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          targetUserId: adjustModalUser.userId,
          type: adjustType,
          amount,
          reason: adjustReason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActionAlert({ type: 'success', message: data.message });
        setAdjustModalUser(null);
        setAdjustAmount('');
        setAdjustReason('');
        fetchAdminCreditData();
      } else {
        alert(data.message || 'Gagal menyesuaikan saldo.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handle Repair Reconciliation Discrepancy
  const handleRepairReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconRepairModal) return;
    if (!repairReason || repairReason.trim().length < 3) {
      alert('Alasan perbaikan audit wajib diisi minimal 3 karakter.');
      return;
    }

    setIsRepairing(true);
    try {
      const res = await fetch('/api/admin/credit/reconciliation/repair', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          targetUserId: reconRepairModal.userId,
          reason: repairReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionAlert({ type: 'success', message: data.message });
        setReconRepairModal(null);
        setRepairReason('');
        handleFetchReconciliation();
        fetchAdminCreditData();
      } else {
        alert(data.message || 'Gagal memperbaiki saldo rekonsiliasi.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsRepairing(false);
    }
  };

  // Handle Export Excel Download
  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const res = await fetch('/api/admin/credit/backup/export', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error('Gagal mengekspor file Excel.');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `SPILLA_GOLD_CREDIT_BACKUP_${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setActionAlert({ type: 'success', message: 'Backup Excel berhasil diunduh.' });
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || 'Gagal mengunduh file backup.' });
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Handle File Selection for Excel Import Preview
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportPreview(null);
    setCommitResult(null);
    setIsPreviewingImport(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const res = await fetch('/api/admin/credit/backup/import-preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            base64Data,
            fileName: file.name,
          }),
        });

        const data = await res.json();
        if (data.success && data.preview) {
          setImportPreview(data.preview);
        } else {
          setActionAlert({ type: 'error', message: data.message || 'Gagal memproses preview file Excel.' });
          setImportFile(null);
        }
        setIsPreviewingImport(false);
      };
      reader.onerror = () => {
        setActionAlert({ type: 'error', message: 'Gagal membaca file.' });
        setIsPreviewingImport(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || 'Terjadi kesalahan sistem saat memproses file.' });
      setIsPreviewingImport(false);
    }
  };

  // Handle Commit Import
  const handleCommitImport = async () => {
    if (!importPreview) return;
    const confirmText = importMode === 'RESTORE'
      ? 'PERINGATAN: Mode RESTORE akan menyelaraskan saldo wallet dan mengimpor seluruh mutasi. Lanjutkan?'
      : 'Mode MERGE akan mengimpor data baru tanpa menimpa saldo wallet yang telah ada. Lanjutkan?';

    if (!window.confirm(confirmText)) return;

    setIsCommittingImport(true);
    try {
      const res = await fetch('/api/admin/credit/backup/import-commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          preview: importPreview,
          mode: importMode,
        }),
      });

      const data = await res.json();
      if (data.success && data.result) {
        setCommitResult(data.result);
        setActionAlert({ type: 'success', message: data.result.message });
        setImportPreview(null);
        setImportFile(null);
        fetchAdminCreditData();
      } else {
        setActionAlert({ type: 'error', message: data.message || 'Gagal mengeksekusi import data.' });
      }
    } catch (err: any) {
      setActionAlert({ type: 'error', message: err.message || 'Terjadi kesalahan saat mengeksekusi import.' });
    } finally {
      setIsCommittingImport(false);
    }
  };

  // Open User Ledger Modal
  const handleViewUserLedger = async (user: UserWalletWithProfile) => {
    setIsLoadingUserLedger(true);
    setSelectedUserLedger({ user, items: [] });
    try {
      const res = await fetch(`/api/admin/credit/transactions?search=${encodeURIComponent(user.userId)}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success && data.transactions) {
        setSelectedUserLedger({ user, items: data.transactions });
      }
    } catch (err) {
      console.error('Error fetching user ledger:', err);
    } finally {
      setIsLoadingUserLedger(false);
    }
  };

  // Handle Save Payment Settings
  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/admin/credit/payment-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(bankForm),
      });

      const data = await res.json();
      if (data.success) {
        setActionAlert({ type: 'success', message: 'Pengaturan rekening pembayaran berhasil diperbarui!' });
        fetchAdminCreditData();
      } else {
        alert(data.message || 'Gagal menyimpan pengaturan.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert banner */}
      {actionAlert && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between ${
            actionAlert.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/15 border border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionAlert.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
            <span>{actionAlert.message}</span>
          </div>
          <button onClick={() => setActionAlert(null)} className="text-xs hover:underline opacity-80 cursor-pointer">
            Tutup
          </button>
        </div>
      )}

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Sold */}
        <div className="bg-[#121620] border border-gray-800 p-4 rounded-xl">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Terjual (Rp)</div>
          <div className="text-lg font-black text-white font-mono mt-1">
            Rp{stats.totalCreditSoldIdr.toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] text-emerald-400 mt-0.5">Top Up Terkonfirmasi</div>
        </div>

        {/* User Wallets */}
        <div className="bg-[#121620] border border-gray-800 p-4 rounded-xl">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Saldo di Wallet</div>
          <div className="text-lg font-black text-[#E5B842] font-mono mt-1">
            {stats.creditInUserWallets.toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Total Saldo Aktif</div>
        </div>

        {/* Total Credit Used */}
        <div className="bg-[#121620] border border-gray-800 p-4 rounded-xl">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Credit Terpakai</div>
          <div className="text-lg font-black text-blue-400 font-mono mt-1">
            {stats.totalCreditUsed.toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] text-blue-300 mt-0.5">Dari Analisis AI</div>
        </div>

        {/* Total AI Analysis */}
        <div className="bg-[#121620] border border-gray-800 p-4 rounded-xl">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total AI Analysis</div>
          <div className="text-lg font-black text-emerald-400 font-mono mt-1">
            {stats.totalAiAnalysis.toLocaleString('id-ID')}x
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Analisis Berhasil</div>
        </div>

        {/* Pending Topups */}
        <div className="bg-[#121620] border-2 border-amber-500/40 p-4 rounded-xl bg-amber-500/5">
          <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center justify-between">
            <span>Pending Top Up</span>
            {stats.pendingTopUpCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>
          <div className="text-lg font-black text-white font-mono mt-1">
            {stats.pendingTopUpCount} <span className="text-xs text-amber-300 font-sans">Permintaan</span>
          </div>
          <div className="text-[10px] text-amber-400 mt-0.5">Perlu Konfirmasi</div>
        </div>

        {/* Pending Amount */}
        <div className="bg-[#121620] border border-gray-800 p-4 rounded-xl">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Nominal Pending</div>
          <div className="text-lg font-black text-amber-300 font-mono mt-1">
            Rp{stats.pendingTopUpAmountIdr.toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Menunggu Verifikasi</div>
        </div>
      </div>

      {/* Sub Navigation Bar */}
      <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-3">
        <button
          onClick={() => setActiveSubTab('TOPUPS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'TOPUPS'
              ? 'bg-[#E5B842] text-black shadow-md shadow-amber-500/10'
              : 'bg-[#121620] text-gray-300 hover:bg-gray-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Konfirmasi Pembayaran</span>
          {stats.pendingTopUpCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-red-600 text-white">
              {stats.pendingTopUpCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('USERS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'USERS'
              ? 'bg-[#E5B842] text-black shadow-md shadow-amber-500/10'
              : 'bg-[#121620] text-gray-300 hover:bg-gray-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Saldo Pengguna ({wallets.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('TRANSACTIONS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'TRANSACTIONS'
              ? 'bg-[#E5B842] text-black shadow-md shadow-amber-500/10'
              : 'bg-[#121620] text-gray-300 hover:bg-gray-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Buku Besar Mutasi</span>
        </button>

        <button
          onClick={() => setActiveSubTab('RECONCILIATION')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'RECONCILIATION'
              ? 'bg-[#E5B842] text-black shadow-md shadow-amber-500/10'
              : 'bg-[#121620] text-gray-300 hover:bg-gray-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Rekonsiliasi Saldo</span>
          {reconReport && reconReport.mismatchedCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-600 text-white">
              {reconReport.mismatchedCount} Mismatch
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('EXCEL_BACKUP')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'EXCEL_BACKUP'
              ? 'bg-[#E5B842] text-black shadow-md shadow-amber-500/10'
              : 'bg-[#121620] text-gray-300 hover:bg-gray-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Backup & Restore Excel</span>
        </button>

        <button
          onClick={() => setActiveSubTab('SETTINGS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'SETTINGS'
              ? 'bg-[#E5B842] text-black shadow-md shadow-amber-500/10'
              : 'bg-[#121620] text-gray-300 hover:bg-gray-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Pengaturan Rekening Transfer</span>
        </button>

        <div className="ml-auto">
          <button
            onClick={fetchAdminCreditData}
            disabled={loading}
            className="p-2 rounded-xl bg-[#121620] hover:bg-gray-800 text-gray-300 border border-gray-800 transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* SUBTAB 1: KONFIRMASI PEMBAYARAN (TOPUP REQUESTS)     */}
      {/* ==================================================== */}
      {activeSubTab === 'TOPUPS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
              <input
                type="text"
                placeholder="Cari ID Top Up, nama user, email..."
                value={topupSearch}
                onChange={(e) => setTopupSearch(e.target.value)}
                className="w-full bg-[#121620] border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#E5B842]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Status:</span>
              <select
                value={topupStatusFilter}
                onChange={(e) => setTopupStatusFilter(e.target.value)}
                className="bg-[#121620] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="ALL">Semua Status</option>
                <option value="PENDING">PENDING (Menunggu Konfirmasi)</option>
                <option value="CONFIRMED">CONFIRMED (Sudah Diterima)</option>
                <option value="REJECTED">REJECTED (Ditolak)</option>
              </select>
            </div>
          </div>

          {topups.length === 0 ? (
            <div className="p-12 text-center bg-[#121620] border border-gray-800 rounded-2xl text-gray-500 text-xs">
              Tidak ada data pengajuan Top Up yang sesuai filter.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-800 bg-[#0C0F16]">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-[#111520] text-gray-400 font-bold border-b border-gray-800">
                  <tr>
                    <th className="p-3">ID Top Up</th>
                    <th className="p-3">Pengguna</th>
                    <th className="p-3 text-right">Nominal Transfer</th>
                    <th className="p-3 text-right">Credit Ditambahkan</th>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 font-mono">
                  {topups.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-800/30">
                      <td className="p-3 font-bold text-amber-300 whitespace-nowrap">{req.id}</td>
                      <td className="p-3 font-sans whitespace-nowrap">
                        <div className="font-bold text-white">{req.userName}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{req.email}</div>
                      </td>
                      <td className="p-3 text-right font-black text-white whitespace-nowrap">
                        Rp{req.amountIdr.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 text-right font-bold text-[#E5B842] whitespace-nowrap">
                        +{req.creditRequested.toLocaleString('id-ID')} Credit
                      </td>
                      <td className="p-3 text-gray-400 text-[11px] whitespace-nowrap">
                        {new Date(req.createdAt).toLocaleString('id-ID')}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            req.status === 'CONFIRMED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : req.status === 'PENDING'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedTopup(req);
                            setAdminNoteInput(req.adminNotes || '');
                          }}
                          className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-[#E5B842] hover:text-black text-gray-200 text-[11px] font-bold transition-colors flex items-center gap-1 mx-auto cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* SUBTAB 2: SALDO PENGGUNA (MONITORING & ADJUSTMENTS)  */}
      {/* ==================================================== */}
      {activeSubTab === 'USERS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
              <input
                type="text"
                placeholder="Cari user berdasarkan nama, email, user ID..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-[#121620] border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#E5B842]"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-gray-400 flex items-center gap-1 whitespace-nowrap">
                <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" /> Urutkan:
              </span>
              <select
                value={userSortBy}
                onChange={(e) => setUserSortBy(e.target.value as any)}
                className="bg-[#121620] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="balance_desc">Saldo Tertinggi</option>
                <option value="balance_asc">Saldo Terendah</option>
                <option value="used_desc">Penggunaan Terbanyak</option>
                <option value="recent_tx">Transaksi Terkini</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-800 bg-[#0C0F16]">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#111520] text-gray-400 font-bold border-b border-gray-800">
                <tr>
                  <th className="p-3">Pengguna</th>
                  <th className="p-3">Role & Tipe</th>
                  <th className="p-3 text-right">Saldo Credit Aktif</th>
                  <th className="p-3 text-right">Total Top Up</th>
                  <th className="p-3 text-right">Total Digunakan</th>
                  <th className="p-3 text-right">Total Analisis</th>
                  <th className="p-3">Mutasi Terakhir</th>
                  <th className="p-3 text-center">Aksi Manajemen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-mono">
                {wallets.map((w) => (
                  <tr key={w.userId} className="hover:bg-gray-800/30">
                    <td className="p-3 font-sans whitespace-nowrap">
                      <div className="font-bold text-white">{w.userName}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{w.email}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            w.role === 'ADMIN' ? 'bg-amber-500/20 text-amber-300' : 'bg-gray-800 text-gray-300'
                          }`}
                        >
                          {w.role}
                        </span>
                        {w.accountType && (
                          <span className="text-[10px] text-gray-400 font-sans">({w.accountType})</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right font-black text-[#E5B842] whitespace-nowrap text-sm">
                      {w.creditBalance.toLocaleString('id-ID')} Credit
                    </td>
                    <td className="p-3 text-right text-emerald-400 whitespace-nowrap">
                      +{w.totalCreditPurchased.toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-right text-rose-400 whitespace-nowrap">
                      -{w.totalCreditUsed.toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-right text-white font-bold whitespace-nowrap">
                      {w.totalAnalysis}x
                    </td>
                    <td className="p-3 text-gray-400 text-[11px] whitespace-nowrap">
                      {w.lastTransactionDate ? new Date(w.lastTransactionDate).toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleViewUserLedger(w)}
                          className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-[11px] font-bold transition-colors cursor-pointer"
                          title="Lihat Histori Mutasi Pengguna"
                        >
                          Histori
                        </button>
                        <button
                          onClick={() => {
                            setAdjustModalUser(w);
                            setAdjustType('ADD');
                            setAdjustAmount('');
                            setAdjustReason('');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold transition-colors cursor-pointer"
                          title="Tambah Saldo"
                        >
                          + Tambah
                        </button>
                        <button
                          onClick={() => {
                            setAdjustModalUser(w);
                            setAdjustType('DEDUCT');
                            setAdjustAmount('');
                            setAdjustReason('');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-bold transition-colors cursor-pointer"
                          title="Kurangi Saldo"
                        >
                          - Kurangi
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUBTAB 3: BUKU BESAR MUTASI (PERMANENT LEDGER)       */}
      {/* ==================================================== */}
      {activeSubTab === 'TRANSACTIONS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
              <input
                type="text"
                placeholder="Cari ID transaksi, keterangan, nama user..."
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                className="w-full bg-[#121620] border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#E5B842]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Tipe:</span>
              <select
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value)}
                className="bg-[#121620] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="ALL">Semua Mutasi</option>
                <option value="TOPUP">TOPUP</option>
                <option value="AI_USAGE">AI_USAGE</option>
                <option value="ADMIN_ADJUSTMENT">ADMIN_ADJUSTMENT</option>
                <option value="RECONCILIATION_REPAIR">RECONCILIATION_REPAIR</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-800 bg-[#0C0F16]">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#111520] text-gray-400 font-bold border-b border-gray-800">
                <tr>
                  <th className="p-3">ID Mutasi</th>
                  <th className="p-3">Pengguna</th>
                  <th className="p-3">Tipe</th>
                  <th className="p-3 text-right">Debit (+) / Kredit (-)</th>
                  <th className="p-3 text-right">Saldo Sebelum</th>
                  <th className="p-3 text-right">Saldo Sesudah</th>
                  <th className="p-3">Keterangan</th>
                  <th className="p-3">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-mono">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-800/30">
                    <td className="p-3 text-amber-300 whitespace-nowrap font-bold">{tx.id}</td>
                    <td className="p-3 font-sans whitespace-nowrap">
                      <div className="font-bold text-white">{tx.userName}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{tx.email}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tx.type === 'TOPUP'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : tx.type === 'AI_USAGE' || tx.type === 'ANALYSIS'
                            ? 'bg-blue-500/20 text-blue-400'
                            : tx.type === 'RECONCILIATION_REPAIR'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td
                      className={`p-3 text-right font-black whitespace-nowrap ${
                        tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {tx.amount > 0 ? `+${tx.amount.toLocaleString('id-ID')}` : tx.amount.toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-right text-gray-400 whitespace-nowrap">
                      {tx.balanceBefore?.toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-right font-bold text-white whitespace-nowrap">
                      {tx.balanceAfter?.toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 font-sans text-gray-300 max-w-xs truncate" title={tx.description}>
                      {tx.description}
                    </td>
                    <td className="p-3 text-gray-400 text-[11px] whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUBTAB 4: REKONSILIASI SALDO & AUDIT                 */}
      {/* ==================================================== */}
      {activeSubTab === 'RECONCILIATION' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-[#121620] border border-gray-800 p-4 rounded-xl">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#E5B842]" />
                Audit Rekonsiliasi Saldo vs Buku Besar Ledger
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Memverifikasi keselarasan saldo wallet setiap pengguna terhadap jumlah kumulatif seluruh mutasi ledger permanen.
              </p>
            </div>
            <button
              onClick={handleFetchReconciliation}
              disabled={isReconciling}
              className="px-4 py-2 rounded-xl bg-[#E5B842] hover:bg-[#d4a838] text-black text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-amber-500/10"
            >
              <RefreshCw className={`w-4 h-4 ${isReconciling ? 'animate-spin' : ''}`} />
              <span>Jalankan Audit Ulang</span>
            </button>
          </div>

          {reconReport && (
            <>
              {/* Reconciliation Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-[#121620] border border-gray-800 p-4 rounded-xl">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Akun Diaudit</div>
                  <div className="text-xl font-black text-white font-mono mt-1">{reconReport.totalWallets} Wallet</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">PostgreSQL Single Source</div>
                </div>

                <div className="bg-[#121620] border border-emerald-500/30 p-4 rounded-xl bg-emerald-500/5">
                  <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Saldo Selaras (MATCH)</div>
                  <div className="text-xl font-black text-emerald-400 font-mono mt-1">{reconReport.matchedCount} Akun</div>
                  <div className="text-[10px] text-emerald-300 mt-0.5">100% Valid & Akurat</div>
                </div>

                <div className={`bg-[#121620] p-4 rounded-xl border ${reconReport.mismatchedCount > 0 ? 'border-rose-500 bg-rose-500/10' : 'border-gray-800'}`}>
                  <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">Selisih (MISMATCH)</div>
                  <div className="text-xl font-black text-rose-400 font-mono mt-1">{reconReport.mismatchedCount} Akun</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Memerlukan Koreksi Audit</div>
                </div>

                <div className="bg-[#121620] border border-gray-800 p-4 rounded-xl">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Waktu Rekonsiliasi</div>
                  <div className="text-xs font-mono text-gray-200 mt-2">{new Date(reconReport.reconciledAt).toLocaleString('id-ID')}</div>
                </div>
              </div>

              {/* Detailed Reconciliation Table */}
              <div className="overflow-x-auto rounded-xl border border-gray-800 bg-[#0C0F16]">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-[#111520] text-gray-400 font-bold border-b border-gray-800">
                    <tr>
                      <th className="p-3">Pengguna</th>
                      <th className="p-3 text-right">Saldo Saat Ini</th>
                      <th className="p-3 text-right">Total Debit (+)</th>
                      <th className="p-3 text-right">Total Kredit (-)</th>
                      <th className="p-3 text-right">Saldo Seharusnya (Ledger)</th>
                      <th className="p-3 text-right">Selisih</th>
                      <th className="p-3 text-center">Status Audit</th>
                      <th className="p-3 text-center">Aksi Koreksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 font-mono">
                    {reconReport.items.map((item) => (
                      <tr key={item.userId} className={item.status === 'MISMATCH' ? 'bg-rose-500/10' : 'hover:bg-gray-800/30'}>
                        <td className="p-3 font-sans whitespace-nowrap">
                          <div className="font-bold text-white">{item.userName}</div>
                          <div className="text-[11px] text-gray-400 font-mono">{item.email}</div>
                        </td>
                        <td className="p-3 text-right font-black text-[#E5B842] whitespace-nowrap">
                          {item.walletBalance.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-right text-emerald-400 whitespace-nowrap">
                          +{item.totalPositive.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-right text-rose-400 whitespace-nowrap">
                          -{item.totalNegative.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-right font-bold text-white whitespace-nowrap">
                          {item.expectedBalance.toLocaleString('id-ID')}
                        </td>
                        <td
                          className={`p-3 text-right font-black whitespace-nowrap ${
                            item.difference === 0 ? 'text-gray-400' : 'text-rose-400'
                          }`}
                        >
                          {item.difference > 0 ? `+${item.difference.toLocaleString('id-ID')}` : item.difference.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              item.status === 'MATCH'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          {item.status === 'MISMATCH' ? (
                            <button
                              onClick={() => {
                                setReconRepairModal(item);
                                setRepairReason('Sinkronisasi penyesuaian saldo ledger otomatis.');
                              }}
                              className="px-3 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              Perbaiki Saldo
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-400 flex items-center justify-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Terverifikasi
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* SUBTAB 5: BACKUP & RESTORE EXCEL                     */}
      {/* ==================================================== */}
      {activeSubTab === 'EXCEL_BACKUP' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Export Full Ledger */}
            <div className="bg-[#121620] border border-gray-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#E5B842] mb-3">
                  <Download className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Ekspor Database & Ledger ke Excel (.xlsx)</h3>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  Unduh cadangan data institusional lengkap dalam format multi-sheet spreadsheet:
                </p>
                <ul className="text-xs text-gray-300 mt-3 space-y-1 font-mono">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Sheet 1: USERS (Profil Pengguna)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Sheet 2: CREDIT_WALLETS (Saldo Wallet)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Sheet 3: CREDIT_LEDGER (Seluruh Mutasi)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Sheet 4: TOP_UP_HISTORY (Permintaan & Konfirmasi)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Sheet 5: AI_USAGE (Log Pemakaian Analisis)
                  </li>
                </ul>
              </div>

              <button
                onClick={handleExportExcel}
                disabled={isExportingExcel}
                className="w-full py-3 rounded-xl bg-[#E5B842] hover:bg-[#d4a838] text-black font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer"
              >
                <Download className={`w-4 h-4 ${isExportingExcel ? 'animate-bounce' : ''}`} />
                <span>{isExportingExcel ? 'Membuat File Excel...' : 'Download Excel Backup (.xlsx)'}</span>
              </button>
            </div>

            {/* Card 2: Import & Restore */}
            <div className="bg-[#121620] border border-gray-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3">
                  <Upload className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">Import & Restore dari File Excel</h3>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  Unggah file cadangan Excel untuk memvalidasi dan memulihkan data. Sistem akan menampilkan pratinjau perubahan (preview diff) sebelum menerapkan transaksi ke database PostgreSQL.
                </p>

                <div className="mt-4 p-4 border-2 border-dashed border-gray-700 hover:border-[#E5B842] rounded-xl text-center transition-all bg-[#0C0F16]">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="excel-upload-input"
                  />
                  <label htmlFor="excel-upload-input" className="cursor-pointer block">
                    <FileSpreadsheet className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <span className="text-xs font-bold text-gray-200 block">
                      {importFile ? importFile.name : 'Pilih atau Seret File Excel (.xlsx)'}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-1 block">Maksimal ukuran file 10MB</span>
                  </label>
                </div>
              </div>

              {isPreviewingImport && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-300 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memeriksa & memvalidasi struktur file Excel...</span>
                </div>
              )}
            </div>
          </div>

          {/* Import Preview Card if file parsed */}
          {importPreview && (
            <div className="bg-[#121620] border-2 border-amber-500/40 rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#E5B842]" />
                    Pratinjau Data Import: {importPreview.fileName}
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Ditemukan {importPreview.totalRowsParsed} baris total data di {importPreview.sheets.length} sheet.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-300">Mode Eksekusi:</span>
                  <div className="flex bg-[#0C0F16] border border-gray-800 rounded-xl p-1">
                    <button
                      onClick={() => setImportMode('MERGE')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        importMode === 'MERGE' ? 'bg-[#E5B842] text-black' : 'text-gray-400'
                      }`}
                    >
                      MERGE (Aman)
                    </button>
                    <button
                      onClick={() => setImportMode('RESTORE')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        importMode === 'RESTORE' ? 'bg-rose-600 text-white' : 'text-gray-400'
                      }`}
                    >
                      RESTORE (Total)
                    </button>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-[#0C0F16] border border-gray-800 rounded-xl">
                  <div className="text-[10px] text-gray-400 uppercase font-bold">Data Baru</div>
                  <div className="text-base font-black text-emerald-400 font-mono mt-1">
                    {importPreview.newRecordsCount} Item
                  </div>
                </div>
                <div className="p-3 bg-[#0C0F16] border border-gray-800 rounded-xl">
                  <div className="text-[10px] text-gray-400 uppercase font-bold">Data Sudah Ada</div>
                  <div className="text-base font-black text-gray-300 font-mono mt-1">
                    {importPreview.existingRecordsCount} Item
                  </div>
                </div>
                <div className="p-3 bg-[#0C0F16] border border-gray-800 rounded-xl">
                  <div className="text-[10px] text-gray-400 uppercase font-bold">Potensi Konflik</div>
                  <div className="text-base font-black text-amber-400 font-mono mt-1">
                    {importPreview.conflictsCount} Item
                  </div>
                </div>
                <div className="p-3 bg-[#0C0F16] border border-gray-800 rounded-xl">
                  <div className="text-[10px] text-gray-400 uppercase font-bold">Baris Tidak Valid</div>
                  <div className="text-base font-black text-rose-400 font-mono mt-1">
                    {importPreview.invalidRecordsCount} Item
                  </div>
                </div>
              </div>

              {/* Conflicts List if any */}
              {importPreview.conflicts.length > 0 && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Pemberitahuan Konflik Nilai ({importPreview.conflicts.length}):
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 font-mono text-[11px] text-gray-300">
                    {importPreview.conflicts.map((c, idx) => (
                      <div key={idx} className="p-1.5 bg-[#0C0F16] rounded border border-amber-500/20">
                        [{c.sheet}] {c.description} (Database: {c.currentValue} | File: {c.importedValue})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setImportPreview(null);
                    setImportFile(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  onClick={handleCommitImport}
                  disabled={isCommittingImport}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    importMode === 'RESTORE'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-[#E5B842] hover:bg-[#d4a838] text-black'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>{isCommittingImport ? 'Mengeksekusi Transaksi...' : `Terapkan Import (${importMode})`}</span>
                </button>
              </div>
            </div>
          )}

          {/* Commit Result Banner */}
          {commitResult && (
            <div className="bg-emerald-500/15 border border-emerald-500/30 p-6 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>{commitResult.message}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono text-gray-300">
                <div>User Baru: {commitResult.importedUsersCount}</div>
                <div>Wallet Diproses: {commitResult.importedWalletsCount}</div>
                <div>Mutasi Ledger: {commitResult.importedLedgersCount}</div>
                <div>Top Up Record: {commitResult.importedTopupsCount}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* SUBTAB 6: PENGATURAN REKENING TRANSFER               */}
      {/* ==================================================== */}
      {activeSubTab === 'SETTINGS' && (
        <div className="bg-[#121620] border border-gray-800 rounded-2xl p-6 max-w-2xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <Building className="w-4 h-4 text-[#E5B842]" />
            Pengaturan Rekening Bank Tujuan Transfer (Manual Top Up)
          </h3>

          <form onSubmit={handleSavePaymentSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Nama Bank / Provider</label>
              <input
                type="text"
                value={bankForm.bankName || ''}
                onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                placeholder="Contoh: BCA (Bank Central Asia)"
                required
                className="w-full bg-[#0C0F16] border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E5B842]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Nomor Rekening</label>
              <input
                type="text"
                value={bankForm.accountNumber || ''}
                onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                placeholder="Contoh: 0771360059"
                required
                className="w-full bg-[#0C0F16] border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E5B842] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Nama Pemilik Rekening</label>
              <input
                type="text"
                value={bankForm.accountName || ''}
                onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })}
                placeholder="Contoh: Sri Hartono"
                required
                className="w-full bg-[#0C0F16] border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E5B842]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Petunjuk Pembayaran untuk Pengguna</label>
              <textarea
                value={bankForm.instructions || ''}
                onChange={(e) => setBankForm({ ...bankForm, instructions: e.target.value })}
                rows={4}
                className="w-full bg-[#0C0F16] border border-gray-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#E5B842]"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingSettings}
              className="w-full py-3 rounded-xl bg-[#E5B842] hover:bg-[#d4a838] text-black font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10"
            >
              <Check className="w-4 h-4" />
              <span>{isSavingSettings ? 'Menyimpan...' : 'Simpan Pengaturan Rekening'}</span>
            </button>
          </form>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: DETAIL & KONFIRMASI TOP UP                  */}
      {/* ==================================================== */}
      {selectedTopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121620] border border-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#E5B842]" />
                Detail Pengajuan Top Up
              </h3>
              <button
                onClick={() => setSelectedTopup(null)}
                className="text-gray-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs font-sans">
              <div className="flex justify-between py-1 border-b border-gray-800/40">
                <span className="text-gray-400">ID Permintaan:</span>
                <span className="font-mono text-amber-300 font-bold">{selectedTopup.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/40">
                <span className="text-gray-400">Nama Pengguna:</span>
                <span className="text-white font-bold">{selectedTopup.userName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/40">
                <span className="text-gray-400">Email:</span>
                <span className="text-gray-300 font-mono">{selectedTopup.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/40">
                <span className="text-gray-400">Nominal Transfer:</span>
                <span className="text-white font-mono font-black text-sm">
                  Rp{selectedTopup.amountIdr.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/40">
                <span className="text-gray-400">Credit Didapatkan:</span>
                <span className="text-[#E5B842] font-mono font-bold">
                  +{selectedTopup.creditRequested.toLocaleString('id-ID')} Credit
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/40">
                <span className="text-gray-400">Rekening Tujuan:</span>
                <span className="text-gray-300">{selectedTopup.bankName} - {selectedTopup.accountNumber}</span>
              </div>
              {selectedTopup.referenceNotes && (
                <div className="py-1 border-b border-gray-800/40">
                  <span className="text-gray-400 block mb-1">Catatan Transfer dari User:</span>
                  <span className="text-amber-200 bg-amber-500/10 p-2 rounded block font-mono text-[11px]">
                    {selectedTopup.referenceNotes}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Status Saat Ini:</span>
                <span className="font-bold text-amber-300">{selectedTopup.status}</span>
              </div>
            </div>

            {selectedTopup.status === 'PENDING' && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">
                    Catatan Admin (Opsional untuk konfirmasi, wajib untuk tolak):
                  </label>
                  <input
                    type="text"
                    value={adminNoteInput}
                    onChange={(e) => setAdminNoteInput(e.target.value)}
                    placeholder="Contoh: Pembayaran telah masuk di mutasi BCA"
                    className="w-full bg-[#0C0F16] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5B842]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => handleRejectTopUp(selectedTopup.id)}
                    disabled={isProcessingAction}
                    className="py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Tolak Top Up
                  </button>
                  <button
                    onClick={() => handleConfirmTopUp(selectedTopup.id)}
                    disabled={isProcessingAction}
                    className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold transition-colors cursor-pointer shadow-lg shadow-emerald-500/20"
                  >
                    {isProcessingAction ? 'Memproses...' : 'Konfirmasi & Tambah'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: PENYESUAIAN SALDO (ADJUST CREDIT)          */}
      {/* ==================================================== */}
      {adjustModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121620] border border-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#E5B842]" />
                Penyesuaian Saldo AI Credit Pengguna
              </h3>
              <button
                onClick={() => setAdjustModalUser(null)}
                className="text-gray-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#0C0F16] p-3 rounded-xl border border-gray-800 text-xs space-y-1">
              <div className="text-gray-400">Pengguna: <span className="font-bold text-white">{adjustModalUser.userName}</span></div>
              <div className="text-gray-400">Email: <span className="text-gray-300 font-mono">{adjustModalUser.email}</span></div>
              <div className="text-gray-400">Saldo Saat Ini: <span className="font-mono font-black text-[#E5B842]">{adjustModalUser.creditBalance.toLocaleString('id-ID')} Credit</span></div>
            </div>

            <form onSubmit={handleAdjustCreditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Aksi Penyesuaian</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('ADD')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      adjustType === 'ADD'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : 'bg-[#0C0F16] border-gray-800 text-gray-400'
                    }`}
                  >
                    + Tambah Saldo (Credit In)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('DEDUCT')}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      adjustType === 'DEDUCT'
                        ? 'bg-red-500/20 border-red-500 text-red-400'
                        : 'bg-[#0C0F16] border-gray-800 text-gray-400'
                    }`}
                  >
                    - Kurangi Saldo (Credit Out)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Jumlah Nominal Credit</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="Contoh: 1000"
                  required
                  className="w-full bg-[#0C0F16] border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E5B842] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Alasan Penyesuaian (Wajib untuk Audit)</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Contoh: Bonus kompensasi maintenance / koreksi manual"
                  required
                  className="w-full bg-[#0C0F16] border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E5B842]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalUser(null)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-300 text-xs font-bold hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessingAction}
                  className="flex-1 py-2.5 rounded-xl bg-[#E5B842] text-black text-xs font-bold hover:bg-[#d4a838] transition-colors cursor-pointer shadow-lg shadow-amber-500/10"
                >
                  {isProcessingAction ? 'Menyimpan...' : 'Terapkan Penyesuaian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 3: REKONSILIASI PERBAIKAN SALDO               */}
      {/* ==================================================== */}
      {reconRepairModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121620] border border-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-rose-400" />
                Perbaiki Saldo Rekonsiliasi
              </h3>
              <button onClick={() => setReconRepairModal(null)} className="text-gray-400 hover:text-white text-xs cursor-pointer">
                ✕
              </button>
            </div>

            <div className="bg-[#0C0F16] p-3 rounded-xl border border-gray-800 text-xs space-y-2">
              <div className="text-gray-400">Pengguna: <span className="font-bold text-white">{reconRepairModal.userName}</span></div>
              <div className="text-gray-400">Saldo Saat Ini di Wallet: <span className="font-mono font-bold text-[#E5B842]">{reconRepairModal.walletBalance.toLocaleString('id-ID')} Credit</span></div>
              <div className="text-gray-400">Saldo Seharusnya (Buku Besar): <span className="font-mono font-bold text-emerald-400">{reconRepairModal.expectedBalance.toLocaleString('id-ID')} Credit</span></div>
              <div className="text-rose-400 font-bold">Koreksi Penyelarasan: {reconRepairModal.difference > 0 ? `-${reconRepairModal.difference}` : `+${Math.abs(reconRepairModal.difference)}`} Credit</div>
            </div>

            <form onSubmit={handleRepairReconciliation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Keterangan / Alasan Audit Rekonsiliasi</label>
                <input
                  type="text"
                  value={repairReason}
                  onChange={(e) => setRepairReason(e.target.value)}
                  placeholder="Contoh: Koreksi audit penyesuaian saldo sistem"
                  required
                  className="w-full bg-[#0C0F16] border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E5B842]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReconRepairModal(null)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-300 text-xs font-bold hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isRepairing}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer"
                >
                  {isRepairing ? 'Menyelaraskan...' : 'Sinkronkan Saldo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 4: INDIVIDUAL USER LEDGER HISTORY              */}
      {/* ==================================================== */}
      {selectedUserLedger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121620] border border-gray-800 rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-[#E5B842]" />
                Histori Mutasi: {selectedUserLedger.user.userName} ({selectedUserLedger.user.creditBalance.toLocaleString('id-ID')} Credit)
              </h3>
              <button onClick={() => setSelectedUserLedger(null)} className="text-gray-400 hover:text-white text-xs cursor-pointer">
                ✕
              </button>
            </div>

            {isLoadingUserLedger ? (
              <div className="p-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Memuat data mutasi...
              </div>
            ) : selectedUserLedger.items.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500">Belum ada catatan mutasi untuk pengguna ini.</div>
            ) : (
              <div className="max-h-96 overflow-y-auto overflow-x-auto rounded-xl border border-gray-800">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#111520] text-gray-400 font-bold border-b border-gray-800">
                    <tr>
                      <th className="p-2.5">Waktu</th>
                      <th className="p-2.5">Tipe</th>
                      <th className="p-2.5 text-right">Mutasi</th>
                      <th className="p-2.5 text-right">Saldo Sesudah</th>
                      <th className="p-2.5">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 text-[11px]">
                    {selectedUserLedger.items.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-800/20">
                        <td className="p-2.5 text-gray-400 whitespace-nowrap">{new Date(tx.createdAt).toLocaleDateString('id-ID')}</td>
                        <td className="p-2.5 whitespace-nowrap">{tx.type}</td>
                        <td className={`p-2.5 text-right font-bold whitespace-nowrap ${tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {tx.amount > 0 ? `+${tx.amount.toLocaleString('id-ID')}` : tx.amount.toLocaleString('id-ID')}
                        </td>
                        <td className="p-2.5 text-right font-bold text-white whitespace-nowrap">{tx.balanceAfter?.toLocaleString('id-ID')}</td>
                        <td className="p-2.5 font-sans text-gray-300 max-w-xs truncate">{tx.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
