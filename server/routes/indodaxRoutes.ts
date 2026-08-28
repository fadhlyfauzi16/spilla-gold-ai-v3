import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { indodaxMarketDataService } from '../services/indodaxMarketDataService.js';
import { cryptoAnalysisEngine } from '../services/cryptoAnalysisEngine.js';
import { cryptoAiService } from '../services/cryptoAiService.js';
import { indodaxService } from '../services/indodaxService.js';

export const indodaxRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

function extractUserId(req: any): string {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED');
  }

  try {
    const token = authHeader.substring(7).trim();

    if (!token) {
      throw new Error('UNAUTHORIZED');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId?: string;
    };

    if (!decoded?.userId) {
      throw new Error('UNAUTHORIZED');
    }

    return decoded.userId;
  } catch {
    throw new Error('UNAUTHORIZED');
  }
}

function handleRouteError(res: any, err: any) {
  if (err?.message === 'UNAUTHORIZED') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized. Valid login token required.',
    });
  }

  return res.status(500).json({
    success: false,
    error: err?.message || 'Internal server error.',
  });
}

/**
 * GET /api/crypto/markets
 * Returns all supported INDODAX pairs (CAST/IDR, BTC/IDR, ETH/IDR, etc.)
 */
indodaxRouter.get('/markets', (_req, res) => {
  try {
    const markets = indodaxMarketDataService.getAllPairs();
    res.json({ success: true, markets });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/crypto/ticker/:pair
 * Returns real live ticker for the specified pair
 */
indodaxRouter.get('/ticker/:pair', async (req, res) => {
  try {
    const { pair } = req.params;
    const ticker = await indodaxMarketDataService.getTicker(pair);
    if (!ticker) {
      return res.status(503).json({
        success: false,
        error: `INDODAX ticker for '${pair}' is temporarily unavailable.`,
      });
    }
    res.json({ success: true, ticker });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/crypto/depth/:pair
 * Returns real live Order Book (depth) and order flow pressure metrics
 */
indodaxRouter.get('/depth/:pair', async (req, res) => {
  try {
    const { pair } = req.params;
    const depth = await indodaxMarketDataService.getDepth(pair);
    if (!depth) {
      return res.status(503).json({
        success: false,
        error: `INDODAX order book for '${pair}' is temporarily unavailable.`,
      });
    }
    res.json({ success: true, depth });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/crypto/trades/:pair
 * Returns real live recent trades
 */
indodaxRouter.get('/trades/:pair', async (req, res) => {
  try {
    const { pair } = req.params;
    const trades = await indodaxMarketDataService.getTrades(pair);
    res.json({ success: true, trades });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/crypto/klines/:pair
 * Returns real candlestick data for charts
 */
indodaxRouter.get('/klines/:pair', async (req, res) => {
  try {
    const { pair } = req.params;
    const timeframe = (req.query.timeframe as string) || '15m';
    const limit = Number(req.query.limit) || 100;
    const candles = await indodaxMarketDataService.getKlines(pair, timeframe, limit);
    res.json({ success: true, candles, timeframe });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/crypto/analysis/:pair
 * Returns comprehensive quantitative technical and order flow analysis
 */
indodaxRouter.get('/analysis/:pair', async (req, res) => {
  try {
    const { pair } = req.params;
    const timeframe = (req.query.timeframe as string) || '15m';

    const [ticker, depth, candles] = await Promise.all([
      indodaxMarketDataService.getTicker(pair),
      indodaxMarketDataService.getDepth(pair),
      indodaxMarketDataService.getKlines(pair, timeframe, 100),
    ]);

    if (!ticker) {
      return res.status(503).json({
        success: false,
        error: `Unable to calculate analysis: ticker for '${pair}' is offline.`,
      });
    }

    const technicals = cryptoAnalysisEngine.computeTechnicalIndicators(candles, ticker.lastPrice);
    const slippageEst = depth
      ? cryptoAnalysisEngine.calculateSlippage(depth, 'BUY', 5000000, 'IDR')
      : null;

    res.json({
      success: true,
      ticker,
      depth,
      technicals,
      slippageEst,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/crypto/ai-recommendation
 * Generates Institutional Gemini AI reasoning for the specified crypto pair
 */
indodaxRouter.post('/ai-recommendation', async (req, res) => {
  try {
    const { pair = 'castidr', timeframe = '15m' } = req.body;

    const [ticker, depth, candles] = await Promise.all([
      indodaxMarketDataService.getTicker(pair),
      indodaxMarketDataService.getDepth(pair),
      indodaxMarketDataService.getKlines(pair, timeframe, 100),
    ]);

    if (!ticker || !depth) {
      return res.status(503).json({
        success: false,
        error: 'Cannot generate AI recommendation: live market data is temporarily unreachable.',
      });
    }

    const technicals = cryptoAnalysisEngine.computeTechnicalIndicators(candles, ticker.lastPrice);
    const slippageEst = cryptoAnalysisEngine.calculateSlippage(depth, 'BUY', 5000000, 'IDR');

    const recommendation = await cryptoAiService.generateRecommendation(
      ticker,
      depth,
      technicals,
      slippageEst
    );

    res.json({
      success: true,
      recommendation,
      technicals,
      depthSummary: {
        buyPressureRatio: depth.buyPressureRatio,
        sellPressureRatio: depth.sellPressureRatio,
        imbalancePercent: depth.orderBookImbalancePercent,
        liquidityConcentration: depth.liquidityConcentration,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/crypto/slippage-estimate
 * Estimates execution price, VWAP, and slippage for a specific order size
 */
indodaxRouter.post('/slippage-estimate', async (req, res) => {
  try {
    const { pair = 'castidr', side = 'BUY', amount = 1000000, unit = 'IDR' } = req.body;
    const depth = await indodaxMarketDataService.getDepth(pair);

    if (!depth) {
      return res.status(503).json({
        success: false,
        error: 'Order book data is currently unavailable.',
      });
    }

    const estimate = cryptoAnalysisEngine.calculateSlippage(depth, side, Number(amount), unit);
    res.json({ success: true, estimate });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/crypto/account/status
 * Fetches user connection status, balances, and health
 */
indodaxRouter.get('/account/status', async (req, res) => {
  try {
    const userId = extractUserId(req);
    const accountInfo = await indodaxService.getAccountStatus(userId);
    res.json({ success: true, account: accountInfo });
  } catch (err: any) {
    return handleRouteError(res, err);
  }
});

/**
 * POST /api/crypto/account/connect
 * Stores and validates user's INDODAX API Key & Secret (AES-256-GCM encrypted)
 */
indodaxRouter.post('/account/connect', async (req, res) => {
  try {
    const userId = extractUserId(req);
    const { apiKey, apiSecret } = req.body;

    const result = await indodaxService.connectCredentials(userId, apiKey, apiSecret);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err: any) {
    return handleRouteError(res, err);
  }
});

/**
 * POST /api/crypto/account/disconnect
 * Removes INDODAX credentials for the authenticated user
 */
indodaxRouter.post('/account/disconnect', async (req, res) => {
  try {
    const userId = extractUserId(req);
    const result = await indodaxService.disconnectCredentials(userId);
    res.json(result);
  } catch (err: any) {
    return handleRouteError(res, err);
  }
});

/**
 * GET /api/crypto/orders/open
 * Retrieves user's active open limit orders from INDODAX
 */
indodaxRouter.get('/orders/open', async (req, res) => {
  try {
    const userId = extractUserId(req);
    const pair = req.query.pair as string | undefined;
    const orders = await indodaxService.getOpenOrders(userId, pair);
    res.json({ success: true, orders });
  } catch (err: any) {
    return handleRouteError(res, err);
  }
});

/**
 * GET /api/crypto/orders/history
 * Retrieves order history and execution logs
 */
indodaxRouter.get('/orders/history', async (req, res) => {
  try {
    const userId = extractUserId(req);
    const pair = req.query.pair as string | undefined;
    const history = await indodaxService.getOrderHistory(userId, pair);
    res.json({ success: true, history });
  } catch (err: any) {
    return handleRouteError(res, err);
  }
});

/**
 * POST /api/crypto/orders/cancel
 * Cancels an open order on INDODAX
 */
indodaxRouter.post('/orders/cancel', async (req, res) => {
  try {
    const userId = extractUserId(req);
    const { pairId, orderId, type } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'orderId is required.' });
    }
    const result = await indodaxService.cancelOrder(userId, pairId || 'castidr', orderId, type || 'BUY');
    res.json(result);
  } catch (err: any) {
    return handleRouteError(res, err);
  }
});

/**
 * POST /api/crypto/orders/execute
 * Submits Institutional Buy or Sell order to INDODAX
 */
indodaxRouter.post('/orders/execute', async (req, res) => {
  try {
    const userId = extractUserId(req);
    const payload = req.body;

    if (!payload.price || (!payload.amountIdr && !payload.amountAsset)) {
      return res.status(400).json({
        success: false,
        message: 'Price and Order Amount (in IDR or Asset) are required.',
      });
    }

    const result = await indodaxService.executeOrder(userId, payload);
    if (!result.success && result.errorCode === 'AUTH_REQUIRED') {
      return res.status(401).json(result);
    }
    if (!result.success && result.errorCode === 'SLIPPAGE_LIMIT_EXCEEDED') {
      return res.status(422).json(result);
    }

    res.json(result);
  } catch (err: any) {
    return handleRouteError(res, err);
  }
});
