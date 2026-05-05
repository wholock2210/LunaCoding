import crypto from 'node:crypto';
import os from 'node:os';

// Salt cố định để tạo key từ machine-specific data
const SALT = 'LunaCoding-v1.0.0-key-derivation';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bit
const AUTH_TAG_LENGTH = 16; // 128 bit
const KEY_LENGTH = 32; // 256 bit

/**
 * Tạo encryption key từ hostname (machine-specific).
 * Key này không an toàn tuyệt đối nhưng đủ để chống đọc lướt file config.
 */
function deriveKey(): Buffer {
  const machineId = os.hostname();
  return crypto.scryptSync(machineId, SALT, KEY_LENGTH);
}

/**
 * Mã hóa plaintext API key.
 * @returns Chuỗi hex dạng: iv:authTag:ciphertext
 */
export function encryptApiKey(plaintext: string): string {
  if (!plaintext) return '';

  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext (tất cả dạng hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Giải mã API key đã mã hóa.
 * @param encrypted Chuỗi hex dạng iv:authTag:ciphertext
 * @returns Plaintext API key, hoặc chuỗi rỗng nếu không mã hóa
 */
export function decryptApiKey(encrypted: string): string {
  if (!encrypted) return '';

  try {
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
      // Có thể là plaintext cũ (chưa mã hóa)
      return encrypted;
    }

    const [ivHex, authTagHex, ciphertextHex] = parts;
    const key = deriveKey();
    const iv = Buffer.from(ivHex!, 'hex');
    const authTag = Buffer.from(authTagHex!, 'hex');
    const ciphertext = Buffer.from(ciphertextHex!, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    // Nếu giải mã thất bại (sai key, dữ liệu hỏng), trả về chuỗi rỗng
    return '';
  }
}