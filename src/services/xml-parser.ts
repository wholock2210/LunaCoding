import { randomUUID } from 'node:crypto';
import type { ToolCall } from './tools/types.js';

/**
 * XML Parser thô sơ — parse các block XML từ text response của AI.
 * Dùng khi toolParseMode = 'xml' hoặc provider không hỗ trợ native tool calling.
 *
 * Format XML:
 *   <tool_name>
 *     <param1>value1</param1>
 *     <param2>value2</param2>
 *   </tool_name>
 *
 * Hỗ trợ:
 * - Nhiều tool call trong cùng 1 response
 * - Giá trị số được tự động parse thành number
 * - Boolean "true"/"false" được parse thành boolean
 * - Text ngoài XML block được bỏ qua
 * - Tự phục hồi nếu thiếu thẻ đóng ở mức tham số
 */

/** Kết quả parse: danh sách ToolCall và phần text còn lại */
export interface XmlParseResult {
  toolCalls: ToolCall[];
  /** Phần text không chứa XML tool call */
  remainingText: string;
}

/**
 * Parse tất cả XML tool call blocks từ text.
 * Mỗi block XML có dạng <tool_name>...</tool_name>.
 *
 * @param text - Text response từ AI
 * @returns XmlParseResult với danh sách ToolCall và text còn lại
 */
export function parseXmlToolCalls(text: string): XmlParseResult {
  if (!text || text.trim().length === 0) {
    return { toolCalls: [], remainingText: text ?? '' };
  }

  const toolCalls: ToolCall[] = [];
  // Pattern: tìm opening tag <tên_tool> bất kỳ, match đa dòng
  const toolPattern = /<([a-zA-Z_][a-zA-Z0-9_]*)>([\s\S]*?)<\/\1>/g;

  let match: RegExpExecArray | null;
  const consumedPositions: Array<{ start: number; end: number }> = [];

  while ((match = toolPattern.exec(text)) !== null) {
    const toolName = match[1];
    const innerXml = match[2];

    if (!toolName || innerXml === undefined) continue;

    // Parse tham số từ inner XML
    const args = parseParameters(innerXml);

    toolCalls.push({ id: randomUUID(), name: toolName, arguments: args });

    // Đánh dấu vị trí đã consume
    consumedPositions.push({
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  // Xây dựng remaining text bằng cách loại bỏ các XML block đã parse
  let remainingText = '';
  let lastEnd = 0;
  for (const pos of consumedPositions) {
    remainingText += text.slice(lastEnd, pos.start);
    lastEnd = pos.end;
  }
  remainingText += text.slice(lastEnd);

  // Trim remaining text
  remainingText = remainingText.trim();

  return { toolCalls, remainingText };
}

/**
 * Parse các tham số từ inner XML của tool block.
 * Mỗi tham số là 1 thẻ con: <param_name>value</param_name>.
 *
 * @returns Record<string, unknown> các tham số đã parse và cast kiểu
 */
function parseParameters(innerXml: string): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  // Match thẻ đơn giản: <key>value</key> (không chứa thẻ con lồng nhau)
  const paramPattern = /<([a-zA-Z_][a-zA-Z0-9_]*)>([\s\S]*?)<\/\1>/g;

  let match: RegExpExecArray | null;
  while ((match = paramPattern.exec(innerXml)) !== null) {
    const key = match[1];
    const rawValue = match[2];

    if (!key || rawValue === undefined) continue;

    // Cast kiểu giá trị
    args[key] = castValue(rawValue.trim());
  }

  return args;
}

/**
 * Tự động cast giá trị string sang kiểu phù hợp.
 * - "true"/"false" → boolean
 * - Số nguyên/thực → number
 * - Còn lại → string
 */
function castValue(value: string): string | number | boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Kiểm tra số: chỉ cast nếu toàn bộ chuỗi là số hợp lệ
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    const num = Number(value);
    if (!Number.isNaN(num)) return num;
  }

  return value;
}