import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import type { ToolCallRecord, ToolCallState } from '../../services/types.js';

// ============================================================================
// ResponseBlock — Hiển thị phản hồi của AI với 2 chế độ:
//   1. Tóm tắt (detailMode=false): Ẩn thinking, tool compact. Mặc định.
//   2. Chi tiết (detailMode=true) : Hiển thị toàn bộ thinking, tool args/result.
//      Toggle bằng Ctrl+O hoặc lệnh /expand.
// ============================================================================

interface ResponseBlockProps {
  content: string;
  reasoningContent?: string;
  reasoningTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  /** true = Chế độ Chi tiết (hiển thị đầy đủ), false = Tóm tắt (ẩn bớt) */
  detailMode: boolean;
  /** Chỉ true cho message cuối cùng đang streaming */
  isStreaming: boolean;
  toolCalls?: ToolCallRecord[];
}

// ─── Màu sắc ──────────────────────────────────────────────────────────────
const thinkingColor = '#888888';
const dimThinkingColor = '#666666';
const dimColor = '#666666';
const runningColor = '#00ffff';
const successColor = '#00ff88';
const errorColor = '#ff4444';
const toolNameColor = '#aaaa00';

// ─── Helpers ──────────────────────────────────────────────────────────────

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

function getToolDisplayName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
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

function formatArgs(args: Record<string, unknown> | undefined): string {
  if (!args) return '';
  try {
    const str = JSON.stringify(args, null, 2);
    return str.length > 500 ? str.slice(0, 497) + '...' : str;
  } catch {
    return String(args);
  }
}

// ─── Streaming animation dots (nhẹ, chỉ thay đổi text content) ────────────
const StreamDot = React.memo(() => {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % 4), 300);
    return () => clearInterval(id);
  }, []);
  const dots = ['.', '..', '...', ''];
  return <Text>{dots[frame]}</Text>;
});

// ─── Tool row compact (chế độ Tóm tắt) ────────────────────────────────────
const CompactToolRow = React.memo(({ record, isLast, totalCount }: {
  record: ToolCallRecord;
  isLast: boolean;
  totalCount: number;
}) => {
  const color = getStateColor(record.state);
  const icon = getStateIcon(record.state);
  const displayName = getToolDisplayName(record.name);
  const fileName = getFileName(record);
  const isRunning = record.state === 'running';

  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <Text color={color}>{icon} </Text>
        <Text color={color}>
          {isRunning ? `Đang ${displayName.toLowerCase()}...` : `${displayName} thành công`}
        </Text>
        {fileName && (
          <Text color={dimColor}> ({fileName})</Text>
        )}
        {isRunning && <StreamDot />}
      </Box>
      {isLast && totalCount > 1 && (
        <Text color={dimColor}>
          {'  '}+{totalCount - 1} tool khác
        </Text>
      )}
    </Box>
  );
});

// ─── Tool row chi tiết (chế độ Chi tiết) ──────────────────────────────────
const DetailToolRow = React.memo(({ record }: { record: ToolCallRecord }) => {
  const color = getStateColor(record.state);
  const icon = getStateIcon(record.state);
  const displayName = getToolDisplayName(record.name);
  const isRunning = record.state === 'running';

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Header */}
      <Box flexDirection="row">
        <Text color={color} bold>
          {icon} Tool: {displayName}
        </Text>
        {isRunning && <StreamDot />}
      </Box>

      {/* Arguments */}
      <Box flexDirection="column" paddingLeft={2}>
        <Text color={toolNameColor}>Arguments:</Text>
        <Text color={dimColor}>
          {formatArgs(record.arguments)}
        </Text>
      </Box>

      {/* Result (nếu có) */}
      {record.state !== 'running' && (
        <Box flexDirection="column" paddingLeft={2}>
          <Text color={record.state === 'error' ? errorColor : successColor}>
            Result ({record.state}):
          </Text>
          {record.resultContent && (
            <Text color={dimThinkingColor} wrap="wrap">
              {record.resultContent.length > 1000
                ? record.resultContent.slice(0, 997) + '...'
                : record.resultContent}
            </Text>
          )}
          {record.isError && (
            <Text color={errorColor}>⚠ Lỗi khi thực thi tool</Text>
          )}
        </Box>
      )}
    </Box>
  );
});

