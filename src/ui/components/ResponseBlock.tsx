import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import type { ToolCallRecord, ToolCallState } from '../../services/types.js';

interface ResponseBlockProps {
  content: string;
  reasoningContent?: string;
  reasoningTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  isThinkingExpanded: boolean;
  isStreaming?: boolean;
  isToolExpanded: boolean;
  toolCalls?: ToolCallRecord[];
}

// ─── Màu sắc ────────────────────────────────────────────────
const thinkingColor = '#888888';
const dimThinkingColor = '#666666';
const dimColor = '#666666';
const runningColor = '#00ffff';
const successColor = '#00ff88';
const errorColor = '#ff4444';

// ─── Helpers ────────────────────────────────────────────────
function getStateColor(state: ToolCallState): string {
  switch (state) {
    case 'running': return runningColor;
    case 'success': return successColor;
    case 'error': return errorColor;
    default: return runningColor;
  }
}

function getStateIcon(state: ToolCallState): string {
  switch (state) {
    case 'running': return '▶';
    case 'success': return '✓';
    case 'error': return '✗';
    default: return '▶';
  }
}

function getStatusText(name: string, state: ToolCallState): string {
  const display = name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  switch (state) {
    case 'running': return `Đang ${display.toLowerCase()}...`;
    case 'success': return `${display} thành công`;
    case 'error': return `${display} thất bại`;
    default: return display;
  }
}

function getFileName(record: ToolCallRecord): string | undefined {
  const args = record.arguments;
  if (args && typeof args === 'object' && 'path' in args) {
    const p = args['path'];
    if (typeof p === 'string') {
      return p.split('/').pop() ?? p;
    }
  }
  return undefined;
}

// ─── Animation components ───────────────────────────────────
const RunningDots = React.memo(() => {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame(f => f + 1), 300);
    return () => clearInterval(id);
  }, []);
  return <Text>{'.'.repeat((frame % 3) + 1)}</Text>;
});

const LoadingBar = React.memo(() => {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame(f => f + 1), 120);
    return () => clearInterval(id);
  }, []);
  const barW = 8;
  const filled = frame % (barW * 2);
  const pos = filled < barW ? filled : barW * 2 - filled - 1;
  const chars = Array.from({ length: barW }, (_, i) => i <= pos ? '▓' : '░');
  return <Text>[{chars.join('')}]</Text>;
});

// ─── Tool row ───────────────────────────────────────────────
const ToolRow = React.memo(({ record, isLast, totalCount, showCount }: {
  record: ToolCallRecord;
  isLast: boolean;
  totalCount: number;
  showCount: boolean;
}) => {
  const color = getStateColor(record.state);
  const icon = getStateIcon(record.state);
  const status = getStatusText(record.name, record.state);
  const fileName = getFileName(record);
  const displayDetail = fileName
    ? `${icon} ${record.name}(${fileName})`
    : `${icon} ${record.name}`;
  const isRunning = record.state === 'running';

  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <Text color={color}>● {status}</Text>
        {isRunning && <RunningDots />}
      </Box>
      <Box flexDirection="row" paddingLeft={2}>
        <Text color={color}>╰ {displayDetail}</Text>
      </Box>
      {showCount && isLast && (
        <Box flexDirection="row" paddingLeft={4}>
          <Text color={dimColor}>
            +{totalCount} tool đã dùng (Ctrl+o để xem)
          </Text>
        </Box>
      )}
      {isRunning && (
        <Box paddingLeft={4}>
          <Text color={color}><LoadingBar /></Text>
        </Box>
      )}
    </Box>
  );
});

// ─── Component chính ────────────────────────────────────────
const ResponseBlock = ({
  content,
  reasoningContent,
  reasoningTokens,
  completionTokens,
  totalTokens,
  isThinkingExpanded,
  isStreaming = false,
  isToolExpanded,
  toolCalls,
}: ResponseBlockProps) => {
  const hasReasoning = reasoningContent && reasoningContent.length > 0;
  const hasTools = toolCalls && toolCalls.length > 0;
  const hasRunningTool = hasTools && toolCalls!.some(tc => tc.state === 'running');
  const showFullTools = hasTools && (isToolExpanded || hasRunningTool);
  const textContent = content?.trim();

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* ── Thinking toggle ───────────────────────────────── */}
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

      {/* ── Full tool details (khi expand hoặc đang chạy) ─ */}
      {showFullTools && toolCalls!.map((tc, idx) => (
        <ToolRow
          key={idx}
          record={tc}
          isLast={idx === toolCalls!.length - 1}
          totalCount={toolCalls!.length}
          showCount={false}
        />
      ))}

      {/* ── Main text content ─────────────────────────────── */}
      {textContent ? (
        <Box flexDirection="row" marginTop={showFullTools ? 1 : 0}>
          <Text color="gray">●</Text>
          <Text> </Text>
          <Box flexDirection="column" flexGrow={1}>
            <Text wrap="wrap">{textContent}</Text>
          </Box>
        </Box>
      ) : null}

      {/* ── Compact tool summary (khi ko expand và ko running) */}
      {hasTools && !showFullTools && (
        <Box flexDirection="column" marginTop={textContent ? 1 : 0}>
          {toolCalls!.map((tc, idx) => (
            <ToolRow
              key={idx}
              record={tc}
              isLast={idx === toolCalls!.length - 1}
              totalCount={toolCalls!.length}
              showCount={true}
            />
          ))}
        </Box>
      )}

      {/* ── Token info footer ─────────────────────────────── */}
      {!isStreaming && (completionTokens !== undefined || totalTokens !== undefined) && (
        <Box flexDirection="row" justifyContent="flex-end" marginTop={0}>
          {completionTokens !== undefined && (
            <Text dimColor>
              {completionTokens} tk phản hồi{totalTokens !== undefined ? ' · ' : ''}
            </Text>
          )}
          {totalTokens !== undefined && (
            <Text dimColor>tổng {totalTokens} tk</Text>
          )}
        </Box>
      )}
    </Box>
  );
};

export default React.memo(ResponseBlock);