import React from 'react';
import { Box, Text } from 'ink';

interface ResponseBlockProps {
  content: string;
  reasoningContent?: string;
  reasoningTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  isThinkingExpanded: boolean;
  isStreaming?: boolean;
}

const thinkingColor = '#888888';
const dimThinkingColor = '#666666';
const toolColor = '#00ffff'; // cyan
const toolResultSuccessColor = '#00ff88';
const toolResultErrorColor = '#ff4444';

/**
 * Parse nội dung message thành các đoạn text và tool block để hiển thị màu riêng.
 * Tool call: dòng bắt đầu bằng "🔧 **Gọi tool:"
 * Tool result: dòng bắt đầu bằng "✅ **Kết quả tool:" hoặc "❌ **Kết quả tool:"
 */
function splitContent(content: string): Array<{ type: 'text' | 'tool_call' | 'tool_result_error' | 'tool_result_success'; text: string }> {
  if (!content) return [];
  const parts: Array<{ type: 'text' | 'tool_call' | 'tool_result_error' | 'tool_result_success'; text: string }> = [];
  const lines = content.split('\n');
  let buffer = '';
  let currentType: 'text' | 'tool_call' | 'tool_result_error' | 'tool_result_success' = 'text';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    // Phát hiện dòng tool call
    if (line.startsWith('🔧 **Gọi tool:')) {
      if (buffer) {
        parts.push({ type: currentType, text: buffer });
        buffer = '';
      }
      currentType = 'tool_call';
      buffer = line;
      continue;
    }

    // Phát hiện dòng tool result
    if (line.startsWith('✅ **Kết quả tool:')) {
      if (buffer) {
        parts.push({ type: currentType, text: buffer });
        buffer = '';
      }
      currentType = 'tool_result_success';
      buffer = line;
      continue;
    }
    if (line.startsWith('❌ **Kết quả tool:')) {
      if (buffer) {
        parts.push({ type: currentType, text: buffer });
        buffer = '';
      }
      currentType = 'tool_result_error';
      buffer = line;
      continue;
    }

    // Dòng thường → thêm vào buffer hiện tại
    if (buffer) {
      buffer += '\n' + line;
    } else {
      buffer = line;
    }
  }

  if (buffer) {
    parts.push({ type: currentType, text: buffer });
  }

  return parts;
}

/** Chọn màu cho từng loại part */
function getPartColor(type: string): string | undefined {
  switch (type) {
    case 'tool_call': return toolColor;
    case 'tool_result_success': return toolResultSuccessColor;
    case 'tool_result_error': return toolResultErrorColor;
    default: return undefined;
  }
}

const ResponseBlock = ({
  content,
  reasoningContent,
  reasoningTokens,
  completionTokens,
  totalTokens,
  isThinkingExpanded,
  isStreaming = false,
}: ResponseBlockProps) => {
  const hasReasoning = reasoningContent && reasoningContent.length > 0;

  // Parse content thành các phần để tô màu tool call/result
  const contentParts = splitContent(content);

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* ── Thinking toggle row ──────────────────────────────── */}
      {hasReasoning && (
        <Box flexDirection="column">
          <Box flexDirection="row">
            <Text color={thinkingColor}>
              {isThinkingExpanded ? '▼' : '▶'} Suy nghĩ
              {isStreaming && reasoningTokens === undefined ? ' (đang cập nhật...)' : ''}
            </Text>
            {!isStreaming && reasoningTokens !== undefined && (
              <Text color={thinkingColor}> ({reasoningTokens} tk)</Text>
            )}
            <Text color={thinkingColor}> </Text>
            <Text dimColor>(ctrl+o để {isThinkingExpanded ? 'đóng' : 'mở'})</Text>
          </Box>

          {/* ── Expanded thinking content ──────────────────────── */}
          {isThinkingExpanded && (
            <Box flexDirection="column" paddingLeft={2} marginTop={0}>
              {(reasoningContent || '').split('\n').map((line, i) => (
                <Text key={i} color={dimThinkingColor} wrap="wrap">
                  │ {line}
                </Text>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* ── Main response row ──────────────────────────────────── */}
      <Box flexDirection="row">
        <Text color="gray">●</Text>
        <Text> </Text>
        <Box flexDirection="column" flexGrow={1}>
          <Box flexDirection="column">
            {contentParts.map((part, i) => (
              <Text
                key={i}
                color={getPartColor(part.type)}
                bold={part.type === 'tool_call'}
                wrap="wrap"
              >
                {part.text}
              </Text>
            ))}
          </Box>
          {/* Token info footer — ẩn khi đang streaming */}
          {!isStreaming && (completionTokens !== undefined || totalTokens !== undefined) && (
            <Box flexDirection="row" justifyContent="flex-end" marginTop={0}>
              {completionTokens !== undefined && (
                <Text dimColor>
                  {completionTokens} tk phản hồi
                  {totalTokens !== undefined ? ' · ' : ''}
                </Text>
              )}
              {totalTokens !== undefined && (
                <Text dimColor>
                  tổng {totalTokens} tk
                </Text>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default React.memo(ResponseBlock);