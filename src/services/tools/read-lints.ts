import { execSync } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';
import type { ToolDefinition } from './types.js';
import { resolveSafePath } from './path-utils.js';

/**
 * Tool đọc lỗi và cảnh báo từ TypeScript compiler (`tsc --noEmit`) hoặc ESLint.
 */
export const readLintsTool: ToolDefinition = {
  name: 'read_lints',
  description:
    'Đọc lỗi và cảnh báo từ TypeScript compiler (tsc --noEmit) hoặc ESLint. ' +
    'Trả về danh sách lỗi có cấu trúc: file, dòng, severity, message.',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'Đường dẫn file/thư mục cần kiểm tra (mặc định: thư mục làm việc hiện tại)',
      required: false,
    },
    {
      name: 'linter',
      type: 'string',
      description: 'Linter sử dụng: "tsc" (mặc định) hoặc "eslint"',
      required: false,
      default: 'tsc',
    },
  ],
  example:
    '<read_lints>\n' +
    '  <path>src</path>\n' +
    '  <linter>tsc</linter>\n' +
    '</read_lints>',

  async execute(args, context) {
    try {
      const rawPath = (args['path'] as string) || context.workingDirectory;
      const linter = (args['linter'] as string) || 'tsc';

      // Resolve đường dẫn an toàn
      let resolvedPath: string;
      try {
        resolvedPath = resolveSafePath(rawPath, context.workingDirectory);
      } catch (err: any) {
        return { content: `Lỗi đường dẫn: ${err.message}`, isError: true };
      }

      // Kiểm tra đường dẫn tồn tại
      if (!fs.existsSync(resolvedPath)) {
        return { content: `Lỗi: Đường dẫn "${rawPath}" không tồn tại.`, isError: true };
      }

      if (linter === 'eslint') {
        return await runEslint(resolvedPath, context.workingDirectory);
      } else {
        return await runTsc(resolvedPath, context.workingDirectory);
      }
    } catch (err: any) {
      return { content: `Lỗi không xác định: ${err.message}`, isError: true };
    }
  },
};

interface LintEntry {
  file: string;
  line: number;
  severity: 'error' | 'warning';
  message: string;
}

