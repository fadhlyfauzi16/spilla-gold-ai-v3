import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { getPrismaClient } from '../db/prisma.js';

import {
  verifyTelegramBotToken,
  findLatestTelegramChatId,
  sendTelegramMessage,
  getTelegramEnvironmentConfig,
} from '../services/telegramBotService.js';

export const telegramRouter = Router();

const prisma = getPrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET environment variable is required',
  );
}

async function requireAdmin(
  req: any,
  res: any,
  next: any,
) {
  try {
    const authHeader = req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith('Bearer ')
    ) {
      return res.status(401).json({
        success: false,
        message:
          'Akses ditolak. Token tidak ditemukan.',
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(
      token,
      JWT_SECRET,
    ) as {
      userId: string;
      role?: string;
    };

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
      },
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message:
          'Akses ditolak. Hanya ADMIN yang diizinkan.',
      });
    }

    req.currentUser = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        'Token tidak valid atau sesi telah habis.',
    });
  }
}

/**
 * GET /api/admin/telegram/status
 */
telegramRouter.get(
  '/status',
  requireAdmin,
  async (_req, res) => {
    try {
      const { token, chatId } =
        getTelegramEnvironmentConfig();

      if (!token) {
        return res.json({
          success: true,
          connected: false,
          apiReady: false,
          recipientReady: false,
          bot: null,
        });
      }

      const bot =
        await verifyTelegramBotToken(token);

      return res.json({
        success: true,
        connected: true,
        apiReady: true,
        recipientReady: Boolean(chatId),

        bot: {
          id: bot.id,
          name: bot.first_name,
          username: bot.username
            ? `@${bot.username}`
            : null,
        },
      });
    } catch (error: any) {
      return res.json({
        success: true,
        connected: false,
        apiReady: false,
        recipientReady: false,
        bot: null,
        message:
          error?.message ||
          'Telegram API tidak tersedia.',
      });
    }
  },
);

/**
 * POST /api/admin/telegram/verify
 *
 * Body:
 * { token: "..." }
 */
telegramRouter.post(
  '/verify',
  requireAdmin,
  async (req, res) => {
    try {
      const token = String(
        req.body?.token || '',
      ).trim();

      if (!token) {
        return res.status(400).json({
          success: false,
          message:
            'Telegram Bot Token wajib diisi.',
        });
      }

      const bot =
        await verifyTelegramBotToken(token);

      return res.json({
        success: true,
        valid: true,

        bot: {
          id: bot.id,
          name: bot.first_name,
          username: bot.username
            ? `@${bot.username}`
            : null,
        },

        message:
          'Telegram Bot Token valid.',
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        valid: false,
        message:
          error?.message ||
          'Telegram Bot Token tidak valid.',
      });
    }
  },
);

/**
 * POST /api/admin/telegram/detect-chat
 *
 * User harus membuka bot dan mengirim /start dahulu.
 */
telegramRouter.post(
  '/detect-chat',
  requireAdmin,
  async (_req, res) => {
    try {
      const { token } =
        getTelegramEnvironmentConfig();

      if (!token) {
        return res.status(400).json({
          success: false,
          message:
            'TELEGRAM_BOT_TOKEN belum dipasang di server.',
        });
      }

      const chatId =
        await findLatestTelegramChatId(token);

      if (!chatId) {
        return res.status(404).json({
          success: false,
          message:
            'Belum ditemukan Chat ID. Buka bot Telegram lalu kirim /start terlebih dahulu.',
        });
      }

      return res.json({
        success: true,
        chatId,

        message:
          'Chat ID berhasil ditemukan. Masukkan nilai ini sebagai TELEGRAM_ADMIN_CHAT_ID di Railway Variables.',
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          'Gagal mendeteksi Telegram Chat ID.',
      });
    }
  },
);

/**
 * POST /api/admin/telegram/test
 */
telegramRouter.post(
  '/test',
  requireAdmin,
  async (_req, res) => {
    try {
      const { token, chatId } =
        getTelegramEnvironmentConfig();

      if (!token) {
        return res.status(400).json({
          success: false,
          message:
            'TELEGRAM_BOT_TOKEN belum dikonfigurasi.',
        });
      }

      if (!chatId) {
        return res.status(400).json({
          success: false,
          message:
            'TELEGRAM_ADMIN_CHAT_ID belum dikonfigurasi.',
        });
      }

      const bot =
        await verifyTelegramBotToken(token);

      await sendTelegramMessage(
        token,
        chatId,
        [
          '🟡 <b>SPILLA GOLD</b>',
          '',
          '✅ <b>Telegram Gateway Connected</b>',
          '',
          'Test notification berhasil.',
          '',
          `Bot: @${bot.username || '-'}`,
          'Telegram API: READY',
          'System: SPILLA GOLD Analysis Engine',
        ].join('\n'),
      );

      return res.json({
        success: true,
        message:
          'Test Message berhasil dikirim ke Telegram.',
      });
    } catch (error: any) {
      console.error(
        '[Telegram Test Error]',
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          'Test Message gagal dikirim.',
      });
    }
  },
);