// ─── Thinking panel (chế độ Chi tiết) ─────────────────────────────────────
const ThinkingPanel = React.memo(({
  reasoningContent,
  reasoningTokens,
  isStreaming,
}: {
  reasoningContent?: string;
  reasoningTokens?: number;
  isStreaming: boolean;
}) => {
  if (!reasoningContent || reasoningContent.length === 0) return null;

  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <Text color={thinkingColor}>
          ▼ Suy nghĩ
          {isStreaming && reasoningTokens === undefined ? ' (đang cập nhật...)' : ''}
        </Text>
        {!isStreaming && reasoningTokens !== undefined && (
          <Text color={thinkingColor}> ({reasoningTokens} tk)</Text>
        )}
      </Box>
      <Box flexDirection="column" paddingLeft={2} marginTop={0}>
        {reasoningContent.split('\n').map((line, i) => (
          <Text key={i} color={dimThinkingColor} wrap="wrap">
            │ {line}
          </Text>
        ))}
      </Box>
    </Box>
  );
});

// ─── Thinking summary (chế độ Tóm tắt) ────────────────────────────────────
const ThinkingSummary = React.memo(({
  reasoningTokens,
  isStreaming,
}: {
  reasoningTokens?: number;
  isStreaming: boolean;
}) => {
  return (
    <Box flexDirection="row">
      <Text color={thinkingColor}>🧠 </Text>
      {isStreaming && reasoningTokens === undefined ? (
        <Text color={thinkingColor}>Đang suy nghĩ...</Text>
      ) : (
        <Text color={thinkingColor}>
          Đã suy nghĩ{reasoningTokens !== undefined ? ` (${reasoningTokens} tk)` : ''}
        </Text>
      )}
    </Box>
  );
});

// ─── Component chính ──────────────────────────────────────────────────────
const ResponseBlock = ({
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
  const hasRunningTool = hasTools && toolCalls!.some(tc => tc.state === 'running');
  const textContent = content?.trim();

  // Khi streaming và chưa có reasoning → vẫn hiển thị "đang suy nghĩ"
  const showThinkingSummary = isStreaming || hasReasoning;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* ── Thinking: Chi tiết hoặc Tóm tắt ──────────────────────── */}
      {detailMode && hasReasoning ? (
        <ThinkingPanel
          reasoningContent={reasoningContent}
          reasoningTokens={reasoningTokens}
          isStreaming={isStreaming}
        />
      ) : showThinkingSummary ? (
        <ThinkingSummary
          reasoningTokens={reasoningTokens}
          isStreaming={isStreaming}
        />
      ) : null}

      {/* ── Tools: Chi tiết hoặc Compact ─────────────────────────── */}
      {hasTools && detailMode && toolCalls!.map((tc, idx) => (
        <DetailToolRow key={idx} record={tc} />
      ))}

      {hasTools && !detailMode && toolCalls!.map((tc, idx) => (
        <CompactToolRow
          key={idx}
          record={tc}
          isLast={idx === toolCalls!.length - 1}
          totalCount={toolCalls!.length}
        />
      ))}

      {/* ── Main text content ─────────────────────────────────────── */}
      {textContent ? (
        <Box flexDirection="row" marginTop={hasTools ? 1 : 0}>
          <Text color="gray">●</Text>
          <Text> </Text>
          <Box flexDirection="column" flexGrow={1}>
            <Text wrap="wrap">{textContent}</Text>
          </Box>
        </Box>
      ) : null}

      {/* ── Token info footer ─────────────────────────────────────── */}
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

      {/* ── Hint: Ctrl+O để xem chi tiết (chỉ hiện ở chế độ Tóm tắt) ─ */}
      {!detailMode && (hasReasoning || hasTools) && !isStreaming && (
        <Box flexDirection="row" marginTop={0}>
          <Text dimColor>  └ Ctrl+O để xem chi tiết</Text>
        </Box>
      )}
    </Box>
  );
};

export default React.memo(ResponseBlock);