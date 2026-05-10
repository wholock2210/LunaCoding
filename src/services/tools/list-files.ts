import * as fs from 'node:fs/promises';
import type { ToolDefinition } from './types.js';
import { resolveSafePath } from './path-utils.js';

/** Thư mục bỏ qua mặc định */
const DEFAULT_EXCLUDES = new Set(['.git', 'node_modules', '.svn', '.hg']);

/** Giới hạn hiển thị */
const MAX_ITEMS = 500;

interface ListEntry {
  name: string;
  isDirectory: boolean;
}

function formatTree(
  entries: ListEntry[],
  _depth: number = 0,
  parentPrefix: string = '',
  _isLast: boolean = false,
): string {
  const lines: string[] = [];
  const dirEntries = entries.filter((e) => e.isDirectory).sort((a, b) => a.name.localeCompare(b.name));
  const fileEntries = entries.filter((e) => !e.isDirectory).sort((a, b) => a.name.localeCompare(b.name));
  const all = [...dirEntries, ...fileEntries];

  for (let i = 0; i < all.length; i++) {
    const entry = all[i]!;
    const last = i === all.length - 1;
    const connector = last ? '└── ' : '├── ';
    const prefix = parentPrefix + connector;
    lines.push(`${prefix}${entry.name}${entry.isDirectory ? '/' : ''}`);
  }

  return lines.join('\n');
}

function formatFlat(entries: ListEntry[], _basePath: string): string {
  const dirEntries = entries.filter((e) => e.isDirectory).sort((a, b) => a.name.localeCompare(b.name));
  const fileEntries = entries.filter((e) => !e.isDirectory).sort((a, b) => a.name.localeCompare(b.name));

  const lines: string[] = [];
  if (dirEntries.length > 0) {
    lines.push('[Thư mục]');
    for (const d of dirEntries) {
      lines.push(`  ${d.name}/`);
    }
  }
  if (fileEntries.length > 0) {
    if (dirEntries.length > 0) lines.push('');
    lines.push('[File]');
    for (const f of fileEntries) {
      lines.push(`  ${f.name}`);
    }
  }
  return lines.join('\n');
}

export const listFilesTool: ToolDefinition = {
  name: 'list_files',
  description: 'Liệt kê danh sách file và thư mục. Hỗ trợ cả chế độ phẳng và đệ quy.',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'Đường dẫn đến thư mục cần liệt kê',
      required: true,
    },
    {
      name: 'recursive',
      type: 'boolean',
      description: 'Có liệt kê đệ quy hay không',
      required: false,
      default: false,
    },
  ],
  example: `<list_files>\n<path>src/services</path>\n<recursive>true</recursive>\n</list_files>`,
  execute: async (args, context) => {
    try {
      const rawPath = (args['path'] as string) || '';
      if (!rawPath.trim()) {
        return { content: 'Lỗi: Đường dẫn không được để trống.', isError: true };
      }

      const recursive = args['recursive'] === true || args['recursive'] === 'true';
      const resolvedPath = resolveSafePath(rawPath, context.workingDirectory);

      let stat: any;
      try {
        stat = await fs.stat(resolvedPath);
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          return { content: `Lỗi: Thư mục "${rawPath}" không tồn tại.`, isError: true };
        }
        if (err.code === 'EACCES') {
          return { content: `Lỗi: Không có quyền truy cập "${rawPath}".`, isError: true };
        }
        return { content: `Lỗi khi truy cập "${rawPath}": ${err.message}`, isError: true };
      }

      if (!stat.isDirectory()) {
        return { content: `Lỗi: "${rawPath}" không phải là thư mục.`, isError: true };
      }

      const rawEntries = await fs.readdir(resolvedPath, { withFileTypes: true });
      const entries: ListEntry[] = [];
      for (const entry of rawEntries) {
        if (DEFAULT_EXCLUDES.has(entry.name)) continue;
        entries.push({ name: entry.name, isDirectory: entry.isDirectory() });
      }

      if (entries.length === 0) {
        return { content: `Thư mục "${rawPath}" rỗng (hoặc chỉ chứa thư mục bị bỏ qua như .git, node_modules).` };
      }

      if (entries.length > MAX_ITEMS) {
        const truncated = entries.slice(0, MAX_ITEMS);
        const output = recursive
          ? formatTree(truncated)
          : formatFlat(truncated, rawPath);
        return {
          content: `Danh sách file/thư mục trong "${rawPath}" (đã cắt bớt, hiển thị ${MAX_ITEMS}/${entries.length} mục):\n\n${output}`,
        };
      }

      const output = recursive
        ? formatTree(entries)
        : formatFlat(entries, rawPath);

      let header = `Danh sách file/thư mục trong "${rawPath}"`;
      if (recursive) header += ' (đệ quy)';
      header += ` (${entries.length} mục):\n\n`;

      return { content: header + output };
    } catch (err: any) {
      return { content: `Lỗi không xác định: ${err.message}`, isError: true };
    }
  },
};