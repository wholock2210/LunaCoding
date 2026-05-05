import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { ProviderType } from '../../services/types.js';

interface ProviderTypeSelectProps {
  onSelect: (type: ProviderType) => void;
  onBack: () => void;
}

const PROVIDER_OPTIONS: Array<{
  type: ProviderType;
  label: string;
  description: string;
}> = [
  {
    type: 'openai-compatible',
    label: 'OpenAI Compatible',
    description: 'OpenAI, DeepSeek, Groq, Mistral, OpenRouter, xAI, Together, ...',
  },
  {
    type: 'anthropic',
    label: 'Anthropic',
    description: 'Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku',
  },
  {
    type: 'google-gemini',
    label: 'Google Gemini',
    description: 'Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini 2.0 Flash',
  },
  {
    type: 'cohere',
    label: 'Cohere',
    description: 'Command R+, Command R, Command, Command Light',
  },
];

const ProviderTypeSelect = ({ onSelect, onBack }: ProviderTypeSelectProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : PROVIDER_OPTIONS.length - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev < PROVIDER_OPTIONS.length - 1 ? prev + 1 : 0));
    } else if (key.return) {
      const selected = PROVIDER_OPTIONS[selectedIndex];
      if (selected) {
        onSelect(selected.type);
      }
    } else if (input === 'q' || input === 'Q') {
      onBack();
    }
  });

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="magenta">
      <Box marginBottom={1}>
        <Text bold color="magenta">
          🔌 Chọn loại Provider
        </Text>
      </Box>

      {PROVIDER_OPTIONS.map((option, idx) => {
        const isSelected = idx === selectedIndex;

        return (
          <Box key={option.type} flexDirection="column" paddingY={0} paddingX={1}>
            <Box>
              <Text color={isSelected ? 'green' : undefined} bold={isSelected}>
                {isSelected ? '▶ ' : '  '}
                {option.label}
              </Text>
              {isSelected && (
                <Text color="green" bold>
                  {' '}
                  ← Chọn
                </Text>
              )}
            </Box>
            <Box paddingLeft={2}>
              <Text dimColor>{option.description}</Text>
            </Box>
          </Box>
        );
      })}

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>
          Dùng <Text color="cyan" bold>↑↓</Text> để chọn,{' '}
          <Text color="green" bold>Enter</Text> để xác nhận
        </Text>
        <Text dimColor>
          Nhấn <Text color="yellow" bold>Q</Text> để quay lại danh sách provider
        </Text>
      </Box>
    </Box>
  );
};

export default ProviderTypeSelect;