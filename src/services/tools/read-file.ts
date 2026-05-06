import { promises as fs } from 'fs';
import path from 'path';
import type { ToolDefinition, ToolExecutionContext, ToolResult } from './types.js';

/**
 * Tool đọc file cơ bản.
 *
 * Tham số:
 *   path       (bắt buộc): Đường dẫn tới file cần đọc
 *   start_line (tùy chọn): Dòng bắt đầu đọc (1-based, mặc định 1)
 *   end_line   (tùy chọn): Dòng kết thúc đọc (1-based, mặc định hết file)
 */
export const readFileTool: ToolDefinition = {
  name: 'read_file',
  description:
    'Đọc nội dung một file từ hệ thống. Hỗ trợ giới hạn phạm vi dòng bằng start_line và end_line. ' +
    'Trả về toàn bộ nội dung file hoặc đoạn được yêu cầu, kèm số dòng.',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'Đường dẫn tới file cần đọc (tương đối hoặc tuyệt đối)',
      required: true,
    },
    {
      name: 'start_line',
      type: 'number',
      description: 'Dòng bắt đầu đọc (1-based). Mặc định: 1.',
      required: false,
      default: 1,
    },
    {
      name: 'end_line',
      type: 'number',
      description: 'Dòng kết thúc đọc (1-based, inclusive). Mặc định: cuối file.',
      required: false,
    },
  ],
  example:
    '<read_file>\n' +
    '  <path>src/services/chat.ts</path>\n' +
    '  <start_line>1</start_line>\n' +
    '  <end_line>50</end_line>\n' +
    '</read_file>',

  async execute(
    args: Record<string, unknown>,
    context: ToolExecutionContext,
  ): Promise<ToolResult> {
    const rawPath = args['path'];
    const filePath = String(rawPath ?? '');

    if (!filePath) {
      return {
        content: 'Lỗi: Tham số "path" là bắt buộc và không được rỗng.',
        isError: true,
      };
    }

    // Giải quyết đường dẫn tương đối → tuyệt đối dựa trên workingDirectory
    const resolvedPath = path.resolve(context.workingDirectory, filePath);

    try {
      const stat = await fs.stat(resolvedPath);

      if (!stat.isFile()) {
        return {
          content: `Lỗi: "${resolvedPath}" không phải là một file.`,
          isError: true,
        };
      }

      const content = await fs.readFile(resolvedPath, 'utf-8');
      const lines = content.split('\n');

      const startLineRaw = args['start_line'];
      const endLineRaw = args['end_line'];
      const startLine =
        typeof startLineRaw === 'number' ? Math.max(1, startLineRaw) : 1;
      const endLine =
        typeof endLineRaw === 'number' ? endLineRaw : lines.length;

      if (startLine > lines.length) {
        return {
          content: `File "${filePath}" chỉ có ${lines.length} dòng, không thể đọc từ dòng ${startLine}.`,
          isError: true,
        };
      }

      const actualEnd = Math.min(endLine, lines.length);
      const selectedLines = lines.slice(startLine - 1, actualEnd);

      // Format output với số dòng
      const formatted = selectedLines
        .map((line, i) => {
          const lineNum = String(startLine + i).padStart(4, ' ');
          return `${lineNum} | ${line}`;
        })
        .join('\n');

      const header =
        startLine === 1 && actualEnd === lines.length
          ? `File: ${filePath} (${lines.length} dòng)\n\n`
          : `File: ${filePath} (dòng ${startLine}-${actualEnd} / ${lines.length})\n\n`;

      return { content: header + formatted };
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        return {
          content: `Lỗi: File "${filePath}" không tồn tại.`,
          isError: true,
        };
      }
      if (err.code === 'EACCES') {
        return {
          content: `Lỗi: Không có quyền đọc file "${filePath}".`,
          isError: true,
        };
      }
      return {
        content: `Lỗi khi đọc file "${filePath}": ${err.message}`,
        isError: true,
      };
    }
  },
};