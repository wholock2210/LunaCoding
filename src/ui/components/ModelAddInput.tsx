import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

interface ModelAddInputProps {
  providerName: string;
  existingModels: string[];
  onAdd: (modelId: string) => void;
  onBack: () => void;
}

/**
 * Kiểm tra model ID đã tồn tại (case-insensitive).
 */
function modelExists(models: string[], id: string): boolean {
  const key = id.toLowerCase();
  return models.some((m) => m.toLowerCase() === key);
}

const ModelAddInput = ({ providerName, existingModels, onAdd, onBack }: ModelAddInputProps) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) {
      setError('Tên model không được để trống.');
      return;
    }

    if (modelExists(existingModels, trimmed)) {
      setError(`Model "${trimmed}" đã tồn tại.`);
      return;
    }

    onAdd(trimmed);
    setInputValue('');
    setError(null);
    setSuccess(`Đã thêm model "${trimmed}". Nhập tiếp hoặc Esc để quay lại.`);
  };

  useInput((_input, key) => {
    if (key.escape) {
      onBack();
    }
  });

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="yellow">
      {/* Tiêu đề */}
      <Box marginBottom={1}>
        <Text bold color="yellow">
          ➕ Thêm Model thủ công — {providerName}
        </Text>
      </Box>

      {/* Danh sách model hiện có */}
      {existingModels.length > 0 && (
        <Box marginBottom={1} flexDirection="column">
          <Text dimColor>Model hiện có ({existingModels.length}):</Text>
          <Box paddingLeft={1}>
            <Text dimColor>{existingModels.join(', ')}</Text>
          </Box>
        </Box>
      )}

      {/* Ô nhập */}
      <Box marginY={1}>
        <Box paddingLeft={1} borderStyle="single" borderColor="green" flexGrow={1}>
          <TextInput
            value={inputValue}
            onChange={(val) => {
              setInputValue(val);
              setError(null);
              setSuccess(null);
            }}
            onSubmit={handleSubmit}
            placeholder="Nhập model ID (vd: gpt-4, claude-3-5-sonnet...)"
          />
        </Box>
      </Box>

      {/* Thông báo */}
      {error && (
        <Box marginBottom={0}>
          <Text color="red">❌ {error}</Text>
        </Box>
      )}

      {success && (
        <Box marginBottom={0}>
          <Text color="green">✅ {success}</Text>
        </Box>
      )}

      {/* Hướng dẫn */}
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>
          Nhập model ID và nhấn <Text color="green" bold>Enter</Text> để thêm
        </Text>
        <Text dimColor>
          Nhấn <Text color="yellow" bold>Esc</Text> để quay lại danh sách model
        </Text>
      </Box>
    </Box>
  );
};

export default ModelAddInput;