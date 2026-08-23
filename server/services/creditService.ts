import * as XLSX from 'xlsx';
import { prisma } from '../db/prisma.js';
import {
  UserCreditWallet,
  UserWalletWithProfile,
  TopUpRequest,
  CreditTransaction,
  AiAnalysisHistoryRecord,
  PaymentSettings,
  AdminCreditStats,
  CreditReconciliationReport,
  CreditReconciliationItem,
  ExcelImportPreview,
  ExcelImportCommitResult,
  ExcelImportConflict,
  ExcelImportInvalidRow,
} from '../../src/types/credit.js';

export class CreditService {
  /**
   * Helper: Resolve User details from Prisma
   */
  private async resolveUser(userId: string): Promise<{ fullName: string; email: string; role: string; status: string; accountType?: string } | null> {
    try {
      const u = await prisma.user.findUnique({ where: { id: userId } });
      if (u) {
        return {
          fullName: u.fullName,
          email: u.email,
          role: u.role,
          status: u.status,
          accountType: u.accountType || undefined,
        };
      }
    } catch (err) {
      console.warn('[CreditService] Prisma resolve user fallback:', userId);
    }
    return null;
  }

  /**
   * Get or safely initialize User Credit Wallet in Database
   */
  public async getWallet(userId: string): Promise<UserCreditWallet> {
    let wallet = await prisma.creditWallet.findUnique({ where: { userId } });
    if (!wallet) {
      // Upsert to guarantee idempotency and prevent balance overwrites
      wallet = await prisma.creditWallet.upsert({
        where: { userId },
        create: {
          userId,
          balance: 0.0,
          totalTopUp: 0.0,
          totalUsed: 0.0,
          totalAnalysis: 0,
        },
        update: {}, // DO NOT overwrite if already exists
      });
    }

    return {
      id: wallet.id,
      userId: wallet.userId,
      creditBalance: Number(wallet.balance),
      totalCreditPurchased: Number(wallet.totalTopUp),
      totalCreditUsed: Number(wallet.totalUsed),
      totalAnalysis: Number(wallet.totalAnalysis),
      createdAt: wallet.createdAt instanceof Date ? wallet.createdAt.toISOString() : String(wallet.createdAt),
      updatedAt: wallet.updatedAt instanceof Date ? wallet.updatedAt.toISOString() : String(wallet.updatedAt),
    };
  }

  /**
   * Pre-check if User has enough balance for Live AI Analysis (Cost: 100 Credit)
   */
  public async checkCanAnalyze(userId: string, cost = 100): Promise<{ canAnalyze: boolean; currentBalance: number; required: number; availableAnalysis: number }> {
    const wallet = await this.getWallet(userId);
    const canAnalyze = wallet.creditBalance >= cost;
    return {
      canAnalyze,
      currentBalance: wallet.creditBalance,
      required: cost,
      availableAnalysis: Math.floor(wallet.creditBalance / cost),
    };
  }

  /**
   * Deduct 100 Credits upon SUCCESSFUL Live AI Analysis (ATOMIC TRANSACTION)
   */
  public async deductForAnalysis(
    userId: string,
    details: {
      symbol: string;
      timeframe: string;
      analysisType?: string;
      snapshotId?: string;
      signalId?: string;
    }
  ): Promise<{ success: boolean; newBalance: number; transactionId: string; analysisId: string }> {
    const cost = 100;

    return await prisma.$transaction(async (tx: any) => {
      let wallet = await tx.creditWallet.findUnique({ where: { userId } });
      if (!wallet) {
        wallet = await tx.creditWallet.create({
          data: {
            userId,
            balance: 0.0,
            totalTopUp: 0.0,
            totalUsed: 0.0,
            totalAnalysis: 0,
          },
        });
      }

      const balanceBefore = Number(wallet.balance);
      if (balanceBefore < cost) {
        throw new Error(`INSUFFICIENT_CREDIT: Saldo Anda ${balanceBefore} Credit tidak mencukupi (dibutuhkan ${cost} Credit).`);
      }

      const balanceAfter = balanceBefore - cost;
      const user = await tx.user.findUnique({ where: { id: userId } });
      const analysisId = `ANL-${Date.now().toString().slice(-8)}`;
      const txId = `CLG-${Date.now().toString().slice(-8)}`;

      // 1. Update Wallet
      await tx.creditWallet.update({
        where: { userId },
        data: {
          balance: balanceAfter,
          totalUsed: Number(wallet.totalUsed) + cost,
          totalAnalysis: Number(wallet.totalAnalysis) + 1,
        },
      });

      // 2. Create Ledger entry
      await tx.creditLedger.create({
        data: {
          id: txId,
          userId,
          walletId: wallet.id,
          type: 'AI_USAGE',
          amount: -cost,
          balanceBefore,
          balanceAfter,
          referenceId: analysisId,
          description: `Live Analysis AI (${details.symbol} ${details.timeframe || 'H1'})`,
          performedBy: userId,
        },
      });

      // 3. Create AI Analysis Log
      await tx.aiAnalysisLog.create({
        data: {
          id: analysisId,
          userId,
          symbol: details.symbol || 'XAUUSD',
          timeframe: details.timeframe || 'H1',
          analysisType: details.analysisType || 'LIVE_AI_ANALYSIS',
          creditCost: cost,
          status: 'SUCCESS',
          snapshotId: details.snapshotId || null,
          signalId: details.signalId || null,
        },
      });

      console.log(`[CREDIT SERVICE] Deducted ${cost} Credit for user ${userId}. Balance: ${balanceBefore} -> ${balanceAfter}`);

      return {
        success: true,
        newBalance: balanceAfter,
        transactionId: txId,
        analysisId,
      };
    });
  }

  /**
   * Record Failed Analysis (Zero credit deducted)
   */
  public async recordFailedAnalysis(
    userId: string,
    details: {
      symbol: string;
      timeframe: string;
      analysisType?: string;
      error: string;
    }
  ): Promise<AiAnalysisHistoryRecord> {
    const analysisId = `ANL-FAIL-${Date.now().toString().slice(-6)}`;
    const user = await this.resolveUser(userId);

    const log = await prisma.aiAnalysisLog.create({
      data: {
        id: analysisId,
        userId,
        symbol: details.symbol || 'XAUUSD',
        timeframe: details.timeframe || 'H1',
        analysisType: details.analysisType || 'LIVE_AI_ANALYSIS',
        creditCost: 0,
        status: 'FAILED',
        errorMessage: details.error,
      },
    });

    return {
      id: log.id,
      userId: log.userId,
      userName: user?.fullName || 'User',
      email: user?.email || '',
      symbol: log.symbol,
      timeframe: log.timeframe,
      analysisType: log.analysisType,
      creditCost: 0,
      status: 'FAILED',
      errorMessage: log.errorMessage || undefined,
      createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : String(log.createdAt),
    };
  }

