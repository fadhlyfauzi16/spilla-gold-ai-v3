import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

export interface UserRecord {
  id: string;
  fullName: string;
  email: string;
  password: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  accountType: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TradingAccountRecord {
  id: string;
  userId?: string | null;
  accountNumber: string;
  broker?: string | null;
  brokerServer: string;
  accountType: string;
  currency: string;
  workerId?: string | null;
  symbol?: string | null;
  canonicalSymbol?: string | null;
  brokerSymbol?: string | null;
  executionEnabled: boolean;
  workerOnline: boolean;
  lastHeartbeat?: Date | null;
  balance: number;
  equity: number;
  margin?: number;
  freeMargin: number;
  marginLevel?: number;
  floatingProfitLoss?: number;
  leverage: number;
  isLive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TradingAccountCredentialRecord {
  id: string;
  tradingAccountId: string;
  encryptedPassword: string;
  iv: string;
  authTag: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditWalletRecord {
  id: string;
  userId: string;
  balance: number;
  totalTopUp: number;
  totalUsed: number;
  totalAnalysis: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditLedgerRecord {
  id: string;
  userId: string;
  walletId: string;
  type: 'TOPUP' | 'AI_USAGE' | 'ADMIN_ADJUSTMENT' | 'REFUND' | 'IMPORT_ADJUSTMENT' | 'RESTORE' | 'RECONCILIATION_REPAIR';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceId?: string | null;
  description: string;
  performedBy?: string | null;
  createdAt: Date;
}

export interface CreditTopUpRecord {
  id: string;
  userId: string;
  walletId?: string | null;
  amountIdr: number;
  creditRequested: number;
  paymentMethod: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';
  referenceNotes?: string | null;
  adminNotes?: string | null;
  confirmedBy?: string | null;
  confirmedByName?: string | null;
  confirmedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AiAnalysisLogRecord {
  id: string;
  userId: string;
  symbol: string;
  timeframe: string;
  analysisType: string;
  creditCost: number;
  status: string;
  errorMessage?: string | null;
  snapshotId?: string | null;
  signalId?: string | null;
  createdAt: Date;
}

export interface CreditPaymentSettingRecord {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  instructions: string;
  isActive: boolean;
  updatedAt: Date;
}

export interface CreditAuditLogRecord {
  id: string;
  adminUserId: string;
  action: string;
  targetUserId?: string | null;
  amount?: number | null;
  balanceBefore?: number | null;
  balanceAfter?: number | null;
  referenceId?: string | null;
  metadata?: string | null;
  createdAt: Date;
}

// Memory fallback store for CreditWallet
class MemoryCreditWalletStore {
  private wallets: CreditWalletRecord[] = [];

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    const now = new Date();
    this.wallets = [
      {
        id: 'wal-usr-admin-001',
        userId: 'usr-admin-001',
        balance: 100000.0,
        totalTopUp: 100000.0,
        totalUsed: 0.0,
        totalAnalysis: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'wal-usr-trader-002',
        userId: 'usr-trader-002',
        balance: 25000.0,
        totalTopUp: 25000.0,
        totalUsed: 0.0,
        totalAnalysis: 0,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  async count(args?: { where?: any }): Promise<number> {
    if (!args?.where) return this.wallets.length;
    const { userId } = args.where;
    return this.wallets.filter((w) => {
      if (userId && w.userId !== userId) return false;
      return true;
    }).length;
  }

  async findUnique(args: { where: { userId?: string; id?: string } }): Promise<CreditWalletRecord | null> {
    const { userId, id } = args.where;
    if (userId) {
      return this.wallets.find((w) => w.userId === userId) || null;
    }
    if (id) {
      return this.wallets.find((w) => w.id === id) || null;
    }
    return null;
  }

  async findFirst(args?: { where?: any }): Promise<CreditWalletRecord | null> {
    if (!args?.where) return this.wallets[0] || null;
    const { userId, id } = args.where;
    return this.wallets.find((w) => {
      if (userId && w.userId !== userId) return false;
      if (id && w.id !== id) return false;
      return true;
    }) || null;
  }

  async findMany(args?: { where?: any; orderBy?: any }): Promise<CreditWalletRecord[]> {
    let list = [...this.wallets];
    if (args?.where) {
      const { userId } = args.where;
      list = list.filter((w) => {
        if (userId && w.userId !== userId) return false;
        return true;
      });
    }
    if (args?.orderBy?.balance === 'desc') {
      list.sort((a, b) => b.balance - a.balance);
    } else if (args?.orderBy?.balance === 'asc') {
      list.sort((a, b) => a.balance - b.balance);
    }
    return list;
  }

  async create(args: { data: any }): Promise<CreditWalletRecord> {
    const now = new Date();
    const existing = this.wallets.find((w) => w.userId === args.data.userId);
    if (existing) {
      return existing; // idempotency protection: never overwrite existing
    }
    const newWallet: CreditWalletRecord = {
      id: args.data.id || `wal-${args.data.userId || Date.now()}`,
      userId: args.data.userId,
      balance: args.data.balance !== undefined ? Number(args.data.balance) : 0,
      totalTopUp: args.data.totalTopUp !== undefined ? Number(args.data.totalTopUp) : (args.data.balance || 0),
      totalUsed: args.data.totalUsed !== undefined ? Number(args.data.totalUsed) : 0,
      totalAnalysis: args.data.totalAnalysis !== undefined ? Number(args.data.totalAnalysis) : 0,
      createdAt: now,
      updatedAt: now,
    };
    this.wallets.push(newWallet);
    return newWallet;
  }

  async update(args: { where: { userId?: string; id?: string }; data: any }): Promise<CreditWalletRecord> {
    const idx = this.wallets.findIndex((w) => {
      if (args.where.userId && w.userId === args.where.userId) return true;
      if (args.where.id && w.id === args.where.id) return true;
      return false;
    });
    if (idx === -1) {
      throw new Error(`CreditWallet not found for update`);
    }
    const existing = this.wallets[idx];
    const updated: CreditWalletRecord = {
      ...existing,
      ...args.data,
      balance: args.data.balance !== undefined ? Number(args.data.balance) : existing.balance,
      totalTopUp: args.data.totalTopUp !== undefined ? Number(args.data.totalTopUp) : existing.totalTopUp,
      totalUsed: args.data.totalUsed !== undefined ? Number(args.data.totalUsed) : existing.totalUsed,
      totalAnalysis: args.data.totalAnalysis !== undefined ? Number(args.data.totalAnalysis) : existing.totalAnalysis,
      updatedAt: new Date(),
    };
    this.wallets[idx] = updated;
    return updated;
  }

  async upsert(args: { where: { userId: string }; create: any; update: any }): Promise<CreditWalletRecord> {
    const existing = this.wallets.find((w) => w.userId === args.where.userId);
    if (existing) {
      return this.update({ where: { userId: args.where.userId }, data: args.update });
    }
    return this.create({ data: { ...args.create, userId: args.where.userId } });
  }

  async delete(args: { where: { userId?: string; id?: string } }): Promise<CreditWalletRecord> {
    const idx = this.wallets.findIndex((w) => {
      if (args.where.userId && w.userId === args.where.userId) return true;
      if (args.where.id && w.id === args.where.id) return true;
      return false;
    });
    if (idx === -1) {
      throw new Error(`CreditWallet not found for delete`);
    }
    return this.wallets.splice(idx, 1)[0];
  }
}

// Memory fallback store for CreditLedger
class MemoryCreditLedgerStore {
  private ledgers: CreditLedgerRecord[] = [];

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    const now = new Date(Date.now() - 86400000);
    this.ledgers = [
      {
        id: 'CLG-INIT-ADMIN',
        userId: 'usr-admin-001',
        walletId: 'wal-usr-admin-001',
        type: 'TOPUP',
        amount: 100000.0,
        balanceBefore: 0.0,
        balanceAfter: 100000.0,
        referenceId: 'INIT-ADMIN-ALLOCATION',
        description: 'Initial Master Admin AI Credit Allocation',
        performedBy: 'SYSTEM',
        createdAt: now,
      },
      {
        id: 'CLG-INIT-TRADER',
        userId: 'usr-trader-002',
        walletId: 'wal-usr-trader-002',
        type: 'TOPUP',
        amount: 25000.0,
        balanceBefore: 0.0,
        balanceAfter: 25000.0,
        referenceId: 'INIT-TRADER-ALLOCATION',
        description: 'Welcome Bonus AI Credit',
        performedBy: 'SYSTEM',
        createdAt: now,
      },
    ];
  }

  async count(args?: { where?: any }): Promise<number> {
    if (!args?.where) return this.ledgers.length;
    const { userId, type } = args.where;
    return this.ledgers.filter((l) => {
      if (userId && l.userId !== userId) return false;
      if (type && l.type !== type) return false;
      return true;
    }).length;
  }

  async findMany(args?: { where?: any; orderBy?: any; take?: number; skip?: number }): Promise<CreditLedgerRecord[]> {
    let list = [...this.ledgers];
    if (args?.where) {
      const { userId, type, walletId } = args.where;
      list = list.filter((l) => {
        if (userId && l.userId !== userId) return false;
        if (walletId && l.walletId !== walletId) return false;
        if (type && l.type !== type) return false;
        return true;
      });
    }
    if (args?.orderBy?.createdAt === 'asc') {
      list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    } else {
      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    if (args?.skip) {
      list = list.slice(args.skip);
    }
    if (args?.take) {
      list = list.slice(0, args.take);
    }
    return list;
  }

  async create(args: { data: any }): Promise<CreditLedgerRecord> {
    const newLedger: CreditLedgerRecord = {
      id: args.data.id || `CLG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      userId: args.data.userId,
      walletId: args.data.walletId || `wal-${args.data.userId}`,
      type: args.data.type || 'TOPUP',
      amount: Number(args.data.amount),
      balanceBefore: Number(args.data.balanceBefore),
      balanceAfter: Number(args.data.balanceAfter),
      referenceId: args.data.referenceId || null,
      description: args.data.description || '',
      performedBy: args.data.performedBy || null,
      createdAt: args.data.createdAt ? new Date(args.data.createdAt) : new Date(),
    };
    this.ledgers.push(newLedger);
    return newLedger;
  }

  async createMany(args: { data: any[] }): Promise<{ count: number }> {
    let count = 0;
    for (const item of args.data) {
      await this.create({ data: item });
      count++;
    }
    return { count };
  }
}

// Memory fallback store for CreditTopUp
class MemoryCreditTopUpStore {
  private topups: CreditTopUpRecord[] = [];

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    const now = new Date(Date.now() - 43200000);
    this.topups = [
      {
        id: 'TOPUP-20260820-000001',
        userId: 'usr-trader-002',
        walletId: 'wal-usr-trader-002',
        amountIdr: 25000,
        creditRequested: 25000,
        paymentMethod: 'MANUAL_BANK_TRANSFER',
        bankName: 'BCA (Bank Central Asia)',
        accountNumber: '0771360059',
        accountName: 'Sri Hartono',
        status: 'CONFIRMED',
        referenceNotes: 'AIMS-TRADER-INITIAL',
        adminNotes: 'Confirmed by Admin',
        confirmedBy: 'usr-admin-001',
        confirmedByName: 'Master Admin SPILLA',
        confirmedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  async count(args?: { where?: any }): Promise<number> {
    if (!args?.where) return this.topups.length;
    const { userId, status } = args.where;
    return this.topups.filter((t) => {
      if (userId && t.userId !== userId) return false;
      if (status && t.status !== status) return false;
      return true;
    }).length;
  }

  async findUnique(args: { where: { id: string } }): Promise<CreditTopUpRecord | null> {
    return this.topups.find((t) => t.id === args.where.id) || null;
  }

  async findMany(args?: { where?: any; orderBy?: any }): Promise<CreditTopUpRecord[]> {
    let list = [...this.topups];
    if (args?.where) {
      const { userId, status } = args.where;
      list = list.filter((t) => {
        if (userId && t.userId !== userId) return false;
        if (status && t.status !== status) return false;
        return true;
      });
    }
    if (args?.orderBy?.createdAt === 'asc') {
      list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    } else {
      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    return list;
  }

  async create(args: { data: any }): Promise<CreditTopUpRecord> {
    const now = new Date();
    const newTopUp: CreditTopUpRecord = {
      id: args.data.id || `TOPUP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: args.data.userId,
      walletId: args.data.walletId || null,
      amountIdr: Number(args.data.amountIdr),
      creditRequested: Number(args.data.creditRequested),
      paymentMethod: args.data.paymentMethod || 'MANUAL_BANK_TRANSFER',
      bankName: args.data.bankName || 'BCA (Bank Central Asia)',
      accountNumber: args.data.accountNumber || '0771360059',
      accountName: args.data.accountName || 'Sri Hartono',
      status: args.data.status || 'PENDING',
      referenceNotes: args.data.referenceNotes || null,
      adminNotes: args.data.adminNotes || null,
      confirmedBy: args.data.confirmedBy || null,
      confirmedByName: args.data.confirmedByName || null,
      confirmedAt: args.data.confirmedAt ? new Date(args.data.confirmedAt) : null,
      createdAt: now,
      updatedAt: now,
    };
    this.topups.push(newTopUp);
    return newTopUp;
  }

  async update(args: { where: { id: string }; data: any }): Promise<CreditTopUpRecord> {
    const idx = this.topups.findIndex((t) => t.id === args.where.id);
    if (idx === -1) throw new Error(`CreditTopUp not found`);
    const existing = this.topups[idx];
    const updated: CreditTopUpRecord = {
      ...existing,
      ...args.data,
      confirmedAt: args.data.confirmedAt !== undefined ? (args.data.confirmedAt ? new Date(args.data.confirmedAt) : null) : existing.confirmedAt,
      updatedAt: new Date(),
    };
    this.topups[idx] = updated;
    return updated;
  }
}

// Memory fallback store for AiAnalysisLog
class MemoryAiAnalysisLogStore {
  private logs: AiAnalysisLogRecord[] = [];

  async count(args?: { where?: any }): Promise<number> {
    if (!args?.where) return this.logs.length;
    const { userId, status } = args.where;
    return this.logs.filter((l) => {
      if (userId && l.userId !== userId) return false;
      if (status && l.status !== status) return false;
      return true;
    }).length;
  }

  async findMany(args?: { where?: any; orderBy?: any; take?: number }): Promise<AiAnalysisLogRecord[]> {
    let list = [...this.logs];
    if (args?.where) {
      const { userId, status } = args.where;
      list = list.filter((l) => {
        if (userId && l.userId !== userId) return false;
        if (status && l.status !== status) return false;
        return true;
      });
    }
    if (args?.orderBy?.createdAt === 'asc') {
      list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    } else {
      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    if (args?.take) {
      list = list.slice(0, args.take);
    }
    return list;
  }

  async create(args: { data: any }): Promise<AiAnalysisLogRecord> {
    const newLog: AiAnalysisLogRecord = {
      id: args.data.id || `ANL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: args.data.userId,
      symbol: args.data.symbol || 'XAUUSD',
      timeframe: args.data.timeframe || 'H1',
      analysisType: args.data.analysisType || 'LIVE_AI_ANALYSIS',
      creditCost: Number(args.data.creditCost) || 100,
      status: args.data.status || 'SUCCESS',
      errorMessage: args.data.errorMessage || null,
      snapshotId: args.data.snapshotId || null,
      signalId: args.data.signalId || null,
      createdAt: new Date(),
    };
    this.logs.push(newLog);
    return newLog;
  }
}

// Memory fallback store for CreditPaymentSetting
class MemoryCreditPaymentSettingStore {
  private setting: CreditPaymentSettingRecord = {
    id: 'pay-setting-default',
    bankName: 'BCA (Bank Central Asia)',
    accountNumber: '0771360059',
    accountName: 'Sri Hartono',
    instructions: '1. Transfer via ATM / Mobile Banking / Internet Banking ke nomor rekening di atas.\n2. Cantumkan ID Top Up atau Nama Anda di berita transfer.\n3. Saldo AI Credit akan bertambah otomatis setelah diverifikasi oleh Admin.',
    isActive: true,
    updatedAt: new Date(),
  };

  async findFirst(): Promise<CreditPaymentSettingRecord> {
    return { ...this.setting };
  }

  async upsert(args: { where?: any; create: any; update: any }): Promise<CreditPaymentSettingRecord> {
    this.setting = {
      ...this.setting,
      ...args.update,
      updatedAt: new Date(),
    };
    return { ...this.setting };
  }
}

// Memory fallback store for CreditAuditLog
class MemoryCreditAuditLogStore {
  private logs: CreditAuditLogRecord[] = [];

  async create(args: { data: any }): Promise<CreditAuditLogRecord> {
    const newAudit: CreditAuditLogRecord = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      adminUserId: args.data.adminUserId,
      action: args.data.action,
      targetUserId: args.data.targetUserId || null,
      amount: args.data.amount !== undefined ? Number(args.data.amount) : null,
      balanceBefore: args.data.balanceBefore !== undefined ? Number(args.data.balanceBefore) : null,
      balanceAfter: args.data.balanceAfter !== undefined ? Number(args.data.balanceAfter) : null,
      referenceId: args.data.referenceId || null,
      metadata: args.data.metadata ? (typeof args.data.metadata === 'string' ? args.data.metadata : JSON.stringify(args.data.metadata)) : null,
      createdAt: new Date(),
    };
    this.logs.push(newAudit);
    return newAudit;
  }

  async findMany(args?: { where?: any; orderBy?: any; take?: number }): Promise<CreditAuditLogRecord[]> {
    let list = [...this.logs];
    if (args?.where) {
      const { adminUserId, targetUserId } = args.where;
      list = list.filter((a) => {
        if (adminUserId && a.adminUserId !== adminUserId) return false;
        if (targetUserId && a.targetUserId !== targetUserId) return false;
        return true;
      });
    }
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    if (args?.take) list = list.slice(0, args.take);
    return list;
  }
}

// Memory fallback store for TradingAccount if Postgres is unavailable
class MemoryTradingAccountStore {
  private accounts: TradingAccountRecord[] = [];

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    const now = new Date();
    // Default demo accounts (unregistered user accounts start empty for user registration testing)
    this.accounts = [
      {
        id: 'acc-mt5-demo',
        userId: 'usr-trader-002',
        accountNumber: 'MT5-DEMO-01',
        broker: 'AIMS',
        brokerServer: 'AIMS-Live',
        accountType: 'STANDARD',
        currency: 'USD',
        workerId: null,
        symbol: 'XAUUSD',
        executionEnabled: false,
        workerOnline: false,
        lastHeartbeat: null,
        balance: 10000.0,
        equity: 10000.0,
        freeMargin: 10000.0,
        leverage: 100,
        isLive: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'acc-88201923',
        userId: 'usr-trader-002',
        accountNumber: '88201923',
        broker: 'AIMS',
        brokerServer: 'AIMS-Live',
        accountType: 'PRO',
        currency: 'USD',
        workerId: null,
        symbol: 'XAUUSD',
        executionEnabled: false,
        workerOnline: false,
        lastHeartbeat: null,
        balance: 15420.0,
        equity: 15420.0,
        freeMargin: 15420.0,
        leverage: 100,
        isLive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'acc-88204811',
        userId: 'usr-admin-001',
        accountNumber: '88204811',
        broker: 'AIMS',
        brokerServer: 'AIMS-Live',
        accountType: 'INSTITUTIONAL',
        currency: 'USD',
        workerId: null,
        symbol: 'XAUUSD',
        executionEnabled: false,
        workerOnline: false,
        lastHeartbeat: null,
        balance: 24850.0,
        equity: 24850.0,
        freeMargin: 24850.0,
        leverage: 100,
        isLive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  async count(args?: { where?: any }): Promise<number> {
    if (!args?.where) return this.accounts.length;
    const { accountNumber, workerId, userId } = args.where;
    return this.accounts.filter((a) => {
      if (userId && a.userId !== userId) return false;
      if (accountNumber && a.accountNumber !== accountNumber) return false;
      if (workerId && a.workerId !== workerId) return false;
      return true;
    }).length;
  }

  async findUnique(args: { where: { accountNumber?: string; id?: string } }): Promise<TradingAccountRecord | null> {
    const { accountNumber, id } = args.where;
    if (accountNumber) {
      const normalized = accountNumber.trim();
      return this.accounts.find((a) => a.accountNumber === normalized) || null;
    }
    if (id) {
      return this.accounts.find((a) => a.id === id) || null;
    }
    return null;
  }

  async findFirst(args?: { where?: any }): Promise<TradingAccountRecord | null> {
    if (!args?.where) return this.accounts[0] || null;
    const { accountNumber, id, workerId, userId } = args.where;
    return this.accounts.find((a) => {
      if (userId && a.userId !== userId) return false;
      if (accountNumber && a.accountNumber !== accountNumber.trim()) return false;
      if (id && a.id !== id) return false;
      if (workerId && a.workerId !== workerId) return false;
      return true;
    }) || null;
  }

  async findMany(args?: { where?: any; orderBy?: any }): Promise<TradingAccountRecord[]> {
    let list = [...this.accounts];
    if (args?.where) {
      const { workerOnline, isLive, userId } = args.where;
      list = list.filter((a) => {
        if (userId && a.userId !== userId) return false;
        if (workerOnline !== undefined && a.workerOnline !== workerOnline) return false;
        if (isLive !== undefined && a.isLive !== isLive) return false;
        return true;
      });
    }
    return list;
  }

  async create(args: { data: any }): Promise<TradingAccountRecord> {
    const now = new Date();
    const newAcc: TradingAccountRecord = {
      id: `acc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: args.data.userId || null,
      accountNumber: String(args.data.accountNumber).trim(),
      broker: args.data.broker || 'AIMS',
      brokerServer: args.data.brokerServer || 'AIMS-Live',
      accountType: args.data.accountType || 'STANDARD',
      currency: args.data.currency || 'USD',
      workerId: args.data.workerId || null,
      symbol: args.data.symbol || 'XAUUSD',
      executionEnabled: args.data.executionEnabled ?? false,
      workerOnline: args.data.workerOnline ?? false,
      lastHeartbeat: args.data.lastHeartbeat || null,
      balance: args.data.balance !== undefined ? Number(args.data.balance) : 0,
      equity: args.data.equity !== undefined ? Number(args.data.equity) : 0,
      margin: args.data.margin !== undefined ? Number(args.data.margin) : 0,
      freeMargin: args.data.freeMargin !== undefined ? Number(args.data.freeMargin) : 0,
      marginLevel: args.data.marginLevel !== undefined ? Number(args.data.marginLevel) : 0,
      floatingProfitLoss: args.data.floatingProfitLoss !== undefined ? Number(args.data.floatingProfitLoss) : (args.data.profit !== undefined ? Number(args.data.profit) : 0),
      leverage: args.data.leverage !== undefined ? Number(args.data.leverage) : 0,
      isLive: args.data.isLive !== undefined ? Boolean(args.data.isLive) : false,
      createdAt: now,
      updatedAt: now,
    };
    this.accounts.push(newAcc);
    return newAcc;
  }

  async update(args: { where: { accountNumber?: string; id?: string }; data: any }): Promise<TradingAccountRecord> {
    const idx = this.accounts.findIndex((a) => {
      if (args.where.accountNumber && a.accountNumber === args.where.accountNumber.trim()) return true;
      if (args.where.id && a.id === args.where.id) return true;
      return false;
    });
    if (idx === -1) {
      throw new Error(`TradingAccount not found for update`);
    }
    const existing = this.accounts[idx];
    const updated: TradingAccountRecord = {
      ...existing,
      ...args.data,
      updatedAt: new Date(),
    };
    this.accounts[idx] = updated;
    return updated;
  }

  async delete(args: { where: { accountNumber?: string; id?: string } }): Promise<TradingAccountRecord> {
    const idx = this.accounts.findIndex((a) => {
      if (args.where.accountNumber && a.accountNumber === args.where.accountNumber.trim()) return true;
      if (args.where.id && a.id === args.where.id) return true;
      return false;
    });
    if (idx === -1) {
      throw new Error(`TradingAccount not found for delete`);
    }
    const deleted = this.accounts.splice(idx, 1)[0];
    return deleted;
  }
}

// Memory fallback store for TradingAccountCredential if Postgres is unavailable
class MemoryTradingAccountCredentialStore {
  private credentials: TradingAccountCredentialRecord[] = [];

  async findUnique(args: { where: { tradingAccountId?: string; id?: string } }): Promise<TradingAccountCredentialRecord | null> {
    const { tradingAccountId, id } = args.where;
    if (tradingAccountId) {
      return this.credentials.find((c) => c.tradingAccountId === tradingAccountId) || null;
    }
    if (id) {
      return this.credentials.find((c) => c.id === id) || null;
    }
    return null;
  }

  async create(args: { data: any }): Promise<TradingAccountCredentialRecord> {
    const now = new Date();
    const existingIdx = this.credentials.findIndex((c) => c.tradingAccountId === args.data.tradingAccountId);
    if (existingIdx !== -1) {
      this.credentials.splice(existingIdx, 1);
    }
    const newCred: TradingAccountCredentialRecord = {
      id: `cred-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tradingAccountId: args.data.tradingAccountId,
      encryptedPassword: args.data.encryptedPassword,
      iv: args.data.iv,
      authTag: args.data.authTag,
      createdAt: now,
      updatedAt: now,
    };
    this.credentials.push(newCred);
    return newCred;
  }

  async delete(args: { where: { tradingAccountId?: string; id?: string } }): Promise<TradingAccountCredentialRecord | null> {
    const idx = this.credentials.findIndex((c) => {
      if (args.where.tradingAccountId && c.tradingAccountId === args.where.tradingAccountId) return true;
      if (args.where.id && c.id === args.where.id) return true;
      return false;
    });
    if (idx === -1) return null;
    return this.credentials.splice(idx, 1)[0];
  }

  async deleteMany(args?: { where?: { tradingAccountId?: string } }): Promise<{ count: number }> {
    if (!args?.where?.tradingAccountId) {
      const count = this.credentials.length;
      this.credentials = [];
      return { count };
    }
    const before = this.credentials.length;
    this.credentials = this.credentials.filter((c) => c.tradingAccountId !== args.where?.tradingAccountId);
    return { count: before - this.credentials.length };
  }
}

// Memory fallback store if Postgres is unavailable
class MemoryUserStore {
  private users: UserRecord[] = [];

  constructor() {
    this.seedDefaults();
  }

  private async seedDefaults() {
    const adminHash = await bcrypt.hash('Admin123!', 10);
    const traderHash = await bcrypt.hash('trader123', 10);
    const now = new Date();

    this.users = [
      {
        id: 'usr-admin-001',
        fullName: 'Master Admin SPILLA',
        email: 'admin@spillagold.com',
        password: adminHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        accountType: 'Institutional Quantitative',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'usr-trader-002',
        fullName: 'Institutional Trader',
        email: 'trader@spillagold.com',
        password: traderHash,
        role: 'USER',
        status: 'ACTIVE',
        accountType: 'Trader Individu',
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  async count(args?: { where?: any }): Promise<number> {
    if (!args?.where) return this.users.length;
    const { status, role } = args.where;
    return this.users.filter((u) => {
      if (status && u.status !== status) return false;
      if (role && u.role !== role) return false;
      return true;
    }).length;
  }

  async findUnique(args: { where: { email?: string; id?: string } }): Promise<UserRecord | null> {
    const { email, id } = args.where;
    if (email) {
      const normalized = email.trim().toLowerCase();
      return this.users.find((u) => u.email.toLowerCase() === normalized) || null;
    }
    if (id) {
      return this.users.find((u) => u.id === id) || null;
    }
    return null;
  }

  async findMany(args?: { orderBy?: any; select?: any }): Promise<UserRecord[]> {
    let sorted = [...this.users];
    if (args?.orderBy?.createdAt === 'desc') {
      sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    return sorted;
  }

  async create(args: { data: any }): Promise<UserRecord> {
    const now = new Date();
    const newUser: UserRecord = {
      id: args.data.id || `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      fullName: args.data.fullName,
      email: args.data.email.trim().toLowerCase(),
      password: args.data.password,
      role: args.data.role || 'USER',
      status: args.data.status || 'ACTIVE',
      accountType: args.data.accountType || 'Trader Individu',
      createdAt: now,
      updatedAt: now,
    };
    this.users.push(newUser);
    return newUser;
  }

  async update(args: { where: { id: string }; data: any; select?: any }): Promise<UserRecord> {
    const idx = this.users.findIndex((u) => u.id === args.where.id);
    if (idx === -1) throw new Error(`User with ID ${args.where.id} not found.`);
    const existing = this.users[idx];
    const updated: UserRecord = {
      ...existing,
      ...args.data,
      updatedAt: new Date(),
    };
    this.users[idx] = updated;
    return updated;
  }

  async delete(args: { where: { id: string } }): Promise<UserRecord> {
    const idx = this.users.findIndex((u) => u.id === args.where.id);
    if (idx === -1) throw new Error(`User with ID ${args.where.id} not found.`);
    const [removed] = this.users.splice(idx, 1);
    return removed;
  }
}

const memoryStore = new MemoryUserStore();
const memoryAccountStore = new MemoryTradingAccountStore();
const memoryCredentialStore = new MemoryTradingAccountCredentialStore();
const memoryWalletStore = new MemoryCreditWalletStore();
const memoryLedgerStore = new MemoryCreditLedgerStore();
const memoryTopUpStore = new MemoryCreditTopUpStore();
const memoryAiAnalysisStore = new MemoryAiAnalysisLogStore();
const memoryPaymentSettingStore = new MemoryCreditPaymentSettingStore();
const memoryAuditLogStore = new MemoryCreditAuditLogStore();

let realPrisma: PrismaClient | null = null;
let useRealPrisma = false;

const connectionString = process.env.DATABASE_URL;
if (connectionString && (connectionString.startsWith('postgres://') || connectionString.startsWith('postgresql://'))) {
  try {
    const pool = new pg.Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    realPrisma = new PrismaClient({ adapter });
    useRealPrisma = true;
  } catch (e) {
    console.warn('[Prisma Init Warning] Failed to initialize Postgres adapter, falling back to Memory Stores.');
  }
}

export const prisma: any = {
  $transaction: async (arg: any) => {
    if (useRealPrisma && realPrisma) {
      try {
        if (typeof arg === 'function') {
          return await (realPrisma as any).$transaction(arg);
        } else if (Array.isArray(arg)) {
          return await (realPrisma as any).$transaction(arg);
        }
      } catch (err) {
        console.error('[Prisma Transaction Error]', err);
        throw err;
      }
    }
    // Fallback transaction executor: pass the prisma object to callback
    if (typeof arg === 'function') {
      return await arg(prisma);
    } else if (Array.isArray(arg)) {
      return await Promise.all(arg);
    }
    return null;
  },
  user: {
    count: async (args?: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await realPrisma.user.count(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryStore.count(args);
    },
    findUnique: async (args: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await realPrisma.user.findUnique(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryStore.findUnique(args);
    },
    findMany: async (args?: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await realPrisma.user.findMany(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryStore.findMany(args);
    },
    create: async (args: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await realPrisma.user.create(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryStore.create(args);
    },
    update: async (args: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await realPrisma.user.update(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryStore.update(args);
    },
    delete: async (args: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await realPrisma.user.delete(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryStore.delete(args);
    },
  },
  creditWallet: {
    count: async (args?: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).creditWallet.count(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryWalletStore.count(args);
    },
    findUnique: async (args: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).creditWallet.findUnique(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryWalletStore.findUnique(args);
    },
    findFirst: async (args?: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).creditWallet.findFirst(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryWalletStore.findFirst(args);
    },
    findMany: async (args?: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).creditWallet.findMany(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryWalletStore.findMany(args);
    },
    create: async (args: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).creditWallet.create(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryWalletStore.create(args);
    },
    update: async (args: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).creditWallet.update(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryWalletStore.update(args);
    },
    upsert: async (args: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).creditWallet.upsert(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryWalletStore.upsert(args);
    },
    delete: async (args: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).creditWallet.delete(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryWalletStore.delete(args);
    },
  },
  creditLedger: {
    count: async (args?: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).creditLedger.count(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryLedgerStore.count(args);
    },
    findMany: async (args?: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).creditLedger.findMany(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryLedgerStore.findMany(args);
    },
    create: async (args: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).creditLedger.create(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryLedgerStore.create(args);
    },
    createMany: async (args: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).creditLedger.createMany(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryLedgerStore.createMany(args);
    },
  },
  creditTopUp: {
    count: async (args?: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).creditTopUp.count(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryTopUpStore.count(args);
    },
    findUnique: async (args: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).creditTopUp.findUnique(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryTopUpStore.findUnique(args);
    },
    findMany: async (args?: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).creditTopUp.findMany(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryTopUpStore.findMany(args);
    },
    create: async (args: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).creditTopUp.create(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryTopUpStore.create(args);
    },
    update: async (args: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).creditTopUp.update(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryTopUpStore.update(args);
    },
  },
  aiAnalysisLog: {
    count: async (args?: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).aiAnalysisLog.count(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryAiAnalysisStore.count(args);
    },
    findMany: async (args?: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).aiAnalysisLog.findMany(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryAiAnalysisStore.findMany(args);
    },
    create: async (args: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).aiAnalysisLog.create(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryAiAnalysisStore.create(args);
    },
  },
  creditPaymentSetting: {
    findFirst: async (args?: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).creditPaymentSetting.findFirst(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryPaymentSettingStore.findFirst();
    },
    upsert: async (args: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).creditPaymentSetting.upsert(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryPaymentSettingStore.upsert(args);
    },
  },
  creditAuditLog: {
    create: async (args: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).creditAuditLog.create(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryAuditLogStore.create(args);
    },
    findMany: async (args?: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).creditAuditLog.findMany(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryAuditLogStore.findMany(args);
    },
  },
  tradingAccount: {
    count: async (args?: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).tradingAccount.count(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryAccountStore.count(args);
    },
    findUnique: async (args: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).tradingAccount.findUnique(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryAccountStore.findUnique(args);
    },
    findFirst: async (args?: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).tradingAccount.findFirst(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryAccountStore.findFirst(args);
    },
    findMany: async (args?: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).tradingAccount.findMany(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryAccountStore.findMany(args);
    },
    create: async (args: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).tradingAccount.create(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryAccountStore.create(args);
    },
    update: async (args: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).tradingAccount.update(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryAccountStore.update(args);
    },
    delete: async (args: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).tradingAccount.delete(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryAccountStore.delete(args);
    },
  },
  tradingAccountCredential: {
    findUnique: async (args: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).tradingAccountCredential.findUnique(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryCredentialStore.findUnique(args);
    },
    create: async (args: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).tradingAccountCredential.create(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryCredentialStore.create(args);
    },
    delete: async (args: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).tradingAccountCredential.delete(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryCredentialStore.delete(args);
    },
    deleteMany: async (args: any) => {
      if (useRealPrisma && realPrisma) {
        try { return await (realPrisma as any).tradingAccountCredential.deleteMany(args); } catch (err) { useRealPrisma = false; }
      }
      return memoryCredentialStore.deleteMany(args);
    },
  },
};

/**
 * Returns the singleton Prisma client instance (or architecture fallback)
 */
export function getPrismaClient() {
  return prisma;
}

export async function seedDefaultUsers() {
  try {
    const count = await prisma.user.count();
    if (count === 0 && useRealPrisma && realPrisma) {
      console.log('[Prisma Seed] Seeding default admin and trader accounts into Postgres...');
      const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
      const traderPasswordHash = await bcrypt.hash('trader123', 10);

      const adminUser = await realPrisma.user.create({
        data: {
          fullName: 'Master Admin SPILLA',
          email: 'admin@spillagold.com',
          password: adminPasswordHash,
          role: 'ADMIN',
          status: 'ACTIVE',
          accountType: 'Institutional Quantitative',
        },
      });

      const traderUser = await realPrisma.user.create({
        data: {
          fullName: 'Institutional Trader',
          email: 'trader@spillagold.com',
          password: traderPasswordHash,
          role: 'USER',
          status: 'ACTIVE',
          accountType: 'Trader Individu',
        },
      });

      // Seed Initial Wallets in Postgres ONLY if not existing
      await (realPrisma as any).creditWallet.upsert({
        where: { userId: adminUser.id },
        create: {
          userId: adminUser.id,
          balance: 100000.0,
          totalTopUp: 100000.0,
          totalUsed: 0.0,
          totalAnalysis: 0,
        },
        update: {}, // NEVER reset existing balance
      });

      await (realPrisma as any).creditWallet.upsert({
        where: { userId: traderUser.id },
        create: {
          userId: traderUser.id,
          balance: 25000.0,
          totalTopUp: 25000.0,
          totalUsed: 0.0,
          totalAnalysis: 0,
        },
        update: {}, // NEVER reset existing balance
      });

      console.log('[Prisma Seed] Default accounts and initial wallets configured safely.');
    }
  } catch (err) {
    console.warn('[Prisma Seed Note] Database seed skipped, memory user store active.');
  }
}

seedDefaultUsers();


