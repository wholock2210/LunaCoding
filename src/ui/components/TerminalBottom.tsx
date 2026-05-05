import React, { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import type { UiMode } from '../../services/types.js';

interface TerminalBottomProps {
  onSend: (input: string) => void;
  onCommand: (command: string) => void;
  isLoading: boolean;
  uiMode: UiMode;
}

const TerminalBottom = ({
  onSend,
  onCommand,
  isLoading,
  uiMode,
}: TerminalBottomProps) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (value: string) => {
    if (isLoading) return;
    const trimmed = value.trim();
    if (!trimmed) return;

    // Nếu bắt đầu bằng /, kiểm tra xem có phải lệnh không
    if (trimmed.startsWith('/')) {
      // Các lệnh đã biết: /provider, /model, /help, /h
      const knownCommands = ['/provider', '/providers', '/model', '/models', '/help', '/h'];
      const lower = trimmed.toLowerCase();
      const isKnown = knownCommands.some((cmd) => lower === cmd || lower.startsWith(cmd + ' '));

      if (isKnown) {
        onCommand(trimmed);
        setInputValue('');
        return;
      }
      // Nếu bắt đầu bằng / nhưng không phải lệnh đã biết,
      // vẫn fall through để gửi như tin nhắn thường (để AI xử lý)
      // hoặc gửi cho onCommand để hiện "lệnh không xác định"
      onCommand(trimmed);
      setInputValue('');
      return;
    }

    // Tin nhắn thường
    onSend(trimmed);
    setInputValue('');
  };

  // ── Menu mode: ẩn TextInput, chỉ hiện status bar ──────────────
  if (uiMode !== 'chat') {
    return (
      <Box
        flexDirection="column"
        marginTop={1}
        padding={1}
        borderStyle="single"
        borderColor="magenta"
      >
        <Box>
          <Text dimColor>
            Nhấn <Text color="yellow" bold>Q</Text> để quay lại{' '}
            | <Text color="cyan" bold>↑↓</Text> di chuyển{' '}
            | <Text color="green" bold>Enter</Text> chọn
          </Text>
        </Box>
      </Box>
    );
  }

  // ── Chat mode: TextInput bình thường ──────────────────────────
  return (
    <Box
      flexDirection="column"
      marginTop={1}
      padding={1}
      borderStyle="single"
      borderColor={isLoading ? 'yellow' : 'green'}
    >
      <Box>
        <Text color={isLoading ? 'yellow' : 'green'} bold>
          {'> '}
        </Text>
        <TextInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          placeholder={
            isLoading
              ? 'Đang chờ AI trả lời...'
              : 'Nhập tin nhắn hoặc lệnh (/provider, /model, /help)...'
          }
        />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          {isLoading
            ? '⏳ Đang xử lý, vui lòng đợi...'
            : '💡 Gợi ý: /provider — quản lý provider | /model — quản lý model | /help — trợ giúp'}
        </Text>
      </Box>
    </Box>
  );
};

export default TerminalBottom;