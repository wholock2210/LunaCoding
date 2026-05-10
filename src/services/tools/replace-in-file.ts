import * as fs from 'node:fs/promises';
import type { ToolDefinition } from './types.js';
import { resolveSafePath } from './path-utils.js';

// ============================================================
// SEARCH/REPLACE Block Parser
// ============================================================

interface SearchReplaceBlock {
  search: string;
  replace: string;
}

/**
 * Parse diff string thành các SEARCH/REPLACE blocks.
 * Format:
 * ```
 * ------- SEARCH
 * <search content>
 * =======
 * <replace content>
 * +++++++ REPLACE
 * ```
 */
function parseDiffBlocks(diff: string): SearchReplaceBlock[] {
  const blocks: SearchReplaceBlock[] = [];
  const lines = diff.split('\n');

  let currentSearch: string[] = [];
  let currentReplace: string[] = [];
  let mode: 'none' | 'search' | 'replace' = 'none';

  for (const line of lines) {
    if (line.trim() === '------- SEARCH') {
      // Nếu đang có search chưa kết thúc -> lỗi
      if (mode === 'search') {
        throw new Error(
          'Gặp "------- SEARCH" khi đang trong block SEARCH. Có thể thiếu dấu phân cách "=======" hoặc "+++++++ REPLACE".',
        );
      }
      // Nếu đang có replace đang mở -> lưu block cũ trước khi bắt đầu block mới
      if (mode === 'replace') {
        blocks.push({
          search: currentSearch.join('\n'),
          replace: currentReplace.join('\n'),
        });
        currentSearch = [];
        currentReplace = [];
      }
      mode = 'search';
      continue;
    }

    if (line.trim() === '=======') {
      if (mode === 'search') {
        mode = 'replace';
        continue;
      }
      throw new Error('Gặp "=======" nhưng không trong block SEARCH. Kiểm tra định dạng SEARCH/REPLACE.');
    }

    if (line.trim() === '+++++++ REPLACE') {
      if (mode === 'replace') {
        blocks.push({
          search: currentSearch.join('\n'),
          replace: currentReplace.join('\n'),
        });
        currentSearch = [];
        currentReplace = [];
        mode = 'none';
        continue;
      }
      throw new Error(
        'Gặp "+++++++ REPLACE" nhưng không trong block REPLACE. Kiểm tra định dạng SEARCH/REPLACE.',
      );
    }

    if (mode === 'search') {
      currentSearch.push(line);
    } else if (mode === 'replace') {
      currentReplace.push(line);
    }
  }

  if (mode !== 'none') {
    throw new Error(
      'Block SEARCH/REPLACE chưa được đóng. Đảm bảo kết thúc mỗi block bằng "+++++++ REPLACE".',
    );
  }

  return blocks;
}

/**
 * Kiểm tra trùng lặp SEARCH blocks
 */
function validateUniqueBlocks(blocks: SearchReplaceBlock[]): void {
  for (let i = 0; i < blocks.length; i++) {
    const blockA = blocks[i]!;
    for (let j = i + 1; j < blocks.length; j++) {
      const blockB = blocks[j]!;
      if (blockA.search === blockB.search) {
        throw new Error(
          `Có ít nhất 2 SEARCH block giống hệt nhau. Block "${blockA.search.substring(0, 50)}..." bị trùng. Mỗi SEARCH block phải là duy nhất.`,
        );
      }
    }
  }
}

/**
 * Áp dụng các SEARCH/REPLACE blocks lên nội dung file.
 * Mỗi SEARCH block phải match chính xác và chỉ match 1 lần.
 */
function applySearchReplace(originalContent: string, blocks: SearchReplaceBlock[]): string {
  let result = originalContent;

  for (const block of blocks) {
    const index = result.indexOf(block.search);

    if (index === -1) {
      const preview =
        block.search.length > 100
          ? block.search.substring(0, 100) + '...'
          : block.search;
      throw new Error(
        `Không tìm thấy SEARCH block trong file:\n\`\`\`\n${preview}\n\`\`\`\n` +
          'Kiểm tra lại nội dung SEARCH có khớp chính xác với file không (bao gồm whitespace, indent).',
      );
    }

    // Kiểm tra match chỉ xuất hiện 1 lần
    const secondIndex = result.indexOf(block.search, index + 1);
    if (secondIndex !== -1) {
      const preview =
        block.search.length > 100
          ? block.search.substring(0, 100) + '...'
          : block.search;
      throw new Error(
        `SEARCH block xuất hiện nhiều lần trong file (ít nhất 2 lần):\n\`\`\`\n${preview}\n\`\`\`\n` +
          'Hãy thêm nhiều ngữ cảnh hơn vào SEARCH block để nó trở thành duy nhất.',
      );
    }

    // Thực hiện thay thế
    result =
      result.substring(0, index) +
      block.replace +
      result.substring(index + block.search.length);
  }

  return result;
}

