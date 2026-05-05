import React from 'react';
import { Box, Text } from 'ink';

interface ResponseBlockProps {
  content: string;
}

const ResponseBlock = ({ content }: ResponseBlockProps) => {
  return (
    <Box flexDirection="row">
      <Text color="gray">●</Text>
      <Text> </Text>
      <Text wrap="wrap">{content}</Text>
    </Box>
  );
};

export default ResponseBlock;