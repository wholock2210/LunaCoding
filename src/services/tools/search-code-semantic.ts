import type { ToolDefinition } from './types.js';
import { resolveSafePath } from './path-utils.js';
import {
  walkDirectory,
  searchInFile,
  formatSearchResults,
  type FileMatch,
} from './search-utils.js';

/**
 * Các preset pattern có sẵn cho tìm kiếm nhanh.
 */
const PRESETS: Record<string, { regex: string; description: string }> = {
  functions: {
    regex: '(?:export\\s+)?(?:async\\s+)?function\\s+\\w+',
    description: 'Khai báo hàm (cả async và export)',
  },
  classes: {
    regex: '(?:export\\s+)?class\\s+\\w+',
    description: 'Khai báo class',
  },
  interfaces: {
    regex: '(?:export\\s+)?interface\\s+\\w+',
    description: 'Khai báo interface',
  },
  types: {
    regex: '(?:export\\s+)?type\\s+\\w+',
    description: 'Type alias',
  },
  enums: {
    regex: '(?:export\\s+)?enum\\s+\\w+',
    description: 'Khai báo enum',
  },
  imports: {
    regex: 'import\\s+.*from\\s+[\'"].*[\'"]',
    description: 'Câu lệnh import',
  },
  exports: {
    regex: 'export\\s+(?:default\\s+)?(?:\\w+\\s+)?\\w+',
    description: 'Câu lệnh export',
  },
  arrow_functions: {
    regex: '(?:const|let|var)\\s+\\w+\\s*=\\s*(?:async\\s*)?\\(',
    description: 'Arrow function / function expression',
  },
  todos: {
    regex: 'TODO|FIXME|HACK|XXX|OPTIMIZE|BUG|WORKAROUND|TEMP',
    description: 'Ghi chú TODO/FIXME/HACK trong code',
  },
  comments: {
    regex: '\\/\\*[\\s\\S]*?\\*\\/|\\/\\/.*',
    description: 'Comment trong code',
  },
  decorators: {
    regex: '@\\w+',
    description: 'Decorator/Annotation',
  },
};

export const searchCodeSemanticTool: ToolDefinition = {
  name: 'search_code_semantic',
  description:
    'Tìm kiếm cấu trúc code nâng cao với các preset pattern (functions, classes, imports, exports, todos, v.v.). ' +
    'Hỗ trợ regex tùy chỉnh và nhóm kết quả theo file.',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'Đường dẫn thư mục cần tìm kiếm',
      required: true,
    },
    {
      name: 'query',
      type: 'string',
      description: 'Regex pattern tùy chỉnh để tìm kiếm (dùng nếu không chọn preset)',
      required: false,
    },
    {
      name: 'preset',
      type: 'string',
      description: `Preset pattern có sẵn: ${Object.keys(PRESETS).join(', ')}`,
      required: false,
    },
    {
      name: 'file_pattern',
      type: 'string',
      description: 'Glob lọc file. Mặc định: "*.{ts,tsx,js,jsx}"',
      required: false,
      default: '*.{ts,tsx,js,jsx}',
    },
    {
      name: 'context_lines',
      type: 'number',
      description: 'Số dòng ngữ cảnh hiển thị xung quanh kết quả. Mặc định: 2.',
      required: false,
      default: 2,
    },
    {
      name: 'max_results',
      type: 'number',
      description: 'Số kết quả tối đa. Mặc định: 50.',
      required: false,
      default: 50,
    },
  ],
  example:
    '<search_code_semantic>\n' +
    '  <path>src</path>\n' +
    '  <preset>todos</preset>\n' +
    '  <file_pattern>*.{ts,tsx}</file_pattern>\n' +
    '  <context_lines>1</context_lines>\n' +
    '  <max_results>30</max_results>\n' +
    '</search_code_semantic>',

  async execute(args, context) {
    try {
      const rawPath = (args['path'] as string) || '';
      const queryStr = (args['query'] as string) || '';
      const presetStr = (args['preset'] as string) || '';
      const filePattern = (args['file_pattern'] as string) || '*.{ts,tsx,js,jsx}';
      const contextLines = Number(args['context_lines'] ?? 2);
      const maxResults = Number(args['max_results'] ?? 50);

      if (!rawPath.trim()) {
        return { content: 'Lỗi: Đường dẫn không được để trống.', isError: true };
      }

      // Xác định regex từ preset hoặc query
      let regexStr: string;
      let searchLabel: string;

      if (presetStr) {
        const preset = PRESETS[presetStr];
        if (!preset) {
          return {
            content: `Lỗi: Preset "${presetStr}" không hợp lệ. Các preset có sẵn: ${Object.keys(PRESETS).join(', ')}.`,
            isError: true,
          };
        }
        regexStr = preset.regex;
        searchLabel = `${presetStr} (${preset.description})`;
      } else if (queryStr.trim()) {
        regexStr = queryStr;
        searchLabel = `"${queryStr}"`;
      } else {
        return {
          content: 'Lỗi: Phải chỉ định "preset" hoặc "query".',
          isError: true,
        };
      }

      let regex: RegExp;
      try {
        regex = new RegExp(regexStr, 'gm');
      } catch (err: any) {
        return { content: `Lỗi: Regex không hợp lệ: ${err.message}`, isError: true };
      }

      // Resolve đường dẫn an toàn
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
          content: `Không tìm thấy file nào khớp với pattern "${filePattern}" trong "${rawPath}".`,
        };
      }

      // Tìm kiếm trong từng file
      const allMatches: FileMatch[] = [];
      for (const filePath of files) {
        if (allMatches.length >= maxResults * 3) break;
        const matches = await searchInFile(filePath, regex, contextLines, maxResults);
        allMatches.push(...matches);
      }

      const output = formatSearchResults(allMatches, resolvedPath, searchLabel, maxResults);

      // Thêm thông tin preset nếu có
      if (presetStr) {
        return {
          content: `🔍 Tìm kiếm: ${searchLabel}\n\n${output}`,
        };
      }

      return { content: output };
    } catch (err: any) {
      return { content: `Lỗi không xác định: ${err.message}`, isError: true };
    }
  },
};