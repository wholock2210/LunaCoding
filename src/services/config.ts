import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { encryptApiKey, decryptApiKey } from './crypto.js';
import type { AppConfig, ProviderConfig, ToolParseMode } from './types.js';

const CONFIG_DIR = path.join(os.homedir(), '.LunaCoding');
const CONFIG_PATH = path.join(CONFIG_DIR, 'setting.json');

/** UUID đơn giản (không cần thư viện ngoài) */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Đảm bảo thư mục config tồn tại */
function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Đọc toàn bộ cấu hình từ file.
 * Nếu file chưa tồn tại, trả về config mặc định.
 */
export function loadConfig(): AppConfig {
  ensureConfigDir();
  if (!fs.existsSync(CONFIG_PATH)) {
    return { currentProviderId: null, providers: [] };
  }
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw) as AppConfig;
  } catch {
    return { currentProviderId: null, providers: [] };
  }
}

/**
 * Ghi toàn bộ cấu hình xuống file.
 */
export function saveConfig(config: AppConfig): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });
}

/**
 * Lấy provider hiện tại theo currentProviderId.
 * Trả về null nếu chưa có provider nào được chọn.
 */
export function getCurrentProvider(): ProviderConfig | null {
  const config = loadConfig();
  if (!config.currentProviderId) return null;
  return config.providers.find((p) => p.id === config.currentProviderId) ?? null;
}

/**
 * Đặt provider hiện tại.
 */
export function setCurrentProvider(providerId: string): void {
  const config = loadConfig();
  config.currentProviderId = providerId;
  saveConfig(config);
}

/**
 * Thêm provider mới vào config.
 * API key được mã hóa trước khi lưu.
 * @returns Provider đã thêm (với apiKey đã mã hóa)
 */
export function addProvider(provider: Omit<ProviderConfig, 'id' | 'createdAt' | 'apiKey'> & { apiKey: string }): ProviderConfig {
  const config = loadConfig();
  const newProvider: ProviderConfig = {
    ...provider,
    id: generateId(),
    apiKey: encryptApiKey(provider.apiKey),
    createdAt: new Date().toISOString(),
  };
  config.providers.push(newProvider);
  saveConfig(config);
  return newProvider;
}

/**
 * Cập nhật thông tin provider.
 * Nếu apiKey được truyền (khác rỗng), sẽ mã hóa và cập nhật.
 */
export function updateProvider(
  providerId: string,
  updates: Partial<Omit<ProviderConfig, 'id' | 'createdAt'>> & { apiKey?: string },
): ProviderConfig | null {
  const config = loadConfig();
  const index = config.providers.findIndex((p) => p.id === providerId);
  if (index === -1) return null;

  const existing = config.providers[index]!;
  const updated: ProviderConfig = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    apiKey: updates.apiKey ? encryptApiKey(updates.apiKey) : existing.apiKey,
  };
  config.providers[index] = updated;
  saveConfig(config);
  return updated;
}

/**
 * Xóa provider khỏi config.
 * Nếu đang là provider hiện tại, currentProviderId sẽ bị xóa.
 */
export function deleteProvider(providerId: string): boolean {
  const config = loadConfig();
  const index = config.providers.findIndex((p) => p.id === providerId);
  if (index === -1) return false;

  config.providers.splice(index, 1);
  if (config.currentProviderId === providerId) {
    config.currentProviderId = config.providers.length > 0 ? config.providers[0]!.id : null;
  }
  saveConfig(config);
  return true;
}

/**
 * Lấy API key đã giải mã của provider.
 */
export function getDecryptedApiKey(provider: ProviderConfig): string {
  return decryptApiKey(provider.apiKey);
}

/**
 * Lấy danh sách provider (tối đa 10), API key vẫn mã hóa.
 */
export function listProviders(): ProviderConfig[] {
  const config = loadConfig();
  return config.providers.slice(0, 10);
}

/**
 * Cập nhật danh sách model của provider.
 */
export function updateProviderModels(providerId: string, models: string[]): ProviderConfig | null {
  return updateProvider(providerId, { models });
}

/**
 * Đặt model mặc định cho provider.
 */
export function setDefaultModel(providerId: string, model: string): ProviderConfig | null {
  return updateProvider(providerId, { defaultModel: model });
}

// ============================================================
// Tool Parse Mode
// ============================================================

/**
 * Lấy chế độ parse tool hiện tại.
 * Mặc định 'auto' nếu chưa được cấu hình.
 */
export function getToolParseMode(): ToolParseMode {
  const config = loadConfig();
  return config.toolParseMode ?? 'auto';
}

/**
 * Đặt chế độ parse tool.
 * @param mode - 'auto' | 'native' | 'xml'
 */
export function setToolParseMode(mode: ToolParseMode): void {
  const config = loadConfig();
  config.toolParseMode = mode;
  saveConfig(config);
}