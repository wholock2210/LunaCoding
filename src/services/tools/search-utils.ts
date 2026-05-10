import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Các tiện ích dùng chung cho các tool tìm kiếm và phân tích code.
 * Được dùng bởi: search_files, search_code_semantic, list_code_definitions.
 */

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg',
  '.pdf', '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.dat',
  '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv',
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
  '.db', '.sqlite', '.sqlite3',
  '.o', '.obj', '.class', '.pyc', '.pyo',
  '.wasm',
]);

const MAX_FILE_SIZE = 500 * 1024; // 500KB - bỏ qua file quá lớn

/** Kiểm tra file có phải nhị phân không (dựa trên extension) */
export function isBinaryFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

/** Chuyển glob pattern đơn giản sang RegExp */
export function globToRegex(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`);
}

/** Kết quả tìm kiếm trong một file */
export interface FileMatch {
  file: string;
  line: number;
  content: string;
  context: string;
}

/**
 * Duyệt thư mục đệ quy, trả về danh sách file khớp với pattern.
 * Bỏ qua thư mục ẩn, node_modules, .git.
 */
export async function walkDirectory(
  dirPath: string,
  filePattern: string | null,
): Promise<string[]> {
  const files: string[] = [];
  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return files; // Permission error → trả về rỗng
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const subFiles = await walkDirectory(fullPath, filePattern);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      if (filePattern) {
        const regex = globToRegex(filePattern);
        if (regex.test(entry.name)) {
          files.push(fullPath);
        }
      } else {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Đọc nội dung file an toàn, bỏ qua file nhị phân hoặc quá lớn.
 * Trả về mảng các dòng hoặc null nếu không đọc được.
 */
export async function readFileLinesSafe(filePath: string): Promise<string[] | null> {
  if (isBinaryFile(filePath)) return null;

  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch {
    return null;
  }

  if (stat.size > MAX_FILE_SIZE || stat.size === 0) return null;

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content.split('\n');
  } catch {
    return null;
  }
}

/**
 * Tìm kiếm regex trong một file, trả về danh sách FileMatch.
 */
export async function searchInFile(
  filePath: string,
  regex: RegExp,
  contextLines: number,
  maxMatches: number,
): Promise<FileMatch[]> {
  const lines = await readFileLinesSafe(filePath);
  if (!lines) return [];

  const matches: FileMatch[] = [];

  for (let i = 0; i < lines.length && matches.length < maxMatches; i++) {
    const line = lines[i]!;
    regex.lastIndex = 0;
    if (regex.test(line)) {
      regex.lastIndex = 0;
      const start = Math.max(0, i - contextLines);
      const end = Math.min(lines.length, i + contextLines + 1);
      const maxLineNumWidth = String(lines.length).length;
      const contextBlock = lines
        .slice(start, end)
        .map((l, idx) => {
          const lineNum = start + idx + 1;
          const marker = lineNum === i + 1 ? '>' : ' ';
          return `${marker} ${String(lineNum).padStart(maxLineNumWidth)} | ${l}`;
        })
        .join('\n');

      matches.push({
        file: filePath,
        line: i + 1,
        content: line,
        context: contextBlock,
      });
    }
  }

  return matches;
}

/**
 * Định dạng kết quả tìm kiếm thành text output.
 */
export function formatSearchResults(
  results: FileMatch[],
  basePath: string,
  regexStr: string,
  maxResults: number,
): string {
  if (results.length === 0) {
    return `Không tìm thấy kết quả nào cho pattern "${regexStr}".`;
  }

  const limitedResults = results.slice(0, maxResults);
  const totalFiles = new Set(limitedResults.map((r) => r.file)).size;
  const summary =
    `${limitedResults.length} kết quả trong ${totalFiles} file` +
    (results.length > maxResults ? ` (giới hạn từ ${results.length})` : '') +
    `:\n\n`;

  const output = limitedResults
    .map((r) => `📄 ${path.relative(basePath, r.file)}:\n${r.context}`)
    .join('\n\n');

  return summary + output;
}