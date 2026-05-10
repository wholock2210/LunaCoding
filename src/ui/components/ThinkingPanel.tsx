import React from 'react';
import { Box, Text } from 'ink';

export interface ThinkingPanelProps {
  reasoningContent: string;
  reasoningTokens?: number;
}

export const ThinkingPanel: React.FC<ThinkingPanelProps> = ({
  reasoningContent,
  reasoningTokens,
}) => {
  return (
    <Box
      flexDirection="column"
      marginBottom={1}
      padding={1}
      borderStyle="single"
      borderColor="magenta"
    >
      <Box marginBottom={1}>
        <Text bold color="magenta">
          💭 Suy nghĩ {reasoningTokens != null ? `(${reasoningTokens} tokens)` : ''}
        </Text>
      </Box>
      <Text dimColor>{reasoningContent.trim()}</Text>
    </Box>
  );
};