  /**
   * Create Top Up Request
   */
  public async createTopUpRequest(
    userId: string,
    amountIdr: number,
    referenceNotes?: string
  ): Promise<TopUpRequest> {
    if (amountIdr < 1000) {
      throw new Error('Minimal Top Up adalah Rp1.000 (1.000 Credit).');
    }

    const user = await this.resolveUser(userId);
    const settings = await this.getPaymentSettings();

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const topupId = `TOPUP-${dateStr}-${randomSuffix}`;

    const wallet = await this.getWallet(userId);

    const topup = await prisma.creditTopUp.create({
      data: {
        id: topupId,
        userId,
        walletId: wallet.id,
        amountIdr,
        creditRequested: amountIdr, // 1 IDR = 1 Credit
        paymentMethod: 'MANUAL_BANK_TRANSFER',
        bankName: settings.bankName,
        accountNumber: settings.accountNumber,
        accountName: settings.accountName,
        status: 'PENDING',
        referenceNotes: referenceNotes?.trim() || null,
      },
    });

    console.log(`[CREDIT SERVICE] Top Up Request Created: ${topup.id} by ${userId} for Rp${amountIdr.toLocaleString('id-ID')}`);

    return {
      id: topup.id,
      userId: topup.userId,
      userName: user?.fullName || 'User',
      email: user?.email || '',
      amountIdr: Number(topup.amountIdr),
      creditRequested: Number(topup.creditRequested),
      paymentMethod: 'MANUAL_BANK_TRANSFER',
      bankName: topup.bankName,
      accountNumber: topup.accountNumber,
      accountName: topup.accountName,
      status: topup.status,
      referenceNotes: topup.referenceNotes || undefined,
      createdAt: topup.createdAt instanceof Date ? topup.createdAt.toISOString() : String(topup.createdAt),
    };
  }

  /**
   * Confirm Top Up Request (Admin Action - Double Credit Safe & Atomic)
   */
  public async confirmTopUpRequest(
    topupId: string,
    adminId: string,
    adminName: string,
    adminNotes?: string
  ): Promise<{ success: boolean; topup: TopUpRequest; wallet: UserCreditWallet }> {
    return await prisma.$transaction(async (tx: any) => {
      const topup = await tx.creditTopUp.findUnique({ where: { id: topupId } });
      if (!topup) {
        throw new Error('Top Up Request tidak ditemukan.');
      }

      if (topup.status === 'CONFIRMED') {
        throw new Error('Top Up Request ini sudah pernah dikonfirmasi sebelumnya.');
      }

      if (topup.status === 'REJECTED') {
        throw new Error('Top Up Request yang sudah ditolak tidak dapat dikonfirmasi.');
      }

      let wallet = await tx.creditWallet.findUnique({ where: { userId: topup.userId } });
      if (!wallet) {
        wallet = await tx.creditWallet.create({
          data: {
            userId: topup.userId,
            balance: 0,
            totalTopUp: 0,
            totalUsed: 0,
            totalAnalysis: 0,
          },
        });
      }

      const creditToAdd = Number(topup.creditRequested);
      const balanceBefore = Number(wallet.balance);
      const balanceAfter = balanceBefore + creditToAdd;
      const now = new Date();

      // 1. Update Wallet Balance
      const updatedWallet = await tx.creditWallet.update({
        where: { userId: topup.userId },
        data: {
          balance: balanceAfter,
          totalTopUp: Number(wallet.totalTopUp) + creditToAdd,
        },
      });

      // 2. Create Ledger Transaction
      const txId = `CLG-${Date.now().toString().slice(-8)}`;
      await tx.creditLedger.create({
        data: {
          id: txId,
          userId: topup.userId,
          walletId: wallet.id,
          type: 'TOPUP',
          amount: creditToAdd,
          balanceBefore,
          balanceAfter,
          referenceId: topup.id,
          description: `Top Up SPILLA AI Credit (Bank ${topup.bankName}) - Konfirmasi Admin ${adminName}`,
          performedBy: adminId,
        },
      });

      // 3. Update Top Up status
      const updatedTopUp = await tx.creditTopUp.update({
        where: { id: topupId },
        data: {
          status: 'CONFIRMED',
          confirmedBy: adminId,
          confirmedByName: adminName,
          confirmedAt: now,
          adminNotes: adminNotes?.trim() || 'Pembayaran telah diverifikasi & Credit berhasil masuk.',
        },
      });

      // 4. Audit Log
      await tx.creditAuditLog.create({
        data: {
          adminUserId: adminId,
          action: 'TOPUP_CONFIRM',
          targetUserId: topup.userId,
          amount: creditToAdd,
          balanceBefore,
          balanceAfter,
          referenceId: topup.id,
          metadata: JSON.stringify({ adminName, adminNotes }),
        },
      });

      console.log(`[CREDIT SERVICE] Admin ${adminName} confirmed Top Up ${topup.id}: Added ${creditToAdd} Credits to ${topup.userId}. Balance: ${balanceBefore} -> ${balanceAfter}`);

      const user = await tx.user.findUnique({ where: { id: topup.userId } });

      return {
        success: true,
        topup: {
          id: updatedTopUp.id,
          userId: updatedTopUp.userId,
          userName: user?.fullName || 'User',
          email: user?.email || '',
          amountIdr: Number(updatedTopUp.amountIdr),
          creditRequested: Number(updatedTopUp.creditRequested),
          paymentMethod: 'MANUAL_BANK_TRANSFER',
          bankName: updatedTopUp.bankName,
          accountNumber: updatedTopUp.accountNumber,
          accountName: updatedTopUp.accountName,
          status: updatedTopUp.status,
          referenceNotes: updatedTopUp.referenceNotes || undefined,
          adminNotes: updatedTopUp.adminNotes || undefined,
          confirmedBy: updatedTopUp.confirmedBy || undefined,
          confirmedByName: updatedTopUp.confirmedByName || undefined,
          confirmedAt: updatedTopUp.confirmedAt instanceof Date ? updatedTopUp.confirmedAt.toISOString() : undefined,
          createdAt: updatedTopUp.createdAt instanceof Date ? updatedTopUp.createdAt.toISOString() : String(updatedTopUp.createdAt),
        },
        wallet: {
          id: updatedWallet.id,
          userId: updatedWallet.userId,
          creditBalance: Number(updatedWallet.balance),
          totalCreditPurchased: Number(updatedWallet.totalTopUp),
          totalCreditUsed: Number(updatedWallet.totalUsed),
          totalAnalysis: Number(updatedWallet.totalAnalysis),
          createdAt: updatedWallet.createdAt instanceof Date ? updatedWallet.createdAt.toISOString() : String(updatedWallet.createdAt),
          updatedAt: updatedWallet.updatedAt instanceof Date ? updatedWallet.updatedAt.toISOString() : String(updatedWallet.updatedAt),
        },
      };
    });
  }

  /**
   * Reject Top Up Request (Admin Action)
   */
  public async rejectTopUpRequest(
    topupId: string,
    adminId: string,
    adminName: string,
    adminNotes: string
  ): Promise<TopUpRequest> {
    return await prisma.$transaction(async (tx: any) => {
      const topup = await tx.creditTopUp.findUnique({ where: { id: topupId } });
      if (!topup) {
        throw new Error('Top Up Request tidak ditemukan.');
      }

      if (topup.status === 'CONFIRMED') {
        throw new Error('Top Up Request yang telah dikonfirmasi tidak dapat ditolak.');
      }

      const updated = await tx.creditTopUp.update({
        where: { id: topupId },
        data: {
          status: 'REJECTED',
          confirmedBy: adminId,
          confirmedByName: adminName,
          confirmedAt: new Date(),
          adminNotes: adminNotes?.trim() || 'Pembayaran ditolak oleh Admin.',
        },
      });

      await tx.creditAuditLog.create({
        data: {
          adminUserId: adminId,
          action: 'TOPUP_REJECT',
          targetUserId: topup.userId,
          referenceId: topup.id,
          metadata: JSON.stringify({ adminName, adminNotes }),
        },
      });

      const user = await tx.user.findUnique({ where: { id: topup.userId } });

      return {
        id: updated.id,
        userId: updated.userId,
        userName: user?.fullName || 'User',
        email: user?.email || '',
        amountIdr: Number(updated.amountIdr),
        creditRequested: Number(updated.creditRequested),
        paymentMethod: 'MANUAL_BANK_TRANSFER',
        bankName: updated.bankName,
        accountNumber: updated.accountNumber,
        accountName: updated.accountName,
        status: updated.status,
        referenceNotes: updated.referenceNotes || undefined,
        adminNotes: updated.adminNotes || undefined,
        confirmedBy: updated.confirmedBy || undefined,
        confirmedByName: updated.confirmedByName || undefined,
        confirmedAt: updated.confirmedAt instanceof Date ? updated.confirmedAt.toISOString() : undefined,
        createdAt: updated.createdAt instanceof Date ? updated.createdAt.toISOString() : String(updated.createdAt),
      };
    });
  }

