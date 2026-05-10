import React from 'react';
import { Box, Text } from 'ink';
import { ThinkingPanel } from './ThinkingPanel.js';
import { ToolCallPanel } from './ToolCallPanel.js';
import type { ToolCall } from '../../services/tools/types.js';

export interface ResponseBlockProps {
  content?: string;
  reasoningContent?: string;
  reasoningTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  detailMode: boolean;
  isStreaming: boolean;
  toolCalls?: ToolCall[];
}

export const ResponseBlock: React.FC<ResponseBlockProps> = ({
  content,
  reasoningContent,
  reasoningTokens,
  completionTokens,
  totalTokens,
  detailMode,
  isStreaming,
  toolCalls,
}: ResponseBlockProps) => {
  const hasReasoning = reasoningContent && reasoningContent.length > 0;
  const hasTools = toolCalls && toolCalls.length > 0;
  const textContent = content?.trim();

  // Khi streaming và chưa có reasoning → vẫn hiển thị "đang suy nghĩ"
  const showThinkingSummary = isStreaming || hasReasoning;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* ── Thinking: Chi tiết hoặc Tóm tắt ──────────────────────── */}
      {detailMode && hasReasoning ? (
        <ThinkingPanel
          reasoningContent={reasoningContent!}
          reasoningTokens={reasoningTokens}
        />
      ) : showThinkingSummary ? (
        <Box marginBottom={1}>
          <Text dimColor>
            {hasReasoning
              ? `Đã suy nghĩ (${reasoningTokens ?? 0} tokens)`
              : 'Đang suy nghĩ...'}
          </Text>
        </Box>
      ) : null}

      {/* ── Tool Calls ────────────────────────────────────────────── */}
      {hasTools &&
        toolCalls!.map((tc, idx) => (
          <ToolCallPanel key={`${tc.id}-${idx}`} toolCall={tc} />
        ))}

      {/* ── Content ───────────────────────────────────────────────── */}
      {textContent ? (
        <Box flexDirection="column">
          <Text>{textContent}</Text>
        </Box>
      ) : hasTools ? (
        <Box>
          <Text dimColor>Đã hoàn thành tool calls.</Text>
        </Box>
      ) : null}

      {/* ── Token Usage (chỉ hiện khi có detailMode và có tokens) ── */}
      {detailMode && totalTokens != null && totalTokens > 0 && (
        <Box marginTop={1}>
          <Text dimColor>
            {completionTokens != null
              ? `Tokens: ${completionTokens} completion / ${totalTokens} total`
              : `Tokens: ${totalTokens} total`}
          </Text>
        </Box>
      )}
    </Box>
  );
};