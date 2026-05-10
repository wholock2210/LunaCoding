import * as path from 'node:path';
import * as fs from 'node:fs';
import type { ToolDefinition } from './types.js';
import { resolveSafePath } from './path-utils.js';
import { walkDirectory, readFileLinesSafe } from './search-utils.js';

/** Các loại định nghĩa được hỗ trợ */
type DefinitionKind = 'function' | 'class' | 'interface' | 'type' | 'const' | 'enum';

interface CodeDefinition {
  name: string;
  kind: DefinitionKind;
  line: number;
  exported: boolean;
}

interface FileDefinitions {
  file: string;
  definitions: CodeDefinition[];
}

/** Map giữa tên loại và regex pattern */
const DEFINITION_PATTERNS: Record<DefinitionKind, RegExp> = {
  function: /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g,
  class: /(?:export\s+)?class\s+(\w+)/g,
  interface: /(?:export\s+)?interface\s+(\w+)/g,
  type: /(?:export\s+)?type\s+(\w+)/g,
  const: /(?:export\s+)?const\s+(\w+)/g,
  enum: /(?:export\s+)?enum\s+(\w+)/g,
};

const ALL_KINDS: DefinitionKind[] = ['function', 'class', 'interface', 'type', 'const', 'enum'];

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts']);

function isCodeFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return CODE_EXTENSIONS.has(ext);
}

/**
 * Parse một file để tìm tất cả định nghĩa top-level.
 */
async function parseDefinitions(filePath: string, filterKinds: DefinitionKind[]): Promise<CodeDefinition[]> {
  const lines = await readFileLinesSafe(filePath);
  if (!lines) return [];

  const definitions: CodeDefinition[] = [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx]!;
    const trimmed = line.trim();

    // Bỏ qua dòng trống và comment
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      continue;
    }

    for (const kind of filterKinds) {
      const regex = DEFINITION_PATTERNS[kind];
      regex.lastIndex = 0;
      const match = regex.exec(trimmed);
      if (match) {
        const name = match[1]!;
        const exported = trimmed.startsWith('export');
        definitions.push({ name, kind, line: lineIdx + 1, exported });
        break; // Chỉ match một loại mỗi dòng
      }
    }

    // Giới hạn số lượng định nghĩa mỗi file
    if (definitions.length >= 100) break;
  }

  return definitions;
}

