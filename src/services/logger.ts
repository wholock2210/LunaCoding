import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const LOG_DIR = path.join(os.homedir(), '.LunaCoding', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'lunacoding.log');
const MAX_LINES = 1000;

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true, mode: 0o700 });
  }
}

/** Ghi một dòng log */
export function log(level: LogLevel, message: string, meta?: unknown): void {
  ensureLogDir();

  const timestamp = new Date().toISOString();
  let line = `[${timestamp}] [${level}] ${message}`;

  if (meta !== undefined) {
    try {
      line += ` | ${JSON.stringify(meta)}`;
    } catch {
      line += ` | ${String(meta)}`;
    }
  }

  line += '\n';

  // Đọc nội dung hiện tại
  let content = '';
  if (fs.existsSync(LOG_FILE)) {
    content = fs.readFileSync(LOG_FILE, 'utf-8');
  }

  // Thêm dòng mới
  content += line;

  // Xoay vòng: giữ MAX_LINES dòng cuối
  const lines = content.split('\n').filter((l) => l.length > 0);
  if (lines.length > MAX_LINES) {
    content = lines.slice(lines.length - MAX_LINES).join('\n') + '\n';
  }

  fs.writeFileSync(LOG_FILE, content, { mode: 0o600 });
}

/** Ghi log ERROR kèm stack trace */
export function logError(context: string, error: unknown): void {
  const err = error instanceof Error ? error : new Error(String(error));
  log('ERROR', `${context}: ${err.message}`, { stack: err.stack });
}

/** Đọc N dòng log cuối (mặc định 50) */
export function getLogs(lines?: number): string {
  if (!fs.existsSync(LOG_FILE)) return '(Chưa có log nào)';

  const content = fs.readFileSync(LOG_FILE, 'utf-8');
  const allLines = content.split('\n').filter((l) => l.length > 0);

  const count = lines ?? 50;
  if (allLines.length <= count) return allLines.join('\n');

  return `... (${allLines.length - count} dòng cũ hơn)\n` + allLines.slice(-count).join('\n');
}

/** Xóa toàn bộ log */
export function clearLogs(): void {
  if (fs.existsSync(LOG_FILE)) {
    fs.unlinkSync(LOG_FILE);
  }
}