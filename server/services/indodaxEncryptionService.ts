import crypto from 'crypto';

/**
 * Isolated AES-256-GCM Encryption Service for INDODAX API Key & Secret credentials.
 * Ensures zero plaintext exposure at rest, in logs, or frontend responses.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128-bit IV for AES-GCM

function getEncryptionKeyBuffer(): Buffer {
  const rawKey =
    process.env.INDODAX_CREDENTIAL_ENCRYPTION_KEY ||
    process.env.MT5_CREDENTIAL_ENCRYPTION_KEY ||
    'spilla_gold_crypto_indodax_secure_key_2026_aes256_gcm_auth';

  const trimmed = rawKey.trim();

  // If 64 hex chars (32 bytes), parse directly
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }

  // Derive deterministic 256-bit key using SHA-256
  return crypto.createHash('sha256').update(trimmed, 'utf8').digest();
}

/**
 * Encrypts a string (API Key or API Secret) using AES-256-GCM.
 */
export function encryptIndodaxSecret(plaintext: string): {
  encrypted: string;
  iv: string;
  authTag: string;
} {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Secret to encrypt must be a non-empty string.');
  }

  const key = getEncryptionKeyBuffer();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag,
  };
}

/**
 * Decrypts an encrypted credential payload using AES-256-GCM.
 */
export function decryptIndodaxSecret(
  encrypted: string,
  iv: string,
  authTag: string
): string {
  if (!encrypted || !iv || !authTag) {
    throw new Error('Invalid encrypted payload: encrypted string, iv, and authTag are required.');
  }

  const key = getEncryptionKeyBuffer();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Masks an API Key for safe frontend display (e.g., "ABCD********WXYZ").
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) {
    return '••••••••';
  }
  const prefix = apiKey.slice(0, 4);
  const suffix = apiKey.slice(-4);
  return `${prefix}${'•'.repeat(Math.min(12, apiKey.length - 8))}${suffix}`;
}
