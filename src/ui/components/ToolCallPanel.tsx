import React from 'react';
import { Box, Text } from 'ink';
import type { ToolCall } from '../../services/tools/types.js';

export interface ToolCallPanelProps {
  toolCall: ToolCall;
}

export const ToolCallPanel: React.FC<ToolCallPanelProps> = ({
  toolCall,
}) => {
  const args = toolCall.arguments || {};
  const argKeys = Object.keys(args);
  const state = (toolCall as any).state as string | undefined;

  return (
    <Box
      flexDirection="column"
      marginBottom={1}
      padding={1}
      borderStyle="single"
      borderColor={state === 'running' ? 'yellow' : 'cyan'}
    >
      <Box marginBottom={1}>
        <Text bold color="cyan">
          🔧 {toolCall.name}
          {state === 'running' && (
            <Text color="yellow"> (đang chạy...)</Text>
          )}
          {state === 'done' && (
            <Text color="green"> (đã hoàn thành)</Text>
          )}
          {state === 'error' && (
            <Text color="red"> (lỗi)</Text>
          )}
        </Text>
      </Box>
      {argKeys.length > 0 && (
        <Box flexDirection="column">
          {argKeys.map((key) => {
            const value = args[key];
            const displayValue =
              typeof value === 'string'
                ? value.length > 120
                  ? value.substring(0, 120) + '...'
                  : value
                : JSON.stringify(value);
            return (
              <Box key={key}>
                <Text dimColor>
                  {'  '}
                  {key}: {displayValue}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};