export const replaceInFileTool: ToolDefinition = {
  name: 'replace_in_file',
  description:
    'Thay thế chính xác đoạn code trong file bằng cơ chế SEARCH/REPLACE blocks. Mỗi block có format: ------- SEARCH, nội dung cũ, =======, nội dung mới, +++++++ REPLACE.',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'Đường dẫn đến file cần sửa',
      required: true,
    },
    {
      name: 'diff',
      type: 'string',
      description:
        'Chuỗi diff chứa các SEARCH/REPLACE blocks. Format:\n------- SEARCH\n<nội dung cũ>\n=======\n<nội dung mới>\n+++++++ REPLACE',
      required: true,
    },
  ],
  example: `<replace_in_file>\n<path>src/app.ts</path>\n<diff>\n------- SEARCH\nimport React from 'react';\n=======\nimport React, { useState } from 'react';\n+++++++ REPLACE\n</diff>\n</replace_in_file>`,
  execute: async (args, context) => {
    try {
      const rawPath = (args['path'] as string) || '';
      const diff = (args['diff'] as string) || '';

      if (!rawPath.trim()) {
        return { content: 'Lỗi: Đường dẫn không được để trống.', isError: true };
      }

      if (!diff.trim()) {
        return { content: 'Lỗi: diff không được để trống.', isError: true };
      }

      // Parse SEARCH/REPLACE blocks
      let blocks: SearchReplaceBlock[];
      try {
        blocks = parseDiffBlocks(diff);
      } catch (err: any) {
        return { content: `Lỗi parse diff: ${err.message}`, isError: true };
      }

      if (blocks.length === 0) {
        return {
          content:
            'Lỗi: Không tìm thấy SEARCH/REPLACE block nào trong diff. Kiểm tra định dạng:\n------- SEARCH\n<nội dung cũ>\n=======\n<nội dung mới>\n+++++++ REPLACE',
          isError: true,
        };
      }

      // Validate blocks không trùng
      try {
        validateUniqueBlocks(blocks);
      } catch (err: any) {
        return { content: `Lỗi validate blocks: ${err.message}`, isError: true };
      }

      // Resolve path
      let resolvedPath: string;
      try {
        resolvedPath = resolveSafePath(rawPath, context.workingDirectory);
      } catch (err: any) {
        return { content: `Lỗi đường dẫn: ${err.message}`, isError: true };
      }

      // Đọc file
      let originalContent: string;
      try {
        originalContent = await fs.readFile(resolvedPath, 'utf-8');
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          return { content: `Lỗi: File "${rawPath}" không tồn tại.`, isError: true };
        }
        if (err.code === 'EACCES') {
          return { content: `Lỗi: Không có quyền đọc "${rawPath}".`, isError: true };
        }
        return { content: `Lỗi khi đọc file: ${err.message}`, isError: true };
      }

      // Áp dụng SEARCH/REPLACE
      let newContent: string;
      try {
        newContent = applySearchReplace(originalContent, blocks);
      } catch (err: any) {
        return { content: `Lỗi áp dụng SEARCH/REPLACE: ${err.message}`, isError: true };
      }

      // Ghi file
      try {
        await fs.writeFile(resolvedPath, newContent, 'utf-8');
      } catch (err: any) {
        if (err.code === 'EACCES') {
          return { content: `Lỗi: Không có quyền ghi vào "${rawPath}".`, isError: true };
        }
        return { content: `Lỗi khi ghi file: ${err.message}`, isError: true };
      }

      // Đếm số dòng thay đổi
      const oldLines = originalContent.split('\n').length;
      const newLines = newContent.split('\n').length;
      const lineDiff = newLines - oldLines;

      let summary = `✅ Đã áp dụng ${blocks.length} SEARCH/REPLACE block(s) vào "${rawPath}".\n`;
      summary += `File: ${oldLines} → ${newLines} dòng`;
      if (lineDiff !== 0) {
        summary += ` (${lineDiff > 0 ? '+' : ''}${lineDiff})`;
      }
      summary += '.';

      return { content: summary };
    } catch (err: any) {
      return { content: `Lỗi không xác định: ${err.message}`, isError: true };
    }
  },
};