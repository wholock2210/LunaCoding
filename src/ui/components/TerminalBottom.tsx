import React, { useCallback, useMemo, useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useInput } from 'ink';
import type { UiMode } from '../../services/types.js';
import { filterCommands, isKnownCommand } from '../../services/commands.js';

interface TerminalBottomProps {
  onSend: (input: string) => void;
  onCommand: (command: string) => void;
  isLoading: boolean;
  uiMode: UiMode;
  stableMode: boolean;
}

const TerminalBottom = ({
  onSend,
  onCommand,
  isLoading,
  uiMode,
  stableMode,
}: TerminalBottomProps) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ── Lọc lệnh gợi ý dựa trên input hiện tại ──────────────────
  const suggestions = useMemo(() => {
    if (!inputValue.startsWith('/')) return [];
    const query = inputValue.slice(1); // bỏ dấu /
    return filterCommands(query);
  }, [inputValue]);

  // ── Xử lý thay đổi input ─────────────────────────────────────
  const handleChange = useCallback(
    (value: string) => {
      setInputValue(value);
      // Chỉ hiện gợi ý khi bắt đầu bằng / và không có khoảng trắng
      // (tức là đang gõ lệnh, chưa gõ tham số)
      if (value.startsWith('/') && !value.includes(' ')) {
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    },
    [],
  );

  // ── Tab: tự động hoàn thành lệnh đầu tiên ──────────────────
  useInput(
    (_input, key) => {
      if (key.tab && showSuggestions && suggestions.length > 0) {
        const top = suggestions[0];
        if (top) {
          setInputValue(top.name + ' ');
          setShowSuggestions(false);
        }
      }
    },
    { isActive: showSuggestions && suggestions.length > 0 },
  );

  const handleSubmit = (value: string) => {
    if (isLoading) return;
    const trimmed = value.trim();
    if (!trimmed) return;

    // Nếu bắt đầu bằng /, kiểm tra xem có phải lệnh không
    if (trimmed.startsWith('/')) {
      if (isKnownCommand(trimmed)) {
        onCommand(trimmed);
        setInputValue('');
        setShowSuggestions(false);
        return;
      }
      // Lệnh không xác định, gửi lên onCommand để hiện lỗi
      onCommand(trimmed);
      setInputValue('');
      setShowSuggestions(false);
      return;
    }

    // Tin nhắn thường
    onSend(trimmed);
    setInputValue('');
    setShowSuggestions(false);
  };

  // ── Render danh sách gợi ý ──────────────────────────────────
  const renderSuggestions = () => {
    if (!showSuggestions || uiMode !== 'chat') return null;

    return (
      <Box flexDirection="column" marginTop={1}>
        {suggestions.length > 0 ? (
          suggestions.map((cmd, i) => (
            <Box key={cmd.name} flexDirection="row">
              <Text>
                {i === 0 ? '💡 ' : '   '}
                <Text color="yellow" bold>
                  {cmd.name}
                </Text>
                {cmd.aliases && cmd.aliases.length > 0 && (
                  <Text dimColor> ({cmd.aliases.join(', ')})</Text>
                )}
                <Text dimColor> — {cmd.description}</Text>
              </Text>
            </Box>
          ))
        ) : (
          <Box>
            <Text dimColor>💡 Không tìm thấy lệnh khớp. Gõ </Text>
            <Text color="yellow" bold>/help</Text>
            <Text dimColor> để xem danh sách lệnh.</Text>
          </Box>
        )}
      </Box>
    );
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

  // ── Chat mode: TextInput (có hoặc không stable mode) ────────
  return (
    <Box
      flexDirection="column"
      marginTop={1}
      padding={1}
      borderStyle="single"
      borderColor={stableMode ? 'cyan' : isLoading ? 'yellow' : 'green'}
    >
      {stableMode && (
        <Box marginBottom={1}>
          <Text color="cyan" bold>
            🔒 Stable
          </Text>
          <Text dimColor> — UI đã đóng băng để bảo vệ IME. </Text>
          <Text color="yellow">Ctrl+I</Text>
          <Text dimColor> để tắt.</Text>
        </Box>
      )}
      <Box>
        <Text color={stableMode ? 'cyan' : isLoading ? 'yellow' : 'green'} bold>
          {'> '}
        </Text>
        <TextInput
          value={inputValue}
          onChange={handleChange}
          onSubmit={handleSubmit}
          placeholder={
            isLoading
              ? 'Đang chờ AI trả lời...'
              : 'Nhập tin nhắn hoặc lệnh (/). Gõ /help để xem tất cả lệnh...'
          }
        />
      </Box>
      {renderSuggestions()}
      {!showSuggestions && (
        <Box marginTop={1}>
          <Text dimColor>
            {isLoading
              ? '⏳ Đang xử lý, vui lòng đợi...'
              : '💡 Gợi ý: Nhập / để xem danh sách lệnh | Tab để tự động hoàn thành'}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export default React.memo(TerminalBottom);