export const listCodeDefinitionsTool: ToolDefinition = {
  name: 'list_code_definitions',
  description:
    'Liệt kê các định nghĩa top-level (function, class, interface, type, const, enum) ' +
    'từ file hoặc thư mục TypeScript/JavaScript. Hỗ trợ lọc theo loại định nghĩa.',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'Đường dẫn đến file hoặc thư mục cần phân tích',
      required: true,
    },
    {
      name: 'filter',
      type: 'string',
      description: 'Lọc theo loại: "function", "class", "interface", "type", "const", "enum", "all". Mặc định: "all".',
      required: false,
      default: 'all',
    },
    {
      name: 'recursive',
      type: 'boolean',
      description: 'Nếu path là thư mục, tìm kiếm đệ quy. Mặc định: false.',
      required: false,
      default: false,
    },
  ],
  example:
    '<list_code_definitions>\n' +
    '  <path>src/services</path>\n' +
    '  <filter>all</filter>\n' +
    '  <recursive>true</recursive>\n' +
    '</list_code_definitions>',

  async execute(args, context) {
    try {
      const rawPath = (args['path'] as string) || '';
      const filterStr = (args['filter'] as string) || 'all';
      const recursive = args['recursive'] === true || args['recursive'] === 'true';

      if (!rawPath.trim()) {
        return { content: 'Lỗi: Đường dẫn không được để trống.', isError: true };
      }

      // Xác định các loại cần lọc
      let filterKinds: DefinitionKind[];
      if (filterStr === 'all') {
        filterKinds = [...ALL_KINDS];
      } else if (ALL_KINDS.includes(filterStr as DefinitionKind)) {
        filterKinds = [filterStr as DefinitionKind];
      } else {
        return {
          content: `Lỗi: Bộ lọc "${filterStr}" không hợp lệ. Các giá trị hợp lệ: all, ${ALL_KINDS.join(', ')}.`,
          isError: true,
        };
      }

      // Resolve đường dẫn an toàn
      let resolvedPath: string;
      try {
        resolvedPath = resolveSafePath(rawPath, context.workingDirectory);
      } catch (err: any) {
        return { content: `Lỗi đường dẫn: ${err.message}`, isError: true };
      }

      // Kiểm tra tồn tại
      let stat: fs.Stats;
      try {
        stat = fs.statSync(resolvedPath);
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          return { content: `Lỗi: Đường dẫn "${rawPath}" không tồn tại.`, isError: true };
        }
        return { content: `Lỗi khi truy cập "${rawPath}": ${err.message}`, isError: true };
      }

      // Xác định danh sách file cần phân tích
      let files: string[];

      if (stat.isFile()) {
        if (!isCodeFile(resolvedPath)) {
          return {
            content: `Lỗi: "${rawPath}" không phải là file code (định dạng hỗ trợ: .ts, .tsx, .js, .jsx).`,
            isError: true,
          };
        }
        files = [resolvedPath];
      } else if (stat.isDirectory()) {
        try {
          if (recursive) {
            files = await walkDirectory(resolvedPath, null);
          } else {
            // Chỉ lấy file top-level
            const entries = fs.readdirSync(resolvedPath, { withFileTypes: true });
            files = entries
              .filter((e) => e.isFile())
              .map((e) => path.join(resolvedPath, e.name));
          }
        } catch (err: any) {
          return { content: `Lỗi khi duyệt thư mục: ${err.message}`, isError: true };
        }

        // Lọc chỉ giữ file code
        files = files.filter((f) => isCodeFile(f));

        if (files.length === 0) {
          return { content: `Không tìm thấy file code nào trong "${rawPath}".` };
        }
      } else {
        return { content: `Lỗi: "${rawPath}" không phải là file hoặc thư mục.`, isError: true };
      }

      // Parse từng file
      const allResults: FileDefinitions[] = [];
      let totalDefs = 0;
      const MAX_FILES = 50;
      const MAX_TOTAL_DEFS = 200;

      for (const filePath of files) {
        if (allResults.length >= MAX_FILES || totalDefs >= MAX_TOTAL_DEFS) break;

        const defs = await parseDefinitions(filePath, filterKinds);
        if (defs.length > 0) {
          allResults.push({ file: filePath, definitions: defs });
          totalDefs += defs.length;
        }
      }

      if (allResults.length === 0) {
        const filterLabel = filterStr === 'all' ? 'tất cả loại' : `loại "${filterStr}"`;
        return {
          content: `Không tìm thấy định nghĩa ${filterLabel} nào trong "${rawPath}".`,
        };
      }

      // Định dạng output
      const output: string[] = [];
      const totalFiles = allResults.length;

      let summary = `Tìm thấy ${totalDefs} định nghĩa trong ${totalFiles} file`;
      if (totalDefs >= MAX_TOTAL_DEFS) {
        summary += ` (đã giới hạn)`;
      }
      summary += ':';
      output.push(summary);

      for (const { file, definitions } of allResults) {
        const relativePath = path.relative(resolvedPath, file);
        output.push(`\n📄 ${relativePath}:`);
        for (const d of definitions) {
          const exportTag = d.exported ? '[export] ' : '';
          const lineLabel = `Dòng ${String(d.line).padStart(4, ' ')}`;
          output.push(`  ${lineLabel} | ${exportTag}${d.kind}: ${d.name}`);
        }
      }

      // Thêm thống kê theo loại
      const kindCounts = new Map<DefinitionKind, number>();
      for (const { definitions } of allResults) {
        for (const d of definitions) {
          kindCounts.set(d.kind, (kindCounts.get(d.kind) || 0) + 1);
        }
      }

      const stats = ALL_KINDS
        .filter((k) => kindCounts.has(k))
        .map((k) => `${k}: ${kindCounts.get(k)}`);
      if (stats.length > 0) {
        output.push(`\n📊 Thống kê: ${stats.join(', ')}`);
      }

      return { content: output.join('\n') };
    } catch (err: any) {
      return { content: `Lỗi không xác định: ${err.message}`, isError: true };
    }
  },
};