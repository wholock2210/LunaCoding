import { decryptApiKey } from '../crypto.js';
import { log, logError } from '../logger.js';
import type { ProviderConfig, ProviderType } from '../types.js';
import type { BaseProvider } from './base-provider.js';
import { OpenAICompatibleProvider } from './openai-compatible.js';
import { AnthropicProvider } from './anthropic.js';
import { GoogleGeminiProvider } from './google-gemini.js';
import { CohereProvider } from './cohere.js';

/**
 * Map ProviderType → [Constructor, Default Base URL].
 */
const PROVIDER_REGISTRY: Record<
  ProviderType,
  {
    ctor: new (baseUrl: string, apiKey: string, defaultModel: string) => BaseProvider;
    defaultUrl: string;
  }
> = {
  'openai-compatible': {
    ctor: OpenAICompatibleProvider,
    defaultUrl: OpenAICompatibleProvider.getDefaultBaseUrl(),
  },
  anthropic: {
    ctor: AnthropicProvider,
    defaultUrl: AnthropicProvider.getDefaultBaseUrl(),
  },
  'google-gemini': {
    ctor: GoogleGeminiProvider,
    defaultUrl: GoogleGeminiProvider.getDefaultBaseUrl(),
  },
  cohere: {
    ctor: CohereProvider,
    defaultUrl: CohereProvider.getDefaultBaseUrl(),
  },
};

/**
 * Tạo instance provider từ ProviderConfig.
 * Tự động giải mã API key và chọn Base URL (dùng mặc định nếu config bỏ trống).
 *
 * @param config - Cấu hình provider từ setting.json
 * @returns Instance của provider tương ứng
 */
export function createProvider(config: ProviderConfig): BaseProvider {
  const registered = PROVIDER_REGISTRY[config.type];
  if (!registered) {
    logError('Provider không được hỗ trợ', { type: config.type });
    throw new Error(`Loại provider không được hỗ trợ: ${config.type}`);
  }

  let apiKey: string;
  try {
    apiKey = decryptApiKey(config.apiKey);
  } catch (err) {
    logError('Lỗi giải mã API key', err);
    throw new Error(`Không thể giải mã API key: ${err instanceof Error ? err.message : String(err)}`);
  }

  const baseUrl = config.baseUrl || registered.defaultUrl;

  log('INFO', `Provider được khởi tạo: ${config.type}`, {
    name: config.name,
    baseUrl,
    model: config.defaultModel,
  });

  return new registered.ctor(baseUrl, apiKey, config.defaultModel);
}

/**
 * Lấy Base URL mặc định cho một loại provider.
 * Dùng khi hiển thị placeholder trong form thêm provider.
 */
export function getDefaultBaseUrl(type: ProviderType): string {
  return PROVIDER_REGISTRY[type]?.defaultUrl ?? '';
}

/**
 * Kiểm tra xem một loại provider có được hỗ trợ không.
 */
export function isProviderTypeSupported(type: string): type is ProviderType {
  return type in PROVIDER_REGISTRY;
}

/**
 * Trả về danh sách tất cả các loại provider được hỗ trợ.
 */
export function getSupportedProviderTypes(): ProviderType[] {
  return Object.keys(PROVIDER_REGISTRY) as ProviderType[];
}