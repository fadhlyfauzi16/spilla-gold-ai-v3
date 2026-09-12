export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
}

interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

const TELEGRAM_API_BASE = 'https://api.telegram.org';

function buildUrl(token: string, method: string) {
  return `${TELEGRAM_API_BASE}/bot${token}/${method}`;
}

export async function verifyTelegramBotToken(
  token: string,
): Promise<TelegramBotInfo> {
  const cleanToken = String(token || '').trim();

  if (!cleanToken) {
    throw new Error('Telegram Bot Token kosong.');
  }

  const response = await fetch(
    buildUrl(cleanToken, 'getMe'),
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
  );

  const data =
    (await response.json()) as TelegramApiResponse<TelegramBotInfo>;

  if (!response.ok || !data.ok || !data.result) {
    throw new Error(
      data.description ||
        'Telegram menolak Bot Token tersebut.',
    );
  }

  return data.result;
}

export async function getTelegramUpdates(
  token: string,
) {
  const cleanToken = String(token || '').trim();

  const response = await fetch(
    buildUrl(cleanToken, 'getUpdates'),
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
  );

  const data =
    (await response.json()) as TelegramApiResponse<any[]>;

  if (!response.ok || !data.ok) {
    throw new Error(
      data.description ||
        'Gagal membaca update Telegram.',
    );
  }

  return data.result || [];
}

export async function findLatestTelegramChatId(
  token: string,
): Promise<string | null> {
  const updates = await getTelegramUpdates(token);

  for (let i = updates.length - 1; i >= 0; i--) {
    const update = updates[i];

    const chatId =
      update?.message?.chat?.id ??
      update?.edited_message?.chat?.id ??
      update?.channel_post?.chat?.id ??
      update?.callback_query?.message?.chat?.id;

    if (chatId !== undefined && chatId !== null) {
      return String(chatId);
    }
  }

  return null;
}

export async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string,
) {
  const cleanToken = String(token || '').trim();
  const cleanChatId = String(chatId || '').trim();

  if (!cleanToken) {
    throw new Error('Telegram Bot Token belum dikonfigurasi.');
  }

  if (!cleanChatId) {
    throw new Error('Telegram Chat ID belum dikonfigurasi.');
  }

  const response = await fetch(
    buildUrl(cleanToken, 'sendMessage'),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    },
  );

  const data =
    (await response.json()) as TelegramApiResponse<any>;

  if (!response.ok || !data.ok) {
    throw new Error(
      data.description ||
        'Telegram gagal mengirim pesan.',
    );
  }

  return data.result;
}

export function getTelegramEnvironmentConfig() {
  return {
    token: String(
      process.env.TELEGRAM_BOT_TOKEN || '',
    ).trim(),

    chatId: String(
      process.env.TELEGRAM_ADMIN_CHAT_ID || '',
    ).trim(),
  };
}