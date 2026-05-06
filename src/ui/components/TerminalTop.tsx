import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import fs from 'fs/promises';
import path from 'path';
import Clock from './Clock.js';

interface TextSegment {
  text: string;
  color: string;
  backgroundColor?: string;
}

interface AsciiLine {
  segments: TextSegment[];
}

/**
 * Nhóm các màu theo chủ đề để tạo màu gradient.
 * Mỗi nhóm chứa các mã hex cho chuyển đổi mượt.
 */
const THEME_COLORS: Record<string, string[]> = {
  warm: ['#ff0000', '#ff4400', '#ff8800', '#ffaa00', '#ffcc00'],
  cool: ['#00ffff', '#0088ff', '#0044ff', '#4400ff', '#8800ff'],
  pastel: ['#ff9999', '#ffcc99', '#ffff99', '#ccff99', '#99ffcc', '#99ccff', '#cc99ff'],
  neon: ['#ff0055', '#ff8800', '#ffff00', '#00ff44', '#00ccff', '#8800ff'],
  sunset: ['#ff0066', '#ff3366', '#ff6633', '#ff9933', '#ffcc00'],
  ocean: ['#003366', '#006699', '#0099cc', '#00ccff', '#00ffff'],
  forest: ['#003300', '#006600', '#009933', '#33cc33', '#66ff66'],
  fire: ['#660000', '#990000', '#cc3300', '#ff6600', '#ff9933', '#ffcc00'],
  rose: ['#660033', '#990066', '#cc0099', '#ff33cc', '#ff66ff'],
};

/**
 * Sinh màu ngẫu nhiên từ danh sách preset hoặc hoàn toàn ngẫu nhiên.
 * @param style - 'bright' cho màu sáng, 'pastel' cho màu pastel, 'any' cho bất kỳ
 * @returns Mã màu hex
 */
