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
              {reasoningContent.split('\n').map((line, i) => (
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
          <Box flexDirection="row">
            <Text wrap="wrap">{content}{isStreaming ? '▍' : ''}</Text>
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

export default ResponseBlock;