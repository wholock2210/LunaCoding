import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { ProviderType, TestConnectionResult } from '../../services/types.js';
import { getDefaultBaseUrl } from '../../services/providers/registry.js';
import { createProvider } from '../../services/providers/registry.js';

const PROVIDER_TYPE_LABELS: Record<ProviderType, string> = {
  'openai-compatible': 'OpenAI Compatible',
  anthropic: 'Anthropic',
  'google-gemini': 'Google Gemini',
  cohere: 'Cohere',
};

type FormStep = 'name' | 'baseUrl' | 'apiKey' | 'defaultModel' | 'confirm';

const STEP_ORDER: FormStep[] = ['name', 'baseUrl', 'apiKey', 'defaultModel', 'confirm'];
const STEP_LABELS: Record<FormStep, string> = {
  name: 'Tên provider',
  baseUrl: 'Base URL',
  apiKey: 'API Key',
  defaultModel: 'Model mặc định',
  confirm: 'Xác nhận & Kiểm tra',
};

interface ProviderAddFormProps {
  type: ProviderType;
  onSave: (data: {
    name: string;
    type: ProviderType;
    baseUrl: string;
    apiKey: string;
    defaultModel: string;
  }) => void;
  onBack: () => void;
}

const ProviderAddForm = ({ type, onSave, onBack }: ProviderAddFormProps) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [defaultModel, setDefaultModel] = useState('');

  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const getFieldValue = (step: FormStep): string => {
    switch (step) {
      case 'name':
        return name;
      case 'baseUrl':
        return baseUrl;
      case 'apiKey':
        return apiKey;
      case 'defaultModel':
        return defaultModel;
      default:
        return '';
    }
  };

  const setFieldValue = (step: FormStep, value: string): void => {
    switch (step) {
      case 'name':
        setName(value);
        break;
      case 'baseUrl':
        setBaseUrl(value);
        break;
      case 'apiKey':
        setApiKey(value);
        break;
      case 'defaultModel':
        setDefaultModel(value);
        break;
    }
  };

  const handleFieldSubmit = (value: string) => {
    const step = STEP_ORDER[currentStepIdx]!;
    setFieldValue(step, value.trim());

    if (currentStepIdx < STEP_ORDER.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const actualBaseUrl = baseUrl || getDefaultBaseUrl(type);
      const { encryptApiKey } = await import('../../services/crypto.js');

      const tempConfig = {
        id: '__test__',
        name,
        type,
        baseUrl: actualBaseUrl,
        apiKey: encryptApiKey(apiKey),
        defaultModel,
        models: [] as string[],
        createdAt: new Date().toISOString(),
      };

      const testProvider = createProvider(tempConfig);
      const result = await testProvider.testConnection();
      setTestResult(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi không xác định';
      setTestResult({ success: false, message: `Lỗi: ${message}` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSave({
      name,
      type,
      baseUrl,
      apiKey,
      defaultModel,
    });
  };

  const defaultBaseUrl = getDefaultBaseUrl(type);
  const currentStep = STEP_ORDER[currentStepIdx]!;

  useInput((input, key) => {
    // Chỉ xử lý phím đặc biệt ở bước confirm (vì TextInput không active ở bước này)
    if (currentStep === 'confirm') {
      if (input === 't' || input === 'T') {
        handleTestConnection();
      } else if (input === 's' || input === 'S') {
        handleSave();
      }
    }

    // Phím Escape quay lại
    if (key.escape) {
      if (currentStepIdx === 0) {
        onBack();
      } else {
        setCurrentStepIdx((prev) => prev - 1);
        setTestResult(null);
      }
    }
  });

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="magenta">
      {/* Tiêu đề */}
      <Box marginBottom={1}>
        <Text bold color="magenta">
          ➕ Thêm Provider — {PROVIDER_TYPE_LABELS[type]}
        </Text>
      </Box>

      {/* Thanh tiến trình bước */}
      <Box marginBottom={1}>
        {STEP_ORDER.map((step, idx) => {
          const isCurrent = idx === currentStepIdx;
          const isCompleted = idx < currentStepIdx;
          const label = STEP_LABELS[step];

          return (
            <Box key={step}>
              {idx > 0 && (
                <Text dimColor> → </Text>
              )}
              <Text
                color={isCurrent ? 'green' : undefined}
                bold={isCurrent}
                dimColor={isCompleted}
              >
                {isCompleted ? '✓ ' : isCurrent ? '● ' : '○ '}
                {label}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Đường kẻ ngang */}
      <Box marginBottom={1}>
        <Text dimColor>──────────────────────────────</Text>
      </Box>

      {/* Hiển thị các trường đã hoàn thành */}
      {STEP_ORDER.slice(0, currentStepIdx).map((step) => {
        const val = getFieldValue(step);
        const displayVal = step === 'apiKey' ? '•'.repeat(Math.min(val.length, 16)) : val;

        return (
          <Box key={step} marginBottom={0}>
            <Text dimColor>
              ✓ {STEP_LABELS[step]}:{' '}
            </Text>
            <Text dimColor>{displayVal || '(để trống)'}</Text>
          </Box>
        );
      })}

      {/* Trường hiện tại - chỉ hiển thị TextInput cho các bước nhập liệu */}
      {currentStep !== 'confirm' && (
        <Box marginY={1} flexDirection="column">
          <Box>
            <Text color="green" bold>
              {STEP_LABELS[currentStep]}:{' '}
            </Text>
          </Box>
          {currentStep === 'baseUrl' && defaultBaseUrl && !baseUrl && (
            <Box marginBottom={0}>
              <Text dimColor>Mặc định: {defaultBaseUrl}</Text>
            </Box>
          )}
          <Box paddingLeft={1} borderStyle="single" borderColor="green">
            <TextInput
              value={getFieldValue(currentStep)}
              onChange={(val) => setFieldValue(currentStep, val)}
              onSubmit={handleFieldSubmit}
              placeholder={
                currentStep === 'baseUrl' && defaultBaseUrl
                  ? `Enter để dùng mặc định: ${defaultBaseUrl}`
                  : `Nhập ${STEP_LABELS[currentStep].toLowerCase()}...`
              }
            />
          </Box>
        </Box>
      )}

      {/* Bước xác nhận */}
      {currentStep === 'confirm' && (
        <Box marginY={1} flexDirection="column">
          <Box marginBottom={1}>
            <Text bold>🔍 Xác nhận thông tin provider:</Text>
          </Box>

          <Box flexDirection="column" paddingLeft={1}>
            {[
              ['Tên', name],
              ['Loại', PROVIDER_TYPE_LABELS[type]],
              ['Base URL', baseUrl || defaultBaseUrl],
              ['API Key', apiKey ? '•'.repeat(Math.min(apiKey.length, 20)) : '(chưa nhập)'],
              ['Model mặc định', defaultModel || '(chưa nhập)'],
            ].map(([label, val]) => (
              <Box key={label}>
                <Text dimColor>{label}: </Text>
                <Text>{val}</Text>
              </Box>
            ))}
          </Box>

          {/* Kết quả test connection */}
          {isTesting && (
            <Box marginTop={1}>
              <Text color="yellow">⏳ Đang kiểm tra kết nối...</Text>
            </Box>
          )}

          {testResult && !isTesting && (
            <Box marginTop={1} flexDirection="column">
              {testResult.success ? (
                <Text color="green">✅ {testResult.message}</Text>
              ) : (
                <Text color="red">❌ {testResult.message}</Text>
              )}
            </Box>
          )}

          {/* Nút hành động */}
          <Box marginTop={1} flexDirection="column">
            <Box>
              <Text>
                Nhấn{' '}
                <Text color="green" bold>
                  T
                </Text>{' '}
                để kiểm tra kết nối,{' '}
                <Text color="cyan" bold>
                  S
                </Text>{' '}
                để lưu provider
              </Text>
            </Box>
          </Box>
        </Box>
      )}

      {/* Hướng dẫn điều hướng */}
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>
          {currentStep === 'confirm'
            ? 'Nhấn T để test, S để lưu, Esc để sửa lại'
            : `Nhấn Enter để xác nhận, Esc để ${currentStepIdx === 0 ? 'quay lại' : 'quay lại bước trước'}`}
        </Text>
      </Box>
    </Box>
  );
};

export default ProviderAddForm;