async function runTsc(_targetPath: string, workingDir: string) {
  // Tìm binary tsc
  const tscPath = findBinary('tsc', workingDir);
  if (!tscPath) {
    return {
      content: 'Lỗi: Không tìm thấy TypeScript compiler (tsc). Hãy đảm bảo typescript đã được cài đặt trong dự án.',
      isError: true,
    };
  }

  try {
    // Chạy tsc --noEmit --pretty false từ workingDir
    const output = execSync(`"${tscPath}" --noEmit --pretty false`, {
      cwd: workingDir,
      timeout: 30_000,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Nếu không có lỗi
    const trimmed = output.trim();
    if (!trimmed || trimmed.includes('error TS') === false) {
      // Kiểm tra xem có output nào không
      if (trimmed.length === 0) {
        return { content: '✅ Không có lỗi TypeScript.' };
      }
      // Có thể có warning nhưng không phải error
      return { content: `✅ Không có lỗi TypeScript.\n\nOutput:\n${trimmed.slice(0, 1000)}` };
    }

    const entries = parseTscOutput(trimmed);
    return formatLintResults(entries, 'TypeScript');
  } catch (err: any) {
    // tsc trả về exit code != 0 khi có lỗi
    const stdout = err.stdout || '';
    const stderr = err.stderr || '';
    const combined = stdout + stderr;

    if (!combined.trim()) {
      return { content: '✅ Không có lỗi TypeScript (tsc thoát với lỗi nhưng không có output).' };
    }

    const entries = parseTscOutput(combined);
    if (entries.length === 0) {
      return { content: `Lỗi khi chạy tsc:\n${combined.slice(0, 2000)}`, isError: true };
    }

    return formatLintResults(entries, 'TypeScript');
  }
}

async function runEslint(targetPath: string, workingDir: string) {
  const eslintPath = findBinary('eslint', workingDir);
  if (!eslintPath) {
    return {
      content: 'Lỗi: Không tìm thấy ESLint. Hãy đảm bảo eslint đã được cài đặt trong dự án.',
      isError: true,
    };
  }

  try {
    const output = execSync(
      `"${eslintPath}" "${targetPath}" --format json`,
      {
        cwd: workingDir,
        timeout: 30_000,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );

    const results = JSON.parse(output);
    const entries: LintEntry[] = [];

    for (const fileResult of results) {
      const filePath = fileResult.filePath;
      for (const msg of fileResult.messages) {
        entries.push({
          file: filePath,
          line: msg.line || 0,
          severity: msg.severity === 2 ? 'error' : 'warning',
          message: msg.message + (msg.ruleId ? ` (${msg.ruleId})` : ''),
        });
      }
    }

    return formatLintResults(entries, 'ESLint');
  } catch (err: any) {
    const stderr = err.stderr || '';
    const stdout = err.stdout || '';

    // ESLint có thể trả về JSON ngay cả khi có lỗi
    if (stdout) {
      try {
        const results = JSON.parse(stdout);
        const entries: LintEntry[] = [];
        for (const fileResult of results) {
          for (const msg of fileResult.messages) {
            entries.push({
              file: fileResult.filePath,
              line: msg.line || 0,
              severity: msg.severity === 2 ? 'error' : 'warning',
              message: msg.message + (msg.ruleId ? ` (${msg.ruleId})` : ''),
            });
          }
        }
        return formatLintResults(entries, 'ESLint');
      } catch {
        // fall through
      }
    }

    return { content: `Lỗi khi chạy ESLint:\n${stderr || err.message}`.slice(0, 2000), isError: true };
  }
}

function findBinary(name: string, workingDir: string): string | null {
  // Thử tìm trong node_modules/.bin trước
  const localBin = path.join(workingDir, 'node_modules', '.bin', name);
  if (fs.existsSync(localBin)) {
    return localBin;
  }

  // Thử tìm global
  try {
    const result = execSync(`which "${name}" 2>/dev/null || command -v "${name}" 2>/dev/null`, {
      encoding: 'utf-8',
      timeout: 5000,
    });
    const globalPath = result.trim();
    if (globalPath && fs.existsSync(globalPath)) {
      return globalPath;
    }
  } catch {
    // Không tìm thấy
  }

  return null;
}

function parseTscOutput(output: string): LintEntry[] {
  const entries: LintEntry[] = [];
  // Pattern cho tsc output: file(line,col): error TSxxxx: message
  const regex = /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/gm;

  let match;
  while ((match = regex.exec(output)) !== null) {
    const [, file, lineStr, , severity, , message] = match;
    entries.push({
      file: file!,
      line: parseInt(lineStr!, 10),
      severity: severity === 'error' ? 'error' : 'warning',
      message: message!,
    });
  }

  return entries;
}

function formatLintResults(entries: LintEntry[], tool: string) {
  if (entries.length === 0) {
    return { content: `✅ Không có lỗi ${tool}.` };
  }

  const maxResults = 50;
  const limited = entries.slice(0, maxResults);
  const errors = limited.filter((e) => e.severity === 'error').length;
  const warnings = limited.filter((e) => e.severity === 'warning').length;

  let summary = `${tool}: ${entries.length} vấn đề`;
  if (entries.length > maxResults) {
    summary += ` (hiển thị ${maxResults} đầu tiên)`;
  }
  summary += ` (${errors} lỗi, ${warnings} cảnh báo):\n\n`;

  // Nhóm theo file
  const byFile = new Map<string, LintEntry[]>();
  for (const entry of limited) {
    const list = byFile.get(entry.file) || [];
    list.push(entry);
    byFile.set(entry.file, list);
  }

  const output: string[] = [summary];
  for (const [file, fileEntries] of byFile) {
    output.push(`📄 ${file}:`);
    for (const e of fileEntries) {
      const icon = e.severity === 'error' ? '❌' : '⚠️';
      output.push(`  ${icon} Dòng ${e.line}: ${e.message}`);
    }
    output.push('');
  }

  return { content: output.join('\n') };
}