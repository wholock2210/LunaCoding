import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

const spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

// Dải màu sáng dành cho sóng highlight
const waveColors = [
  '#88ccff',
  '#99ddff',
  '#aaeeff',
  '#bbffff',
  '#aaeeff',
  '#99ddff',
  '#88ccff',
];

const dimColor = '#446688';
const defaultText = 'LunaCoding đang trả lời';
const waveWidth = waveColors.length;

interface LoadingIndicatorProps {
  text?: string;
}

const LoadingIndicator = ({ text = defaultText }: LoadingIndicatorProps) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => f + 1);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  const spinnerIndex = frame % spinnerChars.length;
  // Vị trí bắt đầu của sóng, di chuyển từ trái sang phải
  const totalLen = text.length + waveWidth;
  const waveStart = frame % totalLen;

  const getCharColor = (charIndex: number): string => {
    const relPos = charIndex - waveStart;
    if (relPos >= 0 && relPos < waveWidth) {
      return waveColors[relPos]!;
    }
    return dimColor;
  };

  return (
    <Box flexDirection="row" marginBottom={1}>
      <Text color={dimColor}>{spinnerChars[spinnerIndex]}</Text>
      <Text> </Text>
      {text.split('').map((char, i) => (
        <Text key={i} color={getCharColor(i)}>
          {char}
        </Text>
      ))}
    </Box>
  );
};

export default LoadingIndicator;