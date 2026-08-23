// SPILLA AI Credit System Types (Saldo Internal - NOT Crypto/Blockchain)

export type CreditTransactionType =
  | 'TOPUP'
  | 'AI_USAGE'
  | 'ANALYSIS'
  | 'REFUND'
  | 'ADMIN_ADD'
  | 'ADMIN_DEDUCT'
  | 'ADMIN_ADJUSTMENT'
  | 'IMPORT_ADJUSTMENT'
  | 'RESTORE'
  | 'RECONCILIATION_REPAIR'
  | 'PROMO'
  | 'ADJUSTMENT';

export type TopUpStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';

export interface UserCreditWallet {
  id: string;
  userId: string;
  creditBalance: number; // 1 Credit = Rp1
  totalCreditPurchased: number;
  totalCreditUsed: number;
  totalAnalysis: number;
  updatedAt: string;
  createdAt: string;
}

export interface UserWalletWithProfile extends UserCreditWallet {
  userName: string;
  email: string;
  role: string;
  status: string;
  accountType?: string;
  lastTransactionDate?: string;
}

export interface TopUpRequest {
  id: string; // e.g. TOPUP-20260820-000001
  userId: string;
  userName: string;
  email: string;
  phoneNumber?: string;
  amountIdr: number; // e.g. 50000
  creditRequested: number; // e.g. 50000
  paymentMethod: 'MANUAL_BANK_TRANSFER';
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: TopUpStatus;
  createdAt: string;
  confirmedAt?: string;
  confirmedBy?: string;
  confirmedByName?: string;
  adminNotes?: string;
  referenceNotes?: string;
}

export interface CreditTransaction {
  id: string; // e.g. CTX-20260820-000001
  userId: string;
  walletId?: string;
  userName?: string;
  email?: string;
  type: CreditTransactionType;
  amount: number; // positive or negative
  creditIn: number;
  creditOut: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId?: string; // TopUp ID or Analysis ID
  description: string;
  performedBy?: string;
  adminId?: string;
  adminName?: string;
  createdAt: string;
}

export interface AiAnalysisHistoryRecord {
  id: string; // ANL-XXXXXX
  userId: string;
  userName?: string;
  email?: string;
  symbol: string;
  timeframe: string;
  analysisType: string;
  creditCost: number; // 100
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
  snapshotId?: string;
  signalId?: string;
  createdAt: string;
}

export interface PaymentSettings {
  bankName: string;
  accountNumber: string;
  accountName: string;
  instructions: string;
  isActive: boolean;
  updatedAt: string;
}

export interface AdminCreditStats {
  totalUsersCount?: number;
  totalCreditSoldIdr: number;
  creditInUserWallets: number;
  totalCreditUsed: number;
  totalAiAnalysis: number;
  pendingTopUpCount: number;
  pendingTopUpAmountIdr: number;
}

export interface CreditReconciliationItem {
  userId: string;
  userName: string;
  email: string;
  walletBalance: number;
  expectedBalance: number;
  difference: number;
  totalPositive: number;
  totalNegative: number;
  ledgerCount: number;
  status: 'MATCH' | 'MISMATCH';
  lastTransactionDate?: string;
}

export interface CreditReconciliationReport {
  totalWallets: number;
  matchedCount: number;
  mismatchedCount: number;
  totalWalletBalance: number;
  totalLedgerBalance: number;
  reconciledAt: string;
  items: CreditReconciliationItem[];
}

export interface ExcelImportConflict {
  sheet: string;
  id: string;
  description: string;
  currentValue: any;
  importedValue: any;
}

export interface ExcelImportInvalidRow {
  sheet: string;
  rowNumber: number;
  reason: string;
  data: any;
}

export interface ExcelImportPreview {
  fileName: string;
  totalRowsParsed: number;
  sheets: {
    name: string;
    rowCount: number;
  }[];
  newRecordsCount: number;
  existingRecordsCount: number;
  conflictsCount: number;
  invalidRecordsCount: number;
  newUsers: any[];
  newWallets: any[];
  newLedgers: any[];
  newTopups: any[];
  newAiUsage: any[];
  conflicts: ExcelImportConflict[];
  invalidRows: ExcelImportInvalidRow[];
}

export interface ExcelImportCommitResult {
  success: boolean;
  mode: 'MERGE' | 'RESTORE';
  importedUsersCount: number;
  importedWalletsCount: number;
  importedLedgersCount: number;
  importedTopupsCount: number;
  importedAiUsageCount: number;
  auditLogId?: string;
  timestamp: string;
  message: string;
}