function getRandomColor(style: string = 'any'): string {
  if (style === 'bright') {
    const brightColors = [
      '#ff0000', '#ff4444', '#ff8800', '#ffaa00', '#ffff00',
      '#88ff00', '#00ff44', '#00ff88', '#00ffff', '#00aaff',
      '#0044ff', '#8800ff', '#ff00ff', '#ff0088', '#ff4488',
    ];
    return brightColors[Math.floor(Math.random() * brightColors.length)]!;
  }
  if (style === 'pastel') {
    const pastelColors = [
      '#ff9999', '#ffcc99', '#ffff99', '#ccff99', '#99ffcc',
      '#99ccff', '#cc99ff', '#ffccff', '#ffcccc', '#ccccff',
    ];
    return pastelColors[Math.floor(Math.random() * pastelColors.length)]!;
  }
  // Ngẫu nhiên hoàn toàn
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Tạo mảng màu gradient từ theme hoặc hai màu.
 * @param spec - Tên theme hoặc 'color1-color2'
 * @param steps - Số bước gradient
 * @returns Mảng mã màu hex
 */
function getGradientColors(spec: string, steps: number): string[] {
  // Kiểm tra nếu spec là tên theme có sẵn
  if (THEME_COLORS[spec]) {
    return interpolateGradient(THEME_COLORS[spec], steps);
  }

  // Phân tích spec dạng color1-color2
  const parts = spec.split('-');
  if (parts.length >= 2) {
    const color1 = normalizeColor(parts[0]!);
    const color2 = normalizeColor(parts[parts.length - 1]!);
    // Nếu có 3+ phần, lấy tất cả làm key points
    if (parts.length > 2) {
      const colors = parts.map(p => normalizeColor(p!));
      return interpolateGradient(colors, steps);
    }
    return interpolateGradient([color1, color2], steps);
  }

  // Fallback: theme mặc định
  return interpolateGradient(THEME_COLORS['warm']!, steps);
}

/**
 * Nội suy màu giữa các điểm gradient.
 */
function interpolateGradient(colors: string[], steps: number): string[] {
  if (colors.length === 0) return ['#ffffff'];
  if (colors.length === 1) return Array(steps).fill(colors[0]);
  if (steps <= 1) return [colors[0]!];

  const result: string[] = [];
  const segments = colors.length - 1;
  const stepsPerSegment = Math.floor(steps / segments);

  for (let s = 0; s < segments; s++) {
    const segSteps = s === segments - 1
      ? steps - result.length
      : stepsPerSegment;

    const c1 = hexToRgb(colors[s]!);
    const c2 = hexToRgb(colors[s + 1]!);

    for (let i = 0; i < segSteps; i++) {
      const t = segSteps > 1 ? i / (segSteps - 1) : 0;
      const r = Math.round(c1.r + (c2.r - c1.r) * t);
      const g = Math.round(c1.g + (c2.g - c1.g) * t);
      const b = Math.round(c1.b + (c2.b - c1.b) * t);
      result.push(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);
    }
  }

  return result.slice(0, steps);
}

/**
 * Chuyển mã hex sang RGB.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '');
  return {
    r: parseInt(cleaned.slice(0, 2), 16) || 0,
    g: parseInt(cleaned.slice(2, 4), 16) || 0,
    b: parseInt(cleaned.slice(4, 6), 16) || 0,
  };
}

/**
 * Chuẩn hóa tên màu: lowercase nếu là tên thuần chữ, giữ nguyên mã hex/rgb.
 */
function normalizeColor(color: string): string {
  return /^[a-zA-Z]+$/.test(color) ? color.toLowerCase() : color;
}

/**
 * Parse một dòng ASCII art để tách thành các segment có màu khác nhau.
 * Hỗ trợ cú pháp tag màu mở rộng:
 *
 * Màu chữ:
 *   [color]text[/color]       - Tên màu (red, brightBlue, ...), mã hex (#ff0000), hoặc rgb(r,g,b)
 *   [random]text[/random]      - Màu chữ ngẫu nhiên
 *   [random:bright]text[/random]  - Màu chữ ngẫu nhiên tông sáng
 *   [random:pastel]text[/random]  - Màu chữ ngẫu nhiên tông pastel
 *
 * Màu nền:
 *   [bg:color]text[/bg]        - Màu nền theo tên/mã
 *   [bg:random]text[/bg]       - Màu nền ngẫu nhiên
 *
 * Gradient:
 *   [gradient:color1-color2]text[/gradient]           - Gradient 2 màu
 *   [gradient:color1-color2-color3]text[/gradient]    - Gradient 3 màu
 *   [gradient:theme]text[/gradient]                   - Gradient theo theme (warm, cool, pastel, neon, sunset, ocean, forest, fire, rose)
 */
function parseLineSegments(line: string, defaultColor: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let i = 0;
  let lastPlainStart = 0;

  while (i < line.length) {
    if (line[i] === '[') {
      const openStart = i;
      i++;

      // Lấy toàn bộ nội dung trong tag [...]
      let tagContent = '';
      while (i < line.length && line[i] !== ']') {
        tagContent += line[i];
        i++;
      }
      if (i >= line.length) break;
      i++; // Bỏ qua ']'

      if (!tagContent) {
        i = openStart + 1;
        lastPlainStart = openStart;
        continue;
      }

      // Xác định loại tag và xử lý
      const isBackground = tagContent.startsWith('bg:');
      const isGradient = tagContent.startsWith('gradient:');
      const isRandom = tagContent === 'random' || tagContent.startsWith('random:');

      let closeTag: string;
      let colorValue: string;

      if (isBackground) {
        closeTag = '[/bg]';
        colorValue = tagContent.slice(3); // Bỏ 'bg:'
      } else {
        closeTag = `[/${tagContent}]`;
        colorValue = tagContent;
      }

      const closeIndex = line.indexOf(closeTag, i);
      if (closeIndex === -1) {
        i = openStart + 1;
        lastPlainStart = openStart;
        continue;
      }

      // Thêm text thường trước tag mở
      if (openStart > lastPlainStart) {
        const plainText = line.slice(lastPlainStart, openStart);
        if (plainText) {
          segments.push({ text: plainText, color: defaultColor });
        }
      }

      const innerText = line.slice(i, closeIndex);

      if (innerText) {
        if (isGradient) {
          // Xử lý gradient
          const themeOrSpec = tagContent.slice(9); // Bỏ 'gradient:'
          const gradientColors = getGradientColors(themeOrSpec, innerText.length);

          for (let idx = 0; idx < innerText.length; idx++) {
            const charColor = gradientColors[idx] || gradientColors[gradientColors.length - 1];
            segments.push({
              text: innerText[idx]!,
              color: charColor!,
            });
          }
        } else if (isRandom || (isBackground && (colorValue === 'random' || colorValue.startsWith('random:')))) {
          // Xử lý random
          const style = colorValue.startsWith('random:')
            ? colorValue.slice(7) // Bỏ 'random:'
            : 'any';

          if (isBackground) {
            // Mỗi ký tự màu nền ngẫu nhiên
            for (let idx = 0; idx < innerText.length; idx++) {
              segments.push({
                text: innerText[idx]!,
                color: defaultColor,
                backgroundColor: getRandomColor(style),
              });
            }
          } else {
            // Màu chữ ngẫu nhiên (cùng màu cho cả đoạn hoặc mỗi ký tự)
            // Mặc định mỗi ký tự một màu để tạo hiệu ứng
            for (let idx = 0; idx < innerText.length; idx++) {
              segments.push({
                text: innerText[idx]!,
                color: getRandomColor(style),
              });
            }
          }
        } else if (isBackground) {
          // Màu nền cố định
          segments.push({
            text: innerText,
            color: defaultColor,
            backgroundColor: normalizeColor(colorValue),
          });
        } else {
          // Màu chữ thông thường
          segments.push({
            text: innerText,
            color: normalizeColor(colorValue),
          });
        }
      }

      i = closeIndex + closeTag.length;
      lastPlainStart = i;
    } else {
      i++;
    }
  }

  // Thêm text thường còn lại ở cuối dòng
  if (lastPlainStart < line.length) {
    const plainText = line.slice(lastPlainStart);
    if (plainText) {
      segments.push({ text: plainText, color: defaultColor });
    }
  }

  // Nếu không có segment nào, dùng toàn bộ dòng với màu mặc định
  if (segments.length === 0) {
    segments.push({ text: line, color: defaultColor });
  }

  return segments;
}

const TerminalTop = ({ stableMode = false }: { stableMode?: boolean }) => {
  const [asciiLines, setAsciiLines] = useState<AsciiLine[]>([]);
  const [asciiNameLines, setAsciiNameLines] = useState<AsciiLine[]>([]);

  useEffect(() => {
    // Đọc ASCII art từ file và parse màu sắc
    const loadAsciiArt = async () => {
      try {
        const asciiPath = path.join(process.cwd(), 'ascii-art.txt');
        const content = await fs.readFile(asciiPath, 'utf-8');
        const lines = content.split('\n');

        const parsedLines: AsciiLine[] = [];
        let currentColor = 'white'; // Màu mặc định

        for (const line of lines) {
          const colorMatch = line.match(/^\s*#(.+)$/);
          if (colorMatch && colorMatch[1]?.trim()) {
            const rawColor = colorMatch[1].trim();
            const colorName = /^[a-zA-Z]+$/.test(rawColor)
              ? rawColor.toLowerCase()
              : rawColor;
            currentColor = colorName;
            continue;
          }

          const segments = parseLineSegments(line, currentColor);
          parsedLines.push({ segments });
        }

        setAsciiLines(parsedLines);
      } catch (error) {
        setAsciiLines([{ segments: [{ text: 'LunaCoding Terminal', color: 'white' }] }]);
      }
    };

    // Đọc ASCII name từ file
    const loadAsciiName = async () => {
      try {
        const namePath = path.join(process.cwd(), 'ascii-name.txt');
        const content = await fs.readFile(namePath, 'utf-8');
        const lines = content.split('\n');

        const parsedLines: AsciiLine[] = [];
        let currentColor = 'white';

        for (const line of lines) {
          const colorMatch = line.match(/^\s*#(.+)$/);
          if (colorMatch && colorMatch[1]?.trim()) {
            const rawColor = colorMatch[1].trim();
            const colorName = /^[a-zA-Z]+$/.test(rawColor)
              ? rawColor.toLowerCase()
              : rawColor;
            currentColor = colorName;
            continue;
          }

          const segments = parseLineSegments(line, currentColor);
          parsedLines.push({ segments });
        }

        setAsciiNameLines(parsedLines);
      } catch (error) {
        setAsciiNameLines([{ segments: [{ text: 'LunaCoding', color: 'white' }] }]);
      }
    };

    loadAsciiArt();
    loadAsciiName();
  }, []);

  // Số dòng tối đa để tạo line phân cách và border dọc khớp chiều cao
  const maxLines = Math.max(asciiLines.length, asciiNameLines.length + 4);
  const borderColor = '#0E7490';
  const separatorColor = '#22D3EE';
  const terminalWidth = process.stdout.columns || 200;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Border trên - góc bo tròn */}
      <Text color={borderColor}>{'╭' + '─'.repeat(terminalWidth - 2) + '╮'}</Text>

      <Box flexDirection="row">
        {/* Border trái */}
        <Box flexDirection="column">
          {Array.from({ length: maxLines }, (_, i) => (
            <Text key={i} color={borderColor}>│</Text>
          ))}
        </Box>

        {/* Nội dung chính */}
        <Box flexDirection="column" paddingX={1} flexGrow={1}>
          <Box flexDirection="row">
            {/* Phần trái: ascii-art (nhỏ hơn) */}
            <Box flexDirection="column" paddingRight={1}>
              {asciiLines.map((line, i) => (
                <Text key={i}>
                  {line.segments.map((seg, j) => (
                    <Text
                      key={j}
                      color={seg.color as any}
                      backgroundColor={seg.backgroundColor as any}
                      bold={seg.color !== 'white' && seg.color !== 'gray' && seg.text.trim() !== ''}
                    >
                      {seg.text}
                    </Text>
                  ))}
                </Text>
              ))}
            </Box>

            {/* Line phân cách dọc giữa 2 phần */}
            <Box flexDirection="column" marginX={1}>
              {Array.from({ length: maxLines }, (_, i) => (
                <Text key={i} color={separatorColor}>│</Text>
              ))}
            </Box>

            {/* Phần phải: ascii-name + thông tin (lớn hơn) */}
            <Box flexDirection="column" flexGrow={1} paddingLeft={1}>
              {/* Trên: ascii-name, canh giữa */}
              <Box flexDirection="column" alignItems="center" marginBottom={1}>
								<Text> </Text>
                {asciiNameLines.map((line, i) => (
                  <Text key={i}>
                    {line.segments.map((seg, j) => (
                      <Text
                        key={j}
                        color={seg.color as any}
                        backgroundColor={seg.backgroundColor as any}
                      >
                        {seg.text}
                      </Text>
                    ))}
                  </Text>
                ))}
              </Box>

              {/* Dưới: thông tin, canh trái */}
              <Box flexDirection="column" alignItems="flex-start">
                <Text color="yellow">📁 {process.cwd()}</Text>
                <Clock frozen={stableMode} />
                <Text color="magenta">💻 LunaCoding v1.0.0</Text>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Border phải */}
        <Box flexDirection="column">
          {Array.from({ length: maxLines }, (_, i) => (
            <Text key={i} color={borderColor}>│</Text>
          ))}
        </Box>
      </Box>

      {/* Border dưới - góc bo tròn */}
      <Text color={borderColor}>{'╰' + '─'.repeat(terminalWidth - 2) + '╯'}</Text>
    </Box>
  );
};

export default React.memo(TerminalTop);