  /**
   * Admin Manual Adjust Credit (ADD / DEDUCT with mandatory reason & atomic transaction)
   */
  public async adjustCredit(
    adminId: string,
    adminName: string,
    targetUserId: string,
    adjustment: {
      type: 'ADD' | 'DEDUCT';
      amount: number;
      reason: string;
    }
  ): Promise<{ success: boolean; wallet: UserCreditWallet; transaction: CreditTransaction }> {
    if (!adjustment.reason || adjustment.reason.trim().length < 3) {
      throw new Error('Alasan penyesuaian saldo wajib diisi minimal 3 karakter.');
    }

    if (adjustment.amount <= 0) {
      throw new Error('Nominal penyesuaian harus lebih besar dari 0.');
    }

    return await prisma.$transaction(async (tx: any) => {
      let wallet = await tx.creditWallet.findUnique({ where: { userId: targetUserId } });
      if (!wallet) {
        wallet = await tx.creditWallet.create({
          data: {
            userId: targetUserId,
            balance: 0,
            totalTopUp: 0,
            totalUsed: 0,
            totalAnalysis: 0,
          },
        });
      }

      const balanceBefore = Number(wallet.balance);
      let balanceAfter: number;
      let signedAmount: number;
      let creditIn = 0;
      let creditOut = 0;

      if (adjustment.type === 'ADD') {
        balanceAfter = balanceBefore + adjustment.amount;
        signedAmount = adjustment.amount;
        creditIn = adjustment.amount;
        await tx.creditWallet.update({
          where: { userId: targetUserId },
          data: {
            balance: balanceAfter,
            totalTopUp: Number(wallet.totalTopUp) + adjustment.amount,
          },
        });
      } else {
        if (balanceBefore < adjustment.amount) {
          throw new Error(`Saldo pengguna (${balanceBefore}) tidak mencukupi untuk dikurangi sejumlah ${adjustment.amount}.`);
        }
        balanceAfter = balanceBefore - adjustment.amount;
        signedAmount = -adjustment.amount;
        creditOut = adjustment.amount;
        await tx.creditWallet.update({
          where: { userId: targetUserId },
          data: {
            balance: balanceAfter,
            totalUsed: Number(wallet.totalUsed) + adjustment.amount,
          },
        });
      }

      const txId = `CLG-${Date.now().toString().slice(-8)}`;
      const adjId = `ADJ-${Date.now().toString().slice(-6)}`;
      const user = await tx.user.findUnique({ where: { id: targetUserId } });

      const ledger = await tx.creditLedger.create({
        data: {
          id: txId,
          userId: targetUserId,
          walletId: wallet.id,
          type: 'ADMIN_ADJUSTMENT',
          amount: signedAmount,
          balanceBefore,
          balanceAfter,
          referenceId: adjId,
          description: `[Penyesuaian Admin] ${adjustment.reason.trim()} (oleh ${adminName})`,
          performedBy: adminId,
        },
      });

      await tx.creditAuditLog.create({
        data: {
          adminUserId: adminId,
          action: adjustment.type === 'ADD' ? 'CREDIT_ADJUST_ADD' : 'CREDIT_ADJUST_DEDUCT',
          targetUserId,
          amount: adjustment.amount,
          balanceBefore,
          balanceAfter,
          referenceId: adjId,
          metadata: JSON.stringify({ adminName, reason: adjustment.reason }),
        },
      });

      console.log(`[CREDIT SERVICE] Admin ${adminName} adjusted credit for ${targetUserId}: ${adjustment.type} ${adjustment.amount}. Balance: ${balanceBefore} -> ${balanceAfter}`);

      return {
        success: true,
        wallet: {
          id: wallet.id,
          userId: wallet.userId,
          creditBalance: balanceAfter,
          totalCreditPurchased: adjustment.type === 'ADD' ? Number(wallet.totalTopUp) + adjustment.amount : Number(wallet.totalTopUp),
          totalCreditUsed: adjustment.type === 'DEDUCT' ? Number(wallet.totalUsed) + adjustment.amount : Number(wallet.totalUsed),
          totalAnalysis: Number(wallet.totalAnalysis),
          createdAt: wallet.createdAt instanceof Date ? wallet.createdAt.toISOString() : String(wallet.createdAt),
          updatedAt: new Date().toISOString(),
        },
        transaction: {
          id: ledger.id,
          userId: ledger.userId,
          walletId: ledger.walletId,
          userName: user?.fullName || 'User',
          email: user?.email || '',
          type: 'ADMIN_ADJUSTMENT',
          amount: signedAmount,
          creditIn,
          creditOut,
          balanceBefore,
          balanceAfter,
          referenceId: adjId,
          description: ledger.description,
          performedBy: adminId,
          adminId,
          adminName,
          createdAt: ledger.createdAt instanceof Date ? ledger.createdAt.toISOString() : String(ledger.createdAt),
        },
      };
    });
  }

  /**
   * Get Top Up Requests with optional filtering & user profile joins
   */
  public async getTopUpRequests(filters?: { status?: string; userId?: string; search?: string }): Promise<TopUpRequest[]> {
    const where: any = {};
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.status && filters.status !== 'ALL') where.status = filters.status;

    const topups = await prisma.creditTopUp.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const users = await prisma.user.findMany();
    const userMap = new Map<string, any>(users.map((u: any) => [u.id, u]));

    let results: TopUpRequest[] = topups.map((t: any) => {
      const u = userMap.get(t.userId);
      return {
        id: t.id,
        userId: t.userId,
        userName: u?.fullName || 'User',
        email: u?.email || '',
        amountIdr: Number(t.amountIdr),
        creditRequested: Number(t.creditRequested),
        paymentMethod: 'MANUAL_BANK_TRANSFER',
        bankName: t.bankName,
        accountNumber: t.accountNumber,
        accountName: t.accountName,
        status: t.status,
        referenceNotes: t.referenceNotes || undefined,
        adminNotes: t.adminNotes || undefined,
        confirmedBy: t.confirmedBy || undefined,
        confirmedByName: t.confirmedByName || undefined,
        confirmedAt: t.confirmedAt ? (t.confirmedAt instanceof Date ? t.confirmedAt.toISOString() : String(t.confirmedAt)) : undefined,
        createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt),
      };
    });

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      results = results.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.userName.toLowerCase().includes(q) ||
          t.email.toLowerCase().includes(q) ||
          t.userId.toLowerCase().includes(q)
      );
    }

    return results;
  }

  /**
   * Get Credit Transactions Ledger with optional filtering
   */
  public async getCreditTransactions(filters?: { userId?: string; type?: string; search?: string }): Promise<CreditTransaction[]> {
    const where: any = {};
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.type && filters.type !== 'ALL') where.type = filters.type;

    const ledgers = await prisma.creditLedger.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const users = await prisma.user.findMany();
    const userMap = new Map<string, any>(users.map((u: any) => [u.id, u]));

    let results: CreditTransaction[] = ledgers.map((l: any) => {
      const u = userMap.get(l.userId);
      const amount = Number(l.amount);
      return {
        id: l.id,
        userId: l.userId,
        walletId: l.walletId,
        userName: u?.fullName || 'User',
        email: u?.email || '',
        type: l.type,
        amount,
        creditIn: amount > 0 ? amount : 0,
        creditOut: amount < 0 ? Math.abs(amount) : 0,
        balanceBefore: Number(l.balanceBefore),
        balanceAfter: Number(l.balanceAfter),
        referenceId: l.referenceId || undefined,
        description: l.description,
        performedBy: l.performedBy || undefined,
        createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : String(l.createdAt),
      };
    });

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      results = results.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          (t.userName && t.userName.toLowerCase().includes(q)) ||
          (t.email && t.email.toLowerCase().includes(q)) ||
          (t.referenceId && t.referenceId.toLowerCase().includes(q))
      );
    }

    return results;
  }

  /**
   * Get AI Analysis History
   */
  public async getAiAnalysisHistory(filters?: { userId?: string; symbol?: string; search?: string }): Promise<AiAnalysisHistoryRecord[]> {
    const where: any = {};
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.symbol && filters.symbol !== 'ALL') where.symbol = filters.symbol;

    const logs = await prisma.aiAnalysisLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const users = await prisma.user.findMany();
    const userMap = new Map<string, any>(users.map((u: any) => [u.id, u]));

    let results: AiAnalysisHistoryRecord[] = logs.map((a: any) => {
      const u = userMap.get(a.userId);
      return {
        id: a.id,
        userId: a.userId,
        userName: u?.fullName || 'User',
        email: u?.email || '',
        symbol: a.symbol,
        timeframe: a.timeframe,
        analysisType: a.analysisType,
        creditCost: Number(a.creditCost),
        status: a.status,
        errorMessage: a.errorMessage || undefined,
        snapshotId: a.snapshotId || undefined,
        signalId: a.signalId || undefined,
        createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : String(a.createdAt),
      };
    });

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      results = results.filter(
        (a) =>
          a.id.toLowerCase().includes(q) ||
          a.symbol.toLowerCase().includes(q) ||
          (a.userName && a.userName.toLowerCase().includes(q)) ||
          (a.email && a.email.toLowerCase().includes(q))
      );
    }

    return results;
  }

  /**
   * Payment Settings
   */
  public async getPaymentSettings(): Promise<PaymentSettings> {
    const setting = await prisma.creditPaymentSetting.findFirst();
    if (setting) {
      return {
        bankName: setting.bankName,
        accountNumber: setting.accountNumber,
        accountName: setting.accountName,
        instructions: setting.instructions,
        isActive: setting.isActive,
        updatedAt: setting.updatedAt instanceof Date ? setting.updatedAt.toISOString() : String(setting.updatedAt),
      };
    }

    // Default fallback
    return {
      bankName: 'BCA (Bank Central Asia)',
      accountNumber: '0771360059',
      accountName: 'Sri Hartono',
      instructions: 'Silakan transfer sesuai nominal Top Up ke rekening BCA 0771360059 a/n Sri Hartono. Cantumkan ID Top Up pada berita transfer. Saldo Credit akan otomatis ditambahkan setelah Admin mengonfirmasi pembayaran.',
      isActive: true,
      updatedAt: new Date().toISOString(),
    };
  }

  public async updatePaymentSettings(settings: Partial<PaymentSettings>): Promise<PaymentSettings> {
    const existing = await prisma.creditPaymentSetting.findFirst();
    const updated = await prisma.creditPaymentSetting.upsert({
      where: { id: existing?.id || 'pay-setting-default' },
      create: {
        id: 'pay-setting-default',
        bankName: settings.bankName || 'BCA (Bank Central Asia)',
        accountNumber: settings.accountNumber || '0771360059',
        accountName: settings.accountName || 'Sri Hartono',
        instructions: settings.instructions || 'Silakan transfer ke nomor rekening yang tertera.',
        isActive: settings.isActive ?? true,
      },
      update: {
        bankName: settings.bankName,
        accountNumber: settings.accountNumber,
        accountName: settings.accountName,
        instructions: settings.instructions,
        isActive: settings.isActive,
      },
    });

    return {
      bankName: updated.bankName,
      accountNumber: updated.accountNumber,
      accountName: updated.accountName,
      instructions: updated.instructions,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt instanceof Date ? updated.updatedAt.toISOString() : String(updated.updatedAt),
    };
  }

  /**
   * Admin Aggregated Dashboard Metrics
   */
  public async getAdminCreditStats(): Promise<AdminCreditStats> {
    const [totalUsersCount, topups, wallets, totalAiAnalysis] = await Promise.all([
      prisma.user.count(),
      prisma.creditTopUp.findMany(),
      prisma.creditWallet.findMany(),
      prisma.aiAnalysisLog.count({ where: { status: 'SUCCESS' } }),
    ]);

    const totalCreditSoldIdr = topups
      .filter((t: any) => t.status === 'CONFIRMED')
      .reduce((sum: number, t: any) => sum + Number(t.amountIdr), 0);

    const creditInUserWallets = wallets.reduce((sum: number, w: any) => sum + Number(w.balance), 0);
    const totalCreditUsed = wallets.reduce((sum: number, w: any) => sum + Number(w.totalUsed), 0);

    const pendingTopups = topups.filter((t: any) => t.status === 'PENDING');
    const pendingTopUpCount = pendingTopups.length;
    const pendingTopUpAmountIdr = pendingTopups.reduce((sum: number, t: any) => sum + Number(t.amountIdr), 0);

    return {
      totalUsersCount,
      totalCreditSoldIdr,
      creditInUserWallets,
      totalCreditUsed,
      totalAiAnalysis,
      pendingTopUpCount,
      pendingTopUpAmountIdr,
    };
  }

  /**
   * Get all User Wallets combined with profile metadata & sorting for Admin View
   */
  public async getAllUserWalletsWithUsers(filters?: {
    search?: string;
    sortBy?: 'balance_desc' | 'balance_asc' | 'used_desc' | 'recent_tx';
  }): Promise<UserWalletWithProfile[]> {
    const [users, wallets, ledgers] = await Promise.all([
      prisma.user.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.creditWallet.findMany(),
      prisma.creditLedger.findMany({ orderBy: { createdAt: 'desc' } }),
    ]);

    const walletMap = new Map<string, any>(wallets.map((w: any) => [w.userId, w]));
    const lastTxMap = new Map<string, string>();
    for (const l of ledgers) {
      if (!lastTxMap.has(l.userId)) {
        lastTxMap.set(l.userId, l.createdAt instanceof Date ? l.createdAt.toISOString() : String(l.createdAt));
      }
    }

    let results: UserWalletWithProfile[] = [];

    for (const u of users) {
      let wallet = walletMap.get(u.id);
      if (!wallet) {
        // Persistent create-if-missing in PostgreSQL database (NEVER fabricate fake temporary in-memory wallet)
        wallet = await prisma.creditWallet.upsert({
          where: { userId: u.id },
          create: {
            userId: u.id,
            balance: 0.0,
            totalTopUp: 0.0,
            totalUsed: 0.0,
            totalAnalysis: 0,
          },
          update: {}, // NEVER reset or alter existing wallet
        });
        walletMap.set(u.id, wallet);
      }

      results.push({
        id: wallet.id,
        userId: u.id,
        creditBalance: Number(wallet.balance),
        totalCreditPurchased: Number(wallet.totalTopUp),
        totalCreditUsed: Number(wallet.totalUsed),
        totalAnalysis: Number(wallet.totalAnalysis),
        userName: u.fullName,
        email: u.email,
        role: u.role,
        status: u.status,
        accountType: u.accountType || undefined,
        lastTransactionDate: lastTxMap.get(u.id),
        createdAt: wallet.createdAt instanceof Date ? wallet.createdAt.toISOString() : String(wallet.createdAt),
        updatedAt: wallet.updatedAt instanceof Date ? wallet.updatedAt.toISOString() : String(wallet.updatedAt),
      });
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      results = results.filter(
        (r) =>
          r.userName.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.userId.toLowerCase().includes(q)
      );
    }

    if (filters?.sortBy === 'balance_desc') {
      results.sort((a, b) => b.creditBalance - a.creditBalance);
    } else if (filters?.sortBy === 'balance_asc') {
      results.sort((a, b) => a.creditBalance - b.creditBalance);
    } else if (filters?.sortBy === 'used_desc') {
      results.sort((a, b) => b.totalCreditUsed - a.totalCreditUsed);
    } else if (filters?.sortBy === 'recent_tx') {
      results.sort((a, b) => {
        const timeA = a.lastTransactionDate ? new Date(a.lastTransactionDate).getTime() : 0;
        const timeB = b.lastTransactionDate ? new Date(b.lastTransactionDate).getTime() : 0;
        return timeB - timeA;
      });
    }

    return results;
  }

  /**
   * Reconcile All User Wallets against chronological Credit Ledger
   */
  public async reconcileWallets(): Promise<CreditReconciliationReport> {
    const [users, wallets, ledgers] = await Promise.all([
      prisma.user.findMany(),
      prisma.creditWallet.findMany(),
      prisma.creditLedger.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);

    const walletMap = new Map<string, any>(wallets.map((w: any) => [w.userId, w]));

    // Group ledgers by userId
    const ledgerUserMap = new Map<string, any[]>();
    for (const l of ledgers) {
      const list = ledgerUserMap.get(l.userId) || [];
      list.push(l);
      ledgerUserMap.set(l.userId, list);
    }

    let matchedCount = 0;
    let mismatchedCount = 0;
    let totalWalletBalance = 0;
    let totalLedgerBalance = 0;

    const items: CreditReconciliationItem[] = [];

    for (const u of users) {
      let wallet = walletMap.get(u.id);
      if (!wallet) {
        // Persistent create-if-missing
        wallet = await prisma.creditWallet.upsert({
          where: { userId: u.id },
          create: {
            userId: u.id,
            balance: 0.0,
            totalTopUp: 0.0,
            totalUsed: 0.0,
            totalAnalysis: 0,
          },
          update: {},
        });
        walletMap.set(u.id, wallet);
      }

      const userLedgers = ledgerUserMap.get(u.id) || [];
      const walletBalance = Number(wallet.balance);
      totalWalletBalance += walletBalance;

      let totalPositive = 0;
      let totalNegative = 0;

      for (const l of userLedgers) {
        const amt = Number(l.amount);
        if (amt > 0) totalPositive += amt;
        else totalNegative += Math.abs(amt);
      }

      const expectedBalance = totalPositive - totalNegative;
      totalLedgerBalance += expectedBalance;

      const difference = walletBalance - expectedBalance;
      const isMatch = Math.abs(difference) < 0.001;

      if (isMatch) matchedCount++;
      else mismatchedCount++;

      const lastTx = userLedgers.length > 0 ? userLedgers[userLedgers.length - 1].createdAt : undefined;

      items.push({
        userId: u.id,
        userName: u.fullName,
        email: u.email,
        walletBalance,
        expectedBalance,
        difference,
        totalPositive,
        totalNegative,
        ledgerCount: userLedgers.length,
        status: isMatch ? 'MATCH' : 'MISMATCH',
        lastTransactionDate: lastTx ? (lastTx instanceof Date ? lastTx.toISOString() : String(lastTx)) : undefined,
      });
    }

    return {
      totalWallets: users.length,
      matchedCount,
      mismatchedCount,
      totalWalletBalance,
      totalLedgerBalance,
      reconciledAt: new Date().toISOString(),
      items,
    };
  }

  /**
   * Repair Reconciliation Mismatch (Admin Action)
   * Authoritative model: Ledger is authoritative single source of truth.
   * Synchronizes CreditWallet.balance to ledger sum and writes CreditAuditLog only.
   * NEVER creates a financial ledger entry for synchronization.
   */
  public async repairReconciliation(
    adminId: string,
    adminName: string,
    targetUserId: string,
    reason: string
  ): Promise<{ success: boolean; repairedBalance: number; difference: number }> {
    return await prisma.$transaction(async (tx: any) => {
      let wallet = await tx.creditWallet.findUnique({ where: { userId: targetUserId } });
      if (!wallet) {
        wallet = await tx.creditWallet.upsert({
          where: { userId: targetUserId },
          create: {
            userId: targetUserId,
            balance: 0.0,
            totalTopUp: 0.0,
            totalUsed: 0.0,
            totalAnalysis: 0,
          },
          update: {},
        });
      }

      const ledgers = await tx.creditLedger.findMany({
        where: { userId: targetUserId },
        orderBy: { createdAt: 'asc' },
      });

      let totalPositive = 0;
      let totalNegative = 0;
      for (const l of ledgers) {
        const amt = Number(l.amount);
        if (amt > 0) totalPositive += amt;
        else totalNegative += Math.abs(amt);
      }

      const expectedBalance = totalPositive - totalNegative;
      const currentWalletBalance = Number(wallet.balance);
      const diff = expectedBalance - currentWalletBalance;

      if (Math.abs(diff) < 0.001) {
        return { success: true, repairedBalance: currentWalletBalance, difference: 0 };
      }

      // 1. Authoritative update of wallet balance to match ledger total
      await tx.creditWallet.update({
        where: { userId: targetUserId },
        data: { balance: expectedBalance },
      });

      // 2. Write CreditAuditLog ONLY (No financial ledger mutation that would skew future reconciliation)
      await tx.creditAuditLog.create({
        data: {
          adminUserId: adminId,
          action: 'RECONCILIATION_REPAIR',
          targetUserId,
          amount: diff,
          balanceBefore: currentWalletBalance,
          balanceAfter: expectedBalance,
          metadata: JSON.stringify({
            adminName,
            reason: reason.trim(),
            ledgerExpectedBalance: expectedBalance,
            walletPreviousBalance: currentWalletBalance,
            difference: diff,
          }),
        },
      });

      console.log(`[CREDIT RECONCILIATION] Authoritatively synchronized wallet for ${targetUserId}: ${currentWalletBalance} -> ${expectedBalance} (diff: ${diff})`);

      return {
        success: true,
        repairedBalance: expectedBalance,
        difference: diff,
      };
    });
  }

  /**
   * Export All Data to Multi-Sheet Excel Workbook (.xlsx)
   */
  public async exportExcelWorkbook(): Promise<Buffer> {
    const [users, wallets, ledgers, topups, aiLogs] = await Promise.all([
      prisma.user.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.creditWallet.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.creditLedger.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.creditTopUp.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.aiAnalysisLog.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);

    const userMap = new Map<string, any>(users.map((u: any) => [u.id, u]));

    const workbook = XLSX.utils.book_new();

    // 1. SHEET: USERS (Safe export: NO PASSWORDS)
    const usersData = users.map((u: any) => ({
      ID: u.id,
      'Full Name': u.fullName,
      Email: u.email,
      Role: u.role,
      Status: u.status,
      'Account Type': u.accountType || 'Trader Individu',
      'Created At': u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt),
    }));
    const wsUsers = XLSX.utils.json_to_sheet(usersData);
    XLSX.utils.book_append_sheet(workbook, wsUsers, 'USERS');

    // 2. SHEET: CREDIT_WALLETS
    const walletsData = wallets.map((w: any) => {
      const u = userMap.get(w.userId);
      return {
        'Wallet ID': w.id,
        'User ID': w.userId,
        'User Name': u?.fullName || 'User',
        Email: u?.email || '',
        'Credit Balance': Number(w.balance),
        'Total Purchased': Number(w.totalTopUp),
        'Total Used': Number(w.totalUsed),
        'Total Analysis': Number(w.totalAnalysis),
        'Created At': w.createdAt instanceof Date ? w.createdAt.toISOString() : String(w.createdAt),
        'Updated At': w.updatedAt instanceof Date ? w.updatedAt.toISOString() : String(w.updatedAt),
      };
    });
    const wsWallets = XLSX.utils.json_to_sheet(walletsData);
    XLSX.utils.book_append_sheet(workbook, wsWallets, 'CREDIT_WALLETS');

    // 3. SHEET: CREDIT_LEDGER
    const ledgersData = ledgers.map((l: any) => {
      const u = userMap.get(l.userId);
      return {
        'Transaction ID': l.id,
        'User ID': l.userId,
        'User Name': u?.fullName || 'User',
        Email: u?.email || '',
        'Wallet ID': l.walletId,
        Type: l.type,
        Amount: Number(l.amount),
        'Balance Before': Number(l.balanceBefore),
        'Balance After': Number(l.balanceAfter),
        'Reference ID': l.referenceId || '',
        Description: l.description,
        'Performed By': l.performedBy || '',
        'Created At': l.createdAt instanceof Date ? l.createdAt.toISOString() : String(l.createdAt),
      };
    });
    const wsLedger = XLSX.utils.json_to_sheet(ledgersData);
    XLSX.utils.book_append_sheet(workbook, wsLedger, 'CREDIT_LEDGER');

    // 4. SHEET: TOP_UP_HISTORY
    const topupData = topups.map((t: any) => {
      const u = userMap.get(t.userId);
      return {
        'Top Up ID': t.id,
        'User ID': t.userId,
        'User Name': u?.fullName || 'User',
        Email: u?.email || '',
        'Amount IDR': Number(t.amountIdr),
        'Credit Requested': Number(t.creditRequested),
        'Payment Method': t.paymentMethod,
        'Bank Name': t.bankName,
        'Account Number': t.accountNumber,
        'Account Name': t.accountName,
        Status: t.status,
        'Reference Notes': t.referenceNotes || '',
        'Admin Notes': t.adminNotes || '',
        'Confirmed By ID': t.confirmedBy || '',
        'Confirmed By Name': t.confirmedByName || '',
        'Confirmed At': t.confirmedAt ? (t.confirmedAt instanceof Date ? t.confirmedAt.toISOString() : String(t.confirmedAt)) : '',
        'Created At': t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt),
      };
    });
    const wsTopups = XLSX.utils.json_to_sheet(topupData);
    XLSX.utils.book_append_sheet(workbook, wsTopups, 'TOP_UP_HISTORY');

    // 5. SHEET: AI_USAGE
    const aiData = aiLogs.map((a: any) => {
      const u = userMap.get(a.userId);
      return {
        'Analysis ID': a.id,
        'User ID': a.userId,
        'User Name': u?.fullName || 'User',
        Email: u?.email || '',
        Symbol: a.symbol,
        Timeframe: a.timeframe,
        'Analysis Type': a.analysisType,
        'Credit Cost': Number(a.creditCost),
        Status: a.status,
        'Error Message': a.errorMessage || '',
        'Snapshot ID': a.snapshotId || '',
        'Signal ID': a.signalId || '',
        'Created At': a.createdAt instanceof Date ? a.createdAt.toISOString() : String(a.createdAt),
      };
    });
    const wsAi = XLSX.utils.json_to_sheet(aiData);
    XLSX.utils.book_append_sheet(workbook, wsAi, 'AI_USAGE');

    // 6. SHEET: BACKUP_METADATA
    const metaData = [
      { Parameter: 'Application', Value: 'SPILLA GOLD Institutional Analysis Engine' },
      { Parameter: 'Ledger Engine Version', Value: '3.0.0 (Permanent PostgreSQL Ledger)' },
      { Parameter: 'Backup Timestamp', Value: new Date().toISOString() },
      { Parameter: 'Total Users', Value: users.length },
      { Parameter: 'Total Wallets', Value: wallets.length },
      { Parameter: 'Total Ledger Entries', Value: ledgers.length },
      { Parameter: 'Total Top Up Records', Value: topups.length },
      { Parameter: 'Total AI Analysis Logs', Value: aiLogs.length },
      { Parameter: 'Security Note', Value: 'Passwords, MT5 Secrets, and Auth Tokens are strictly excluded.' },
    ];
    const wsMeta = XLSX.utils.json_to_sheet(metaData);
    XLSX.utils.book_append_sheet(workbook, wsMeta, 'BACKUP_METADATA');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Preview Excel Import (Non-destructive validation step)
   */
  public async previewExcelImport(buffer: Buffer, fileName: string): Promise<ExcelImportPreview> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames;

    const [existingUsers, existingWallets, existingLedgers, existingTopups] = await Promise.all([
      prisma.user.findMany(),
      prisma.creditWallet.findMany(),
      prisma.creditLedger.findMany(),
      prisma.creditTopUp.findMany(),
    ]);

    const userEmailMap = new Map<string, any>(existingUsers.map((u: any) => [u.email.toLowerCase(), u]));
    const userIdMap = new Map<string, any>(existingUsers.map((u: any) => [u.id, u]));
    const walletMap = new Map<string, any>(existingWallets.map((w: any) => [w.userId, w]));
    const ledgerIdMap = new Map<string, any>(existingLedgers.map((l: any) => [l.id, l]));
    const topupIdMap = new Map<string, any>(existingTopups.map((t: any) => [t.id, t]));

    const conflicts: ExcelImportConflict[] = [];
    const invalidRows: ExcelImportInvalidRow[] = [];

    const newUsers: any[] = [];
    const newWallets: any[] = [];
    const newLedgers: any[] = [];
    const newTopups: any[] = [];
    const newAiUsage: any[] = [];

    let totalRowsParsed = 0;
    const sheetsSummary: { name: string; rowCount: number }[] = [];

    // Parse USERS sheet if exists
    if (sheetNames.includes('USERS')) {
      const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets['USERS']);
      sheetsSummary.push({ name: 'USERS', rowCount: rows.length });
      totalRowsParsed += rows.length;

      rows.forEach((row, idx) => {
        const email = row.Email ? String(row.Email).trim().toLowerCase() : '';
        const id = row.ID || row['User ID'];
        if (!email || !row['Full Name']) {
          invalidRows.push({ sheet: 'USERS', rowNumber: idx + 2, reason: 'Missing Full Name or Email', data: row });
          return;
        }

        const existingByEmail = userEmailMap.get(email);
        if (existingByEmail) {
          if (id && existingByEmail.id !== id) {
            conflicts.push({
              sheet: 'USERS',
              id: email,
              description: `Email ${email} exists with different ID`,
              currentValue: existingByEmail.id,
              importedValue: id,
            });
          }
        } else {
          newUsers.push({
            id: id || `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            fullName: row['Full Name'],
            email,
            role: row.Role || 'USER',
            status: row.Status || 'ACTIVE',
            accountType: row['Account Type'] || 'Trader Individu',
          });
        }
      });
    }

    // Parse CREDIT_WALLETS sheet if exists
    if (sheetNames.includes('CREDIT_WALLETS')) {
      const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets['CREDIT_WALLETS']);
      sheetsSummary.push({ name: 'CREDIT_WALLETS', rowCount: rows.length });
      totalRowsParsed += rows.length;

      rows.forEach((row, idx) => {
        const userId = row['User ID'] || row.userId;
        const balance = row['Credit Balance'] !== undefined ? Number(row['Credit Balance']) : undefined;
        if (!userId || balance === undefined || isNaN(balance)) {
          invalidRows.push({ sheet: 'CREDIT_WALLETS', rowNumber: idx + 2, reason: 'Invalid User ID or Credit Balance', data: row });
          return;
        }

        const existing = walletMap.get(userId);
        if (existing) {
          if (Math.abs(Number(existing.balance) - balance) > 0.001) {
            conflicts.push({
              sheet: 'CREDIT_WALLETS',
              id: userId,
              description: `Wallet balance mismatch for user ${userId}`,
              currentValue: Number(existing.balance),
              importedValue: balance,
            });
          }
        } else {
          newWallets.push({
            id: row['Wallet ID'] || `wal-${userId}`,
            userId,
            balance,
            totalTopUp: Number(row['Total Purchased'] || balance),
            totalUsed: Number(row['Total Used'] || 0),
            totalAnalysis: Number(row['Total Analysis'] || 0),
          });
        }
      });
    }

    // Parse CREDIT_LEDGER sheet if exists
    if (sheetNames.includes('CREDIT_LEDGER')) {
      const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets['CREDIT_LEDGER']);
      sheetsSummary.push({ name: 'CREDIT_LEDGER', rowCount: rows.length });
      totalRowsParsed += rows.length;

      rows.forEach((row, idx) => {
        const id = row['Transaction ID'] || row.id;
        const userId = row['User ID'] || row.userId;
        const amount = row.Amount !== undefined ? Number(row.Amount) : undefined;
        if (!id || !userId || amount === undefined || isNaN(amount)) {
          invalidRows.push({ sheet: 'CREDIT_LEDGER', rowNumber: idx + 2, reason: 'Missing ID, User ID, or numeric Amount', data: row });
          return;
        }

        if (!ledgerIdMap.has(id)) {
          newLedgers.push({
            id,
            userId,
            walletId: row['Wallet ID'] || `wal-${userId}`,
            type: row.Type || (amount > 0 ? 'TOPUP' : 'AI_USAGE'),
            amount,
            balanceBefore: Number(row['Balance Before'] || 0),
            balanceAfter: Number(row['Balance After'] || amount),
            referenceId: row['Reference ID'] || null,
            description: row.Description || 'Imported Ledger Entry',
            performedBy: row['Performed By'] || 'EXCEL_IMPORT',
            createdAt: row['Created At'] ? new Date(row['Created At']) : new Date(),
          });
        }
      });
    }

    // Parse TOP_UP_HISTORY sheet if exists
    if (sheetNames.includes('TOP_UP_HISTORY')) {
      const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets['TOP_UP_HISTORY']);
      sheetsSummary.push({ name: 'TOP_UP_HISTORY', rowCount: rows.length });
      totalRowsParsed += rows.length;

      rows.forEach((row, idx) => {
        const id = row['Top Up ID'] || row.id;
        const userId = row['User ID'] || row.userId;
        const amountIdr = row['Amount IDR'] !== undefined ? Number(row['Amount IDR']) : undefined;
        if (!id || !userId || amountIdr === undefined) {
          invalidRows.push({ sheet: 'TOP_UP_HISTORY', rowNumber: idx + 2, reason: 'Invalid Top Up Record', data: row });
          return;
        }

        if (!topupIdMap.has(id)) {
          newTopups.push({
            id,
            userId,
            amountIdr,
            creditRequested: Number(row['Credit Requested'] || amountIdr),
            paymentMethod: row['Payment Method'] || 'MANUAL_BANK_TRANSFER',
            bankName: row['Bank Name'] || 'BCA (Bank Central Asia)',
            accountNumber: row['Account Number'] || '0771360059',
            accountName: row['Account Name'] || 'Sri Hartono',
            status: row.Status || 'CONFIRMED',
            referenceNotes: row['Reference Notes'] || null,
            adminNotes: row['Admin Notes'] || null,
            confirmedBy: row['Confirmed By ID'] || null,
            confirmedByName: row['Confirmed By Name'] || null,
            confirmedAt: row['Confirmed At'] ? new Date(row['Confirmed At']) : null,
            createdAt: row['Created At'] ? new Date(row['Created At']) : new Date(),
          });
        }
      });
    }

    // Parse AI_USAGE sheet if exists
    if (sheetNames.includes('AI_USAGE')) {
      const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets['AI_USAGE']);
      sheetsSummary.push({ name: 'AI_USAGE', rowCount: rows.length });
      totalRowsParsed += rows.length;

      rows.forEach((row) => {
        const id = row['Analysis ID'] || row.id;
        const userId = row['User ID'] || row.userId;
        if (id && userId) {
          newAiUsage.push({
            id,
            userId,
            symbol: row.Symbol || 'XAUUSD',
            timeframe: row.Timeframe || 'H1',
            analysisType: row['Analysis Type'] || 'LIVE_AI_ANALYSIS',
            creditCost: Number(row['Credit Cost'] || 100),
            status: row.Status || 'SUCCESS',
            errorMessage: row['Error Message'] || null,
            snapshotId: row['Snapshot ID'] || null,
            signalId: row['Signal ID'] || null,
            createdAt: row['Created At'] ? new Date(row['Created At']) : new Date(),
          });
        }
      });
    }

    return {
      fileName,
      totalRowsParsed,
      sheets: sheetsSummary,
      newRecordsCount: newUsers.length + newWallets.length + newLedgers.length + newTopups.length + newAiUsage.length,
      existingRecordsCount: totalRowsParsed - (newUsers.length + newWallets.length + newLedgers.length + newTopups.length + newAiUsage.length + invalidRows.length),
      conflictsCount: conflicts.length,
      invalidRecordsCount: invalidRows.length,
      newUsers,
      newWallets,
      newLedgers,
      newTopups,
      newAiUsage,
      conflicts,
      invalidRows,
    };
  }

  /**
   * Commit Excel Import (Atomic Transaction with MERGE or RESTORE mode)
   *
   * Relational Foreign-Key Safe Execution Order:
   * 1. Users (Parent)
   * 2. Wallets (Depends on Users, Parent to TopUps & Ledgers)
   * 3. Top Ups (Depends on Users & Wallets)
   * 4. AI Usage (Depends on Users)
   * 5. Ledger (Depends on Users & Wallets)
   *
   * True Atomic Transaction:
   * - No generic catch-and-continue that swallows DB errors.
   * - If any required record insert fails, throws to rollback entire import.
   * - Explicit non-destructive behavior: never deletes records or ledger history.
   * - MERGE mode preserves existing wallet balances.
   * - RESTORE mode creates CreditAuditLog for every balance change.
   */
  public async commitExcelImport(
    adminId: string,
    adminName: string,
    previewData: ExcelImportPreview,
    mode: 'MERGE' | 'RESTORE'
  ): Promise<ExcelImportCommitResult> {
    return await prisma.$transaction(async (tx: any) => {
      let importedUsersCount = 0;
      let importedWalletsCount = 0;
      let importedLedgersCount = 0;
      let importedTopupsCount = 0;
      let importedAiUsageCount = 0;

      // STEP 1: Insert New Users
      for (const u of previewData.newUsers) {
        const existing = await tx.user.findUnique({ where: { email: u.email } });
        if (!existing) {
          await tx.user.create({
            data: {
              id: u.id,
              fullName: u.fullName,
              email: u.email,
              password: '$2a$10$e7V.3dM.1bT3aF0iY6WvEOQz7P2rU2eWjQ7ZkZk.ZkZk.ZkZk.ZkZ', // Placeholder hash
              role: u.role || 'USER',
              status: u.status || 'ACTIVE',
              accountType: u.accountType || 'Trader Individu',
            },
          });
          importedUsersCount++;
        }
      }

      // STEP 2: Wallets (Created/Updated BEFORE dependent TopUps and Ledgers)
      for (const w of previewData.newWallets) {
        const existingWallet = await tx.creditWallet.findUnique({ where: { userId: w.userId } });

        if (!existingWallet) {
          await tx.creditWallet.create({
            data: {
              id: w.id || `wal-${w.userId}`,
              userId: w.userId,
              balance: Number(w.balance),
              totalTopUp: Number(w.totalTopUp || w.balance),
              totalUsed: Number(w.totalUsed || 0),
              totalAnalysis: Number(w.totalAnalysis || 0),
            },
          });
          importedWalletsCount++;
        } else if (mode === 'RESTORE') {
          const prevBalance = Number(existingWallet.balance);
          const newBalance = Number(w.balance);

          if (Math.abs(prevBalance - newBalance) > 0.001) {
            // Update balance in RESTORE mode
            await tx.creditWallet.update({
              where: { userId: w.userId },
              data: { balance: newBalance },
            });

            // Mandatory audit log for RESTORE balance modification
            await tx.creditAuditLog.create({
              data: {
                adminUserId: adminId,
                action: 'EXCEL_RESTORE_WALLET_BALANCE',
                targetUserId: w.userId,
                amount: newBalance - prevBalance,
                balanceBefore: prevBalance,
                balanceAfter: newBalance,
                referenceId: `RESTORE-${Date.now().toString().slice(-6)}`,
                metadata: JSON.stringify({
                  adminName,
                  fileName: previewData.fileName,
                  previousBalance: prevBalance,
                  restoredBalance: newBalance,
                  mode: 'RESTORE',
                }),
              },
            });
            importedWalletsCount++;
          }
        }
        // In MERGE mode: existing wallets are strictly preserved with NO balance overwrite
      }

      // Also ensure any newly created users from Step 1 have a persistent wallet initialized
      for (const u of previewData.newUsers) {
        const userWallet = await tx.creditWallet.findUnique({ where: { userId: u.id } });
        if (!userWallet) {
          await tx.creditWallet.create({
            data: {
              id: `wal-${u.id}`,
              userId: u.id,
              balance: 0.0,
              totalTopUp: 0.0,
              totalUsed: 0.0,
              totalAnalysis: 0,
            },
          });
          importedWalletsCount++;
        }
      }

      // STEP 3: Insert Missing Top Ups (Foreign-key to User and Wallet now satisfied)
      for (const topup of previewData.newTopups) {
        const existingTopup = await tx.creditTopUp.findUnique({ where: { id: topup.id } });
        if (!existingTopup) {
          // Resolve walletId if not set
          let walletId = topup.walletId;
          if (!walletId) {
            const w = await tx.creditWallet.findUnique({ where: { userId: topup.userId } });
            walletId = w?.id || `wal-${topup.userId}`;
          }

          await tx.creditTopUp.create({
            data: {
              ...topup,
              walletId,
            },
          });
          importedTopupsCount++;
        }
      }

      // STEP 4: Insert Missing AI Usages (Foreign-key to User satisfied)
      for (const ai of previewData.newAiUsage) {
        const existingAi = await tx.aiAnalysisLog.findUnique ? await tx.aiAnalysisLog.findUnique({ where: { id: ai.id } }) : null;
        if (!existingAi) {
          await tx.aiAnalysisLog.create({
            data: ai,
          });
          importedAiUsageCount++;
        }
      }

      // STEP 5: Insert Missing Ledgers (Foreign-key to User and Wallet guaranteed to exist)
      for (const ledger of previewData.newLedgers) {
        // Verify ledger does not already exist
        const existingLedger = await tx.creditLedger.findUnique ? await tx.creditLedger.findUnique({ where: { id: ledger.id } }) : null;
        if (!existingLedger) {
          // Ensure valid walletId exists
          let walletId = ledger.walletId;
          const userWallet = await tx.creditWallet.findUnique({ where: { userId: ledger.userId } });
          if (userWallet) {
            walletId = userWallet.id;
          } else {
            // Create-if-missing wallet for the ledger's user
            const createdWallet = await tx.creditWallet.create({
              data: {
                id: walletId || `wal-${ledger.userId}`,
                userId: ledger.userId,
                balance: Number(ledger.balanceAfter) || 0.0,
                totalTopUp: Number(ledger.amount > 0 ? ledger.amount : 0),
                totalUsed: Number(ledger.amount < 0 ? Math.abs(ledger.amount) : 0),
                totalAnalysis: 0,
              },
            });
            walletId = createdWallet.id;
            importedWalletsCount++;
          }

          await tx.creditLedger.create({
            data: {
              ...ledger,
              walletId,
            },
          });
          importedLedgersCount++;
        }
      }

      // STEP 6: Write Overall Transaction Audit Log
      const auditLog = await tx.creditAuditLog.create({
        data: {
          adminUserId: adminId,
          action: mode === 'RESTORE' ? 'EXCEL_IMPORT_RESTORE' : 'EXCEL_IMPORT_MERGE',
          metadata: JSON.stringify({
            adminName,
            fileName: previewData.fileName,
            importedUsersCount,
            importedWalletsCount,
            importedLedgersCount,
            importedTopupsCount,
            importedAiUsageCount,
            mode,
            timestamp: new Date().toISOString(),
          }),
        },
      });

      console.log(`[CREDIT IMPORT] Successfully committed import in mode ${mode} by Admin ${adminName}`);

      return {
        success: true,
        mode,
        importedUsersCount,
        importedWalletsCount,
        importedLedgersCount,
        importedTopupsCount,
        importedAiUsageCount,
        auditLogId: auditLog.id,
        timestamp: new Date().toISOString(),
        message: `Import Excel berhasil diselesaikan dalam mode ${mode}. Total ${importedLedgersCount} mutasi & ${importedWalletsCount} wallet diproses secara aman.`,
      };
    });
  }
}

export const creditService = new CreditService();
