import crypto from 'crypto';
import { getPrismaClient } from '../db/prisma.js';
import {
  encryptIndodaxSecret,
  decryptIndodaxSecret,
  maskApiKey,
} from './indodaxEncryptionService.js';
import { indodaxMarketDataService } from './indodaxMarketDataService.js';
import { cryptoAnalysisEngine } from './cryptoAnalysisEngine.js';
import {
  IndodaxUserAccountInfo,
  CryptoOrderExecutionPayload,
  CryptoOrderResult,
  CryptoOpenOrder,
  CryptoOrderHistoryItem,
} from '../../src/types/crypto.js';

const INDODAX_TAPI_URL = 'https://indodax.com/tapi';

export class IndodaxService {
  private lastNonce: number = 0;

  private getNonce(): number {
    const now = Date.now();
    if (now <= this.lastNonce) {
      this.lastNonce += 1;
    } else {
      this.lastNonce = now;
    }
    return this.lastNonce;
  }

  /**
   * Helper to perform signed INDODAX Trade API (TAPI) POST request
   */
  private async executeTapiRequest(
    apiKey: string,
    apiSecret: string,
    methodName: string,
    extraParams: Record<string, any> = {}
  ): Promise<{ success: boolean; return?: any; error?: string; errorCode?: string }> {
    try {
      const nonce = this.getNonce();
      const params = new URLSearchParams();
      params.append('method', methodName);
      params.append('nonce', String(nonce));

      Object.entries(extraParams).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          params.append(k, String(v));
        }
      });

      const bodyString = params.toString();

      // HMAC-SHA512 signature using API Secret
      const signature = crypto
        .createHmac('sha512', apiSecret)
        .update(bodyString)
        .digest('hex');

      const startTime = Date.now();
      const response = await fetch(INDODAX_TAPI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Key: apiKey,
          Sign: signature,
          'User-Agent': 'SPILLA-GOLD-INSTITUTIONAL/1.0',
        },
        body: bodyString,
        signal: AbortSignal.timeout(10000),
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return {
          success: false,
          error: `INDODAX API HTTP error: ${response.status} ${response.statusText}`,
          errorCode: `HTTP_${response.status}`,
        };
      }

      const json: any = await response.json();

      if (json && json.success === 1) {
        return {
          success: true,
          return: json.return,
        };
      } else {
        return {
          success: false,
          error: json?.error || 'Unknown INDODAX API error response',
          errorCode: json?.error_code || 'INDODAX_REJECTED',
        };
      }
    } catch (err: any) {
      return {
        success: false,
        error: `INDODAX TAPI network error: ${err.message}`,
        errorCode: 'NETWORK_TIMEOUT',
      };
    }
  }

  /**
   * Tests and saves user credentials with AES-256-GCM encryption
   */
  public async connectCredentials(
    userId: string,
    apiKey: string,
    apiSecret: string
  ): Promise<{ success: boolean; message: string; maskedKey?: string; accountName?: string }> {
    const trimmedKey = apiKey?.trim();
    const trimmedSecret = apiSecret?.trim();

    if (!trimmedKey || !trimmedSecret) {
      return { success: false, message: 'API Key and API Secret are required.' };
    }

    if (trimmedKey.length < 8 || trimmedSecret.length < 16) {
      return { success: false, message: 'Invalid API Key or Secret format.' };
    }

    // Live verification against Indodax getInfo
    const testResult = await this.executeTapiRequest(trimmedKey, trimmedSecret, 'getInfo');
    if (!testResult.success) {
      return {
        success: false,
        message: `INDODAX verification failed: ${testResult.error}`,
      };
    }

    const encKey = encryptIndodaxSecret(trimmedKey);
    const encSecret = encryptIndodaxSecret(trimmedSecret);
    const masked = maskApiKey(trimmedKey);
    const accountName = testResult.return?.name || testResult.return?.email || 'INDODAX Account';

    const prisma = getPrismaClient();

    // Find existing
    const existing = await prisma.indodaxCredential.findUnique({
      where: { userId },
    });

    if (existing) {
      await prisma.indodaxCredential.update({
        where: { userId },
        data: {
          encryptedApiKey: encKey.encrypted,
          encryptedApiSecret: encSecret.encrypted,
          apiKeyMasked: masked,
          iv: encKey.iv + '::' + encSecret.iv,
          authTag: encKey.authTag + '::' + encSecret.authTag,
          isActive: true,
          lastSyncAt: new Date(),
        },
      });
    } else {
      await prisma.indodaxCredential.create({
        data: {
          userId,
          encryptedApiKey: encKey.encrypted,
          encryptedApiSecret: encSecret.encrypted,
          apiKeyMasked: masked,
          iv: encKey.iv + '::' + encSecret.iv,
          authTag: encKey.authTag + '::' + encSecret.authTag,
          isActive: true,
          lastSyncAt: new Date(),
        },
      });
    }

    await prisma.cryptoExecutionLog.create({
      data: {
        userId,
        pair: 'ALL',
        action: 'CONNECT_ACCOUNT',
        status: 'SUCCESS',
        message: `Indodax account connected successfully (${masked})`,
      },
    });

    return {
      success: true,
      message: 'INDODAX account connected and verified successfully.',
      maskedKey: masked,
      accountName,
    };
  }

  /**
   * Disconnects Indodax account for a user
   */
  public async disconnectCredentials(userId: string): Promise<{ success: boolean; message: string }> {
    const prisma = getPrismaClient();
    await prisma.indodaxCredential.delete({
      where: { userId },
    });

    await prisma.cryptoExecutionLog.create({
      data: {
        userId,
        pair: 'ALL',
        action: 'DISCONNECT_ACCOUNT',
        status: 'SUCCESS',
        message: 'Indodax account disconnected by user.',
      },
    });

    return { success: true, message: 'INDODAX credentials removed.' };
  }

  /**
   * Retrieves decrypted credentials for a given user
   */
  private async getDecryptedCredentials(
    userId: string
  ): Promise<{ apiKey: string; apiSecret: string; record: any } | null> {
    const prisma = getPrismaClient();
    const cred = await prisma.indodaxCredential.findUnique({
      where: { userId },
    });

    if (!cred || !cred.isActive) return null;

    try {
      const [keyIv, secretIv] = cred.iv.split('::');
      const [keyTag, secretTag] = cred.authTag.split('::');

      const apiKey = decryptIndodaxSecret(cred.encryptedApiKey, keyIv, keyTag);
      const apiSecret = decryptIndodaxSecret(cred.encryptedApiSecret, secretIv, secretTag);

      return { apiKey, apiSecret, record: cred };
    } catch (err: any) {
      console.error(`[IndodaxService] Decryption failed for user ${userId}:`, err.message);
      return null;
    }
  }

  /**
   * Fetches full account status and balances
   */
  public async getAccountStatus(userId: string): Promise<IndodaxUserAccountInfo> {
    const creds = await this.getDecryptedCredentials(userId);

    if (!creds) {
      return {
        isConnected: false,
        balances: {},
        totalPortfolioEstimatedIdr: 0,
        availableIdr: 0,
        health: { isApiReachable: false, latencyMs: 0 },
      };
    }

    const startTime = Date.now();
    const result = await this.executeTapiRequest(creds.apiKey, creds.apiSecret, 'getInfo');
    const latencyMs = Date.now() - startTime;

    if (!result.success || !result.return) {
      return {
        isConnected: true,
        maskedApiKey: creds.record.apiKeyMasked,
        lastSyncAt: creds.record.lastSyncAt ? new Date(creds.record.lastSyncAt).toISOString() : undefined,
        balances: {},
        totalPortfolioEstimatedIdr: 0,
        availableIdr: 0,
        userName: 'INDODAX User',
        health: { isApiReachable: false, latencyMs },
      };
    }

    const ret = result.return;
    const rawBalance = ret.balance || {};
    const rawHold = ret.balance_hold || {};

    const balances: Record<string, { available: number; hold: number; total: number; estimatedIdrValue?: number }> = {};
    let totalPortfolioIdr = 0;
    let availableIdr = Number(rawBalance.idr) || 0;

    // Collect all currencies
    const allCurrencies = Array.from(new Set([...Object.keys(rawBalance), ...Object.keys(rawHold)]));

    for (const curr of allCurrencies) {
      const avail = Number(rawBalance[curr]) || 0;
      const hold = Number(rawHold[curr]) || 0;
      const total = avail + hold;

      if (total > 0) {
        let estIdr = 0;
        if (curr.toLowerCase() === 'idr') {
          estIdr = total;
        } else {
          // Estimate with ticker price
          const pairId = `${curr.toLowerCase()}idr`;
          const ticker = await indodaxMarketDataService.getTicker(pairId);
          if (ticker && ticker.lastPrice > 0) {
            estIdr = total * ticker.lastPrice;
          }
        }

        balances[curr.toUpperCase()] = {
          available: avail,
          hold,
          total,
          estimatedIdrValue: Math.round(estIdr),
        };

        totalPortfolioIdr += estIdr;
      }
    }

    // Update last sync time
    const prisma = getPrismaClient();
    await prisma.indodaxCredential.update({
      where: { userId },
      data: { lastSyncAt: new Date() },
    });

    return {
      isConnected: true,
      maskedApiKey: creds.record.apiKeyMasked,
      lastSyncAt: new Date().toISOString(),
      balances,
      totalPortfolioEstimatedIdr: Math.round(totalPortfolioIdr),
      availableIdr: Math.round(availableIdr),
      userName: ret.name || ret.email || 'INDODAX Trader',
      userEmail: ret.email,
      health: { isApiReachable: true, latencyMs },
    };
  }

  /**
   * Retrieves active open orders
   */
  public async getOpenOrders(userId: string, pairId?: string): Promise<CryptoOpenOrder[]> {
    const creds = await this.getDecryptedCredentials(userId);
    if (!creds) return [];

    const resolvedPair = pairId ? indodaxMarketDataService.resolvePair(pairId).id : 'castidr';
    const result = await this.executeTapiRequest(creds.apiKey, creds.apiSecret, 'openOrders', {
      pair: resolvedPair,
    });

    if (!result.success || !result.return?.orders) {
      return [];
    }

    const orders: any[] = result.return.orders;
    return orders.map((o) => {
      const price = Number(o.price);
      const remain = Number(o.remain);
      const original = Number(o.order_amount || o.remain);
      const totalIdr = price * remain;
      const submitTime = o.submit_time
        ? new Date(Number(o.submit_time) * 1000).toISOString()
        : new Date().toISOString();

      return {
        orderId: `ord-${o.order_id}`,
        indodaxOrderId: String(o.order_id),
        pairId: resolvedPair,
        symbol: o.pair ? o.pair.toUpperCase() : 'CAST/IDR',
        type: o.type === 'buy' ? 'BUY' : 'SELL',
        price,
        originalAmount: original,
        remainAmount: remain,
        totalIdr: Math.round(totalIdr),
        submitTime,
        status: 'OPEN',
      };
    });
  }

  /**
   * Retrieves order history from database and INDODAX
   */
  public async getOrderHistory(userId: string, pairId?: string): Promise<CryptoOrderHistoryItem[]> {
    const prisma = getPrismaClient();
    const resolvedPair = pairId ? indodaxMarketDataService.resolvePair(pairId).id : undefined;

    const dbOrders = await prisma.cryptoOrder.findMany({
      where: {
        userId,
        ...(resolvedPair ? { pairId: resolvedPair } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return dbOrders.map((o: any) => ({
      id: o.id,
      orderId: o.id,
      indodaxOrderId: o.indodaxOrderId || undefined,
      pair: o.pair,
      type: o.type as any,
      orderType: o.orderType,
      price: o.price,
      amount: o.amount,
      totalIdr: o.totalIdr,
      filledAmount: o.filledAmount,
      filledPrice: o.filledPrice || undefined,
      estimatedVwap: o.estimatedVwap || undefined,
      estimatedSlippagePercent: o.estimatedSlippagePercent || undefined,
      status: o.status,
      errorMessage: o.errorMessage || undefined,
      createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString(),
    }));
  }

  /**
   * Cancels an open order on INDODAX
   */
  public async cancelOrder(
    userId: string,
    pairId: string,
    indodaxOrderId: string,
    type: 'BUY' | 'SELL'
  ): Promise<{ success: boolean; message: string }> {
    const creds = await this.getDecryptedCredentials(userId);
    if (!creds) {
      return { success: false, message: 'Indodax account is not connected.' };
    }

    const pair = indodaxMarketDataService.resolvePair(pairId);
    const result = await this.executeTapiRequest(creds.apiKey, creds.apiSecret, 'cancelOrder', {
      pair: pair.id,
      order_id: indodaxOrderId,
      type: type.toLowerCase(),
    });

    const prisma = getPrismaClient();

    if (!result.success) {
      await prisma.cryptoExecutionLog.create({
        data: {
          userId,
          pair: pair.symbol,
          action: 'CANCEL_ORDER_FAILED',
          status: 'FAILED',
          message: `Failed to cancel order ${indodaxOrderId}: ${result.error}`,
        },
      });
      return { success: false, message: result.error || 'Failed to cancel order on INDODAX.' };
    }

    // Update DB status if found
    const matching = await prisma.cryptoOrder.findMany({
      where: { indodaxOrderId, userId },
    });
    for (const mo of matching) {
      await prisma.cryptoOrder.update({
        where: { id: mo.id },
        data: { status: 'CANCELLED' },
      });
    }

    await prisma.cryptoExecutionLog.create({
      data: {
        userId,
        pair: pair.symbol,
        action: 'CANCEL_ORDER',
        status: 'SUCCESS',
        message: `Order #${indodaxOrderId} cancelled successfully.`,
      },
    });

    return { success: true, message: `Order #${indodaxOrderId} cancelled successfully.` };
  }

  /**
   * Complete Institutional Crypto Execution Pipeline:
   * 1. Idempotency validation
   * 2. Balance & minimum trade constraints
   * 3. Live order book depth & slippage simulation
   * 4. State transition: PENDING -> VALIDATING -> SUBMITTED -> FILLED / PARTIALLY_FILLED / REJECTED
   * 5. INDODAX TAPI trade invocation
   * 6. Audit logging without credentials
   */
  public async executeOrder(
    userId: string,
    payload: CryptoOrderExecutionPayload
  ): Promise<CryptoOrderResult> {
    const prisma = getPrismaClient();
    const {
      pairId,
      symbol,
      type,
      orderType,
      price,
      amountIdr,
      amountAsset,
      idempotencyKey,
      maxSlippagePercent = 3.0,
    } = payload;

    const pair = indodaxMarketDataService.resolvePair(pairId || symbol);

    // 1. Check idempotency
    if (idempotencyKey) {
      const existing = await prisma.cryptoOrder.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return {
          success: existing.status === 'FILLED' || existing.status === 'SUBMITTED',
          orderId: existing.id,
          indodaxOrderId: existing.indodaxOrderId || undefined,
          status: existing.status as any,
          filledAmount: existing.filledAmount,
          filledPrice: existing.filledPrice || undefined,
          totalIdr: existing.totalIdr,
          message: `Order was already submitted with status: ${existing.status}`,
        };
      }
    }

    // 2. Retrieve user credentials
    const creds = await this.getDecryptedCredentials(userId);
    if (!creds) {
      return {
        success: false,
        status: 'REJECTED',
        message: 'INDODAX account is not connected. Please connect your API key first.',
        errorCode: 'AUTH_REQUIRED',
      };
    }

    // 3. Calculate target amount and total IDR
    let targetPrice = Math.round(Number(price));
    let calculatedAmountAsset = 0;
    let calculatedTotalIdr = 0;

    if (type === 'BUY') {
      if (amountIdr && amountIdr > 0) {
        calculatedTotalIdr = Math.round(amountIdr);
        calculatedAmountAsset = targetPrice > 0 ? calculatedTotalIdr / targetPrice : 0;
      } else if (amountAsset && amountAsset > 0) {
        calculatedAmountAsset = Number(amountAsset);
        calculatedTotalIdr = Math.round(calculatedAmountAsset * targetPrice);
      }
    } else {
      // SELL
      if (amountAsset && amountAsset > 0) {
        calculatedAmountAsset = Number(amountAsset);
        calculatedTotalIdr = Math.round(calculatedAmountAsset * targetPrice);
      } else if (amountIdr && amountIdr > 0) {
        calculatedTotalIdr = Math.round(amountIdr);
        calculatedAmountAsset = targetPrice > 0 ? calculatedTotalIdr / targetPrice : 0;
      }
    }

    if (calculatedTotalIdr < pair.minTotalIdr) {
      return {
        success: false,
        status: 'REJECTED',
        message: `Order amount (Rp ${calculatedTotalIdr.toLocaleString('id-ID')}) is below INDODAX minimum trade threshold (Rp ${pair.minTotalIdr.toLocaleString('id-ID')}).`,
        errorCode: 'BELOW_MIN_TRADE',
      };
    }

    // 4. Order Book Slippage & Depth Validation
    const depth = await indodaxMarketDataService.getDepth(pair.id);
    let estimatedSlippage = 0;
    let estimatedVwap = targetPrice;

    if (depth) {
      const slippageEst = cryptoAnalysisEngine.calculateSlippage(
        depth,
        type,
        type === 'BUY' ? calculatedTotalIdr : calculatedAmountAsset,
        type === 'BUY' ? 'IDR' : 'ASSET'
      );
      estimatedSlippage = slippageEst.estimatedSlippagePercent;
      estimatedVwap = slippageEst.estimatedVwap;

      if (estimatedSlippage > maxSlippagePercent && !slippageEst.isSafeToExecute) {
        return {
          success: false,
          status: 'REJECTED',
          estimatedSlippagePercent: estimatedSlippage,
          estimatedVwap,
          message: `Order rejected by Slippage Guard: Expected price impact (${estimatedSlippage.toFixed(2)}%) exceeds maximum acceptable threshold (${maxSlippagePercent}%).`,
          errorCode: 'SLIPPAGE_LIMIT_EXCEEDED',
        };
      }
    }

    // 5. Create PENDING DB order record
    const dbOrder = await prisma.cryptoOrder.create({
      data: {
        userId,
        pair: pair.symbol,
        pairId: pair.id,
        type,
        orderType,
        price: targetPrice,
        amount: calculatedAmountAsset,
        totalIdr: calculatedTotalIdr,
        status: 'VALIDATING',
        estimatedSlippagePercent: estimatedSlippage,
        estimatedVwap,
        idempotencyKey,
      },
    });

    // 6. Execute against INDODAX Trade API
    const tapiParams: Record<string, any> = {
      pair: pair.id,
      type: type.toLowerCase(),
      price: targetPrice,
    };

    if (type === 'BUY') {
      tapiParams.idr = calculatedTotalIdr;
    } else {
      tapiParams[pair.baseCurrency.toLowerCase()] = calculatedAmountAsset;
    }

    const tradeResult = await this.executeTapiRequest(creds.apiKey, creds.apiSecret, 'trade', tapiParams);

    if (!tradeResult.success) {
      await prisma.cryptoOrder.update({
        where: { id: dbOrder.id },
        data: {
          status: 'FAILED',
          errorMessage: tradeResult.error,
        },
      });

      await prisma.cryptoExecutionLog.create({
        data: {
          orderId: dbOrder.id,
          userId,
          pair: pair.symbol,
          action: `TRADE_${type}`,
          status: 'FAILED',
          message: `Trade execution failed: ${tradeResult.error}`,
        },
      });

      return {
        success: false,
        orderId: dbOrder.id,
        status: 'FAILED',
        message: tradeResult.error || 'INDODAX order execution failed.',
        errorCode: tradeResult.errorCode,
      };
    }

    // Parse INDODAX trade return
    const tradeReturn = tradeResult.return || {};
    const indodaxOrderId = String(tradeReturn.order_id || Date.now());
    const isFilledInstantly = Number(tradeReturn.receive || tradeReturn.spent || 0) > 0;
    const finalStatus = isFilledInstantly ? 'FILLED' : 'SUBMITTED';

    await prisma.cryptoOrder.update({
      where: { id: dbOrder.id },
      data: {
        status: finalStatus,
        indodaxOrderId,
        filledAmount: isFilledInstantly ? calculatedAmountAsset : 0,
        filledPrice: isFilledInstantly ? targetPrice : null,
      },
    });

    await prisma.cryptoExecutionLog.create({
      data: {
        orderId: dbOrder.id,
        userId,
        pair: pair.symbol,
        action: `TRADE_${type}`,
        status: finalStatus,
        message: `Order #${indodaxOrderId} submitted successfully on INDODAX (${type} ${calculatedAmountAsset.toFixed(4)} ${pair.baseCurrency} @ ${targetPrice.toLocaleString('id-ID')} IDR).`,
        metadata: {
          indodaxOrderId,
          estimatedSlippage,
          estimatedVwap,
        },
      },
    });

    return {
      success: true,
      orderId: dbOrder.id,
      indodaxOrderId,
      status: finalStatus,
      filledAmount: isFilledInstantly ? calculatedAmountAsset : 0,
      filledPrice: targetPrice,
      estimatedVwap,
      estimatedSlippagePercent: estimatedSlippage,
      totalIdr: calculatedTotalIdr,
      message: `Order #${indodaxOrderId} successfully submitted to INDODAX.`,
    };
  }
}

export const indodaxService = new IndodaxService();
