import { GoogleGenAI } from '@google/genai';
import {
  CryptoAiRecommendation,
  IndodaxTickerData,
  IndodaxDepthData,
  CryptoTechnicalIndicators,
  CryptoLiquiditySlippageEstimate,
} from '../../src/types/crypto.js';

class CryptoAiService {
  private getGenAI(): GoogleGenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  /**
   * Generates Institutional AI Recommendation for INDODAX Crypto pairs using Gemini 3.7 Flash
   */
  public async generateRecommendation(
    ticker: IndodaxTickerData,
    depth: IndodaxDepthData,
    technicals: CryptoTechnicalIndicators,
    slippageEst: CryptoLiquiditySlippageEstimate
  ): Promise<CryptoAiRecommendation> {
    const genAI = this.getGenAI();
    const promptData = {
      pair: ticker.symbol,
      pairId: ticker.pairId,
      currentPriceIdr: ticker.lastPrice,
      spreadIdr: ticker.spread,
      spreadPercent: ticker.spreadPercent,
      high24h: ticker.high24h,
      low24h: ticker.low24h,
      volumeIdr: ticker.volumeIdr,
      technicals: {
        trend: technicals.trend,
        momentum: technicals.momentum,
        rsi14: technicals.rsi14,
        rsiStatus: technicals.rsiStatus,
        ema20: technicals.ema20,
        ema50: technicals.ema50,
        macdCross: technicals.macd.crossStatus,
        keySupports: technicals.supportLevels,
        keyResistances: technicals.resistanceLevels,
      },
      orderFlow: {
        buyPressurePercent: depth.buyPressureRatio,
        sellPressurePercent: depth.sellPressureRatio,
        imbalancePercent: depth.orderBookImbalancePercent,
        liquidityConcentration: depth.liquidityConcentration,
        totalBidDepthIdr: depth.totalBidDepthIdr,
        totalAskDepthIdr: depth.totalAskDepthIdr,
      },
      liquidityRisk: {
        estimatedSlippagePercent: slippageEst.estimatedSlippagePercent,
        liquidityCoveragePercent: slippageEst.liquidityCoveragePercent,
        slippageRiskLevel: slippageEst.slippageRiskLevel,
      },
    };

    if (genAI) {
      try {
        const prompt = `You are the lead Quantitative Crypto Analyst for SPILLA GOLD Institutional Engine.
Analyze the following live INDODAX market state, technical indicators, order flow imbalance, and liquidity depth:

${JSON.stringify(promptData, null, 2)}

Provide a strict, professional institutional trading recommendation formatted as a single JSON object conforming exactly to this schema:
{
  "action": "STRONG_BUY" | "BUY" | "WAIT" | "SELL" | "STRONG_SELL",
  "confidence": number (integer 0 to 100),
  "plannedEntry": number (precise IDR target entry price),
  "takeProfit1": number (conservative target price in IDR),
  "takeProfit2": number (extended target price in IDR),
  "stopLoss": number (strict invalidation price in IDR),
  "riskRewardRatio": number (e.g. 2.5),
  "suggestedAllocationPercent": number (5, 10, 25, or 50 based on liquidity & risk),
  "expectedSlippagePercent": number,
  "liquidityStatus": "ABUNDANT" | "SUFFICIENT" | "THIN" | "CRITICAL_SLIPPAGE",
  "marketStructure": string (e.g. "Bullish Order Flow Expansion above EMA50"),
  "aiRationale": string (2-3 concise institutional sentences explaining the catalyst, order flow balance, and invalidation criteria in Indonesian or English),
  "keyDrivers": string[] (3 bullet points: order book pressure, technical trigger, liquidity health),
  "invalidationLevel": number
}

Rules:
1. In thin or low liquidity markets (slippage > 2%), keep allocation <= 10% or recommend WAIT.
2. If buy pressure > 60% and trend is BULLISH, favour BUY/STRONG_BUY.
3. If sell pressure > 60% or RSI > 75, favour SELL/WAIT.
4. Ensure takeProfit and stopLoss adhere to the recommended side (for BUY: TP > Entry > SL; for SELL: TP < Entry < SL).
Output ONLY the JSON object.`;

        const response = await genAI.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const text = response.text || '';
        const parsed = JSON.parse(text.trim());

        return {
          id: `rec-crypto-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          pairId: ticker.pairId,
          symbol: ticker.symbol,
          action: parsed.action || 'WAIT',
          confidence: Math.min(100, Math.max(10, Number(parsed.confidence) || 75)),
          currentPrice: ticker.lastPrice,
          plannedEntry: Number(parsed.plannedEntry) || ticker.lastPrice,
          takeProfit1: Number(parsed.takeProfit1) || Math.round(ticker.lastPrice * 1.05),
          takeProfit2: Number(parsed.takeProfit2) || Math.round(ticker.lastPrice * 1.10),
          stopLoss: Number(parsed.stopLoss) || Math.round(ticker.lastPrice * 0.96),
          riskRewardRatio: Number(parsed.riskRewardRatio) || 2.1,
          suggestedAllocationPercent: Number(parsed.suggestedAllocationPercent) || 10,
          expectedSlippagePercent: Number(parsed.expectedSlippagePercent) || slippageEst.estimatedSlippagePercent,
          liquidityStatus: parsed.liquidityStatus || (depth.liquidityConcentration === 'HIGH' ? 'ABUNDANT' : 'SUFFICIENT'),
          marketStructure: parsed.marketStructure || `${technicals.trend} Market Structure with ${depth.liquidityConcentration} Depth`,
          aiRationale: parsed.aiRationale || `Institutional order flow reflects ${depth.buyPressureRatio}% buy pressure with price holding above key support.`,
          keyDrivers: Array.isArray(parsed.keyDrivers) && parsed.keyDrivers.length > 0
            ? parsed.keyDrivers
            : [
                `Order Book Imbalance: ${depth.orderBookImbalancePercent > 0 ? '+' : ''}${depth.orderBookImbalancePercent}%`,
                `RSI(14) Momentum: ${technicals.rsi14} (${technicals.rsiStatus})`,
                `Liquidity Depth: ${depth.liquidityConcentration} (${slippageEst.estimatedSlippagePercent}% expected impact)`,
              ],
          invalidationLevel: Number(parsed.invalidationLevel) || Math.round(ticker.lastPrice * 0.95),
          generatedAt: new Date().toISOString(),
        };
      } catch (err: any) {
        console.warn('[Crypto AI Service] Gemini model generation error, executing algorithmic reasoning fallback:', err.message);
      }
    }

    // High-precision algorithmic reasoning fallback
    return this.generateAlgorithmicRecommendation(ticker, depth, technicals, slippageEst);
  }

  private generateAlgorithmicRecommendation(
    ticker: IndodaxTickerData,
    depth: IndodaxDepthData,
    technicals: CryptoTechnicalIndicators,
    slippageEst: CryptoLiquiditySlippageEstimate
  ): CryptoAiRecommendation {
    const price = ticker.lastPrice;
    const isBullish =
      (technicals.trend === 'STRONG_BULLISH' || technicals.trend === 'BULLISH') &&
      depth.buyPressureRatio > 52 &&
      technicals.rsi14 < 72;

    const isBearish =
      (technicals.trend === 'STRONG_BEARISH' || technicals.trend === 'BEARISH') &&
      depth.sellPressureRatio > 55;

    let action: 'STRONG_BUY' | 'BUY' | 'WAIT' | 'SELL' | 'STRONG_SELL' = 'WAIT';
    let confidence = 65;

    if (isBullish) {
      action = depth.buyPressureRatio > 65 && technicals.macd.crossStatus === 'BULLISH_CROSS' ? 'STRONG_BUY' : 'BUY';
      confidence = action === 'STRONG_BUY' ? 88 : 78;
    } else if (isBearish) {
      action = depth.sellPressureRatio > 65 ? 'STRONG_SELL' : 'SELL';
      confidence = action === 'STRONG_SELL' ? 85 : 74;
    }

    const tp1 = action.includes('BUY') ? Math.round(price * 1.045) : Math.round(price * 0.955);
    const tp2 = action.includes('BUY') ? Math.round(price * 1.09) : Math.round(price * 0.91);
    const sl = action.includes('BUY') ? Math.round(price * 0.965) : Math.round(price * 1.035);

    let suggestedAllocation = 10;
    if (depth.liquidityConcentration === 'HIGH' && slippageEst.estimatedSlippagePercent < 0.5) {
      suggestedAllocation = 25;
    } else if (depth.liquidityConcentration === 'THIN' || slippageEst.estimatedSlippagePercent > 1.5) {
      suggestedAllocation = 5;
    }

    return {
      id: `rec-crypto-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      pairId: ticker.pairId,
      symbol: ticker.symbol,
      action,
      confidence,
      currentPrice: price,
      plannedEntry: price,
      takeProfit1: tp1,
      takeProfit2: tp2,
      stopLoss: sl,
      riskRewardRatio: 2.3,
      suggestedAllocationPercent: suggestedAllocation,
      expectedSlippagePercent: slippageEst.estimatedSlippagePercent,
      liquidityStatus: depth.liquidityConcentration === 'HIGH' ? 'ABUNDANT' : depth.liquidityConcentration === 'THIN' ? 'THIN' : 'SUFFICIENT',
      marketStructure: `${technicals.trend} bias with ${depth.buyPressureRatio}% Buy Order Flow`,
      aiRationale: `Quantitative matrix indicates ${action} setup. Buy order pressure is ${depth.buyPressureRatio}% with RSI(14) at ${technicals.rsi14}. Invalidation set at ${sl.toLocaleString('id-ID')} IDR.`,
      keyDrivers: [
        `Order Book Imbalance: ${depth.orderBookImbalancePercent > 0 ? '+' : ''}${depth.orderBookImbalancePercent}%`,
        `Trend & MACD: ${technicals.trend} (${technicals.macd.crossStatus})`,
        `Depth Concentration: ${depth.liquidityConcentration} (${slippageEst.estimatedSlippagePercent}% expected slippage)`,
      ],
      invalidationLevel: sl,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const cryptoAiService = new CryptoAiService();
