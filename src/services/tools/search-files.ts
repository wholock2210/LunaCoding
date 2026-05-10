import type { ToolDefinition } from './types.js';
import { resolveSafePath } from './path-utils.js';
import {
  walkDirectory,
  searchInFile,
  formatSearchResults,
  type FileMatch,
} from './search-utils.js';

const MAX_RESULTS = 200;
const CONTEXT_LINES = 2;

export const searchFilesTool: ToolDefinition = {
  name: 'search_files',
  description:
    'Tìm kiếm regex đệ quy trong thư mục, hỗ trợ lọc theo glob pattern. Trả về kết quả kèm context lines.',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'Đường dẫn đến thư mục cần tìm kiếm',
      required: true,
    },
    {
      name: 'regex',
      type: 'string',
      description: 'Biểu thức chính quy (Rust regex syntax) để tìm kiếm',
      required: true,
    },
    {
      name: 'file_pattern',
      type: 'string',
      description: 'Glob pattern để lọc file (vd: "*.ts", "*.{js,ts}"), không bắt buộc',
      required: false,
    },
  ],
  example:
    '<search_files>\n<path>src</path>\n<regex>interface\\s+\\w+</regex>\n<file_pattern>*.ts</file_pattern>\n</search_files>',
  execute: async (args, context) => {
    try {
      const rawPath = (args['path'] as string) || '';
      const regexStr = (args['regex'] as string) || '';
      const filePattern = (args['file_pattern'] as string) || null;

      if (!rawPath.trim()) {
        return { content: 'Lỗi: Đường dẫn không được để trống.', isError: true };
      }
      if (!regexStr.trim()) {
        return { content: 'Lỗi: Regex không được để trống.', isError: true };
      }

      let regex: RegExp;
      try {
        regex = new RegExp(regexStr, 'gm');
      } catch (err: any) {
        return { content: `Lỗi: Regex không hợp lệ: ${err.message}`, isError: true };
      }

      let resolvedPath: string;
      try {
        resolvedPath = resolveSafePath(rawPath, context.workingDirectory);
      } catch (err: any) {
        return { content: `Lỗi đường dẫn: ${err.message}`, isError: true };
      }

      // Kiểm tra thư mục tồn tại
      try {
        const { stat } = await import('node:fs/promises');
        const dirStat = await stat(resolvedPath);
        if (!dirStat.isDirectory()) {
          return { content: `Lỗi: "${rawPath}" không phải là thư mục.`, isError: true };
        }
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          return { content: `Lỗi: Thư mục "${rawPath}" không tồn tại.`, isError: true };
        }
        if (err.code === 'EACCES') {
          return { content: `Lỗi: Không có quyền truy cập "${rawPath}".`, isError: true };
        }
        return { content: `Lỗi khi truy cập "${rawPath}": ${err.message}`, isError: true };
      }

      // Lấy danh sách file phù hợp
      let files: string[];
      try {
        files = await walkDirectory(resolvedPath, filePattern);
      } catch (err: any) {
        return { content: `Lỗi khi duyệt thư mục: ${err.message}`, isError: true };
      }

      if (files.length === 0) {
        return {
          content: `Không tìm thấy file nào khớp với pattern "${filePattern || '*'}" trong "${rawPath}".`,
        };
      }

      // Tìm kiếm trong từng file
      const allMatches: FileMatch[] = [];
      for (const filePath of files) {
        if (allMatches.length >= MAX_RESULTS * 3) break;
        const matches = await searchInFile(filePath, regex, CONTEXT_LINES, MAX_RESULTS);
        allMatches.push(...matches);
      }

      return {
        content: formatSearchResults(allMatches, resolvedPath, regexStr, MAX_RESULTS),
      };
    } catch (err: any) {
      return { content: `Lỗi không xác định: ${err.message}`, isError: true };
    }
  },
};