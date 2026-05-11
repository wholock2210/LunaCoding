import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ToolDefinition, ToolResult } from './types.js';
import { resolveSafePath } from './path-utils.js';
import { validateCommandSecurity } from './command-security.js';

/** Các hành động git được hỗ trợ */
type GitAction = 'status' | 'diff' | 'log' | 'branch' | 'add' | 'commit' | 'checkout' | 'pull' | 'push';

/** Hành động an toàn — không cần approval */
const SAFE_ACTIONS: GitAction[] = ['status', 'diff', 'log', 'branch'];

/**
 * Kiểm tra thư mục có phải git repo không.
 */
function isGitRepo(repoPath: string): boolean {
  return fs.existsSync(path.join(repoPath, '.git'));
}

/**
 * Lấy đường dẫn gốc của git repo (có thể khác với repoPath nếu repoPath là subdirectory).
 */
function getGitRoot(repoPath: string): string {
  try {
    return execSync('git rev-parse --show-toplevel', { cwd: repoPath, encoding: 'utf-8' }).trim();
  } catch {
    return repoPath;
  }
}

/**
 * Thực thi lệnh git và trả về output.
 */
function runGit(args: string[], cwd: string, timeoutMs: number = 30_000): { stdout: string; stderr: string; exitCode: number } {
  const command = `git ${args.join(' ')}`;
  try {
    const stdout = execSync(command, {
      cwd,
      encoding: 'utf-8',
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, GIT_PAGER: 'cat', PAGER: 'cat' },
    });
    return { stdout: stdout.trim(), stderr: '', exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout?.trim() || '',
      stderr: error.stderr?.trim() || error.message || '',
      exitCode: error.status ?? 1,
    };
  }
}

/**
 * Format git status output.
 */
function formatStatus(stdout: string): string {
  if (!stdout) return '🌿 Working tree sạch, không có thay đổi nào.';

  const lines = stdout.split('\n');
  const staged: string[] = [];
  const unstaged: string[] = [];
  const untracked: string[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const status = line.slice(0, 2);
    const file = line.slice(3).trim();

    // Staged changes (index)
    if (status[0] !== ' ' && status[0] !== '?') {
      staged.push(`  ${status} ${file}`);
    }
    // Unstaged changes (working tree)
    if (status[1] !== ' ' && status[1] !== '?') {
      unstaged.push(`  ${status} ${file}`);
    }
    // Untracked
    if (status.startsWith('??')) {
      untracked.push(`  ${status} ${file}`);
    }
  }

  const parts: string[] = [];
  parts.push('📋 GIT STATUS');
  parts.push('');

  if (staged.length > 0) {
    parts.push('📦 Changes staged for commit:');
    parts.push(...staged.slice(0, 50));
    if (staged.length > 50) parts.push(`  ... và ${staged.length - 50} file khác`);
    parts.push('');
  }
  if (unstaged.length > 0) {
    parts.push('✏️  Changes not staged for commit:');
    parts.push(...unstaged.slice(0, 50));
    if (unstaged.length > 50) parts.push(`  ... và ${unstaged.length - 50} file khác`);
    parts.push('');
  }
  if (untracked.length > 0) {
    parts.push('❓ Untracked files:');
    parts.push(...untracked.slice(0, 50));
    if (untracked.length > 50) parts.push(`  ... và ${untracked.length - 50} file khác`);
    parts.push('');
  }

  parts.push(`📊 Tổng: ${staged.length} staged, ${unstaged.length} unstaged, ${untracked.length} untracked`);

  return parts.join('\n');
}

/**
 * Format git diff output.
 */
function formatDiff(stdout: string): string {
  if (!stdout.trim()) return '📝 Không có thay đổi nào (working tree sạch).';
  const maxLines = 200;
  const lines = stdout.split('\n');
  if (lines.length > maxLines) {
    const truncated = lines.slice(0, maxLines).join('\n');
    return `📝 GIT DIFF\n\n${truncated}\n\n... [ĐÃ CẮT BỚT: ${lines.length - maxLines} dòng] ...`;
  }
  return `📝 GIT DIFF\n\n${stdout}`;
}

/**
 * Format git log output.
 */
function formatLog(stdout: string): string {
  if (!stdout.trim()) return '📜 Không có commit nào.';
  return `📜 GIT LOG\n\n${stdout}`;
}

export const gitOperationsTool: ToolDefinition = {
  name: 'git_operations',
  description:
    'Thao tác git cơ bản: status, diff, log, branch, add, commit, checkout, pull, push. ' +
    'Các lệnh an toàn (status, diff, log, branch) chạy tự động. ' +
    'Các lệnh thay đổi (add, commit, checkout, pull, push) yêu cầu xác nhận.',
  parameters: [
    {
      name: 'action',
      type: 'string',
      description: 'Hành động git: "status", "diff", "log", "branch", "add", "commit", "checkout", "pull", "push"',
      required: true,
    },
    {
      name: 'path',
      type: 'string',
      description: 'Đường dẫn repo git (mặc định: thư mục làm việc hiện tại)',
      required: false,
    },
    {
      name: 'files',
      type: 'string',
      description: 'Danh sách file cho "add" (cách nhau bởi dấu cách). Dùng "." để add tất cả.',
      required: false,
    },
    {
      name: 'message',
      type: 'string',
      description: 'Commit message cho "commit"',
      required: false,
    },
    {
      name: 'branch',
      type: 'string',
      description: 'Tên branch cho "checkout", "pull", "push"',
      required: false,
    },
    {
      name: 'limit',
      type: 'number',
      description: 'Số lượng commit hiển thị cho "log". Mặc định: 10.',
      required: false,
      default: 10,
    },
  ],
  example:
    '<git_operations>\n' +
    '  <action>status</action>\n' +
    '  <path>.</path>\n' +
    '</git_operations>',

  async execute(args, context): Promise<ToolResult> {
    try {
      const action = (args['action'] as string) || '';
      const rawPath = (args['path'] as string) || context.workingDirectory;
      const files = (args['files'] as string) || '';
      const message = (args['message'] as string) || '';
      const branch = (args['branch'] as string) || '';
      const limit = typeof args['limit'] === 'number' ? args['limit'] : 10;

      // Validate action
      const validActions: GitAction[] = ['status', 'diff', 'log', 'branch', 'add', 'commit', 'checkout', 'pull', 'push'];
      if (!validActions.includes(action as GitAction)) {
        return {
          content: `Lỗi: Hành động "${action}" không hợp lệ. Các hành động hỗ trợ: ${validActions.join(', ')}.`,
          isError: true,
        };
      }

      // Resolve đường dẫn
      let repoPath: string;
      try {
        repoPath = resolveSafePath(rawPath, context.workingDirectory);
      } catch (err: any) {
        return { content: `Lỗi đường dẫn: ${err.message}`, isError: true };
      }

      if (!fs.existsSync(repoPath)) {
        return { content: `Lỗi: Thư mục "${rawPath}" không tồn tại.`, isError: true };
      }

      // Kiểm tra git repo
      if (!isGitRepo(repoPath)) {
        // Thử kiểm tra xem thư mục cha có .git không
        const gitRoot = getGitRoot(repoPath);
        if (isGitRepo(gitRoot)) {
          repoPath = gitRoot;
        } else {
          return { content: `Lỗi: "${rawPath}" không phải là git repository.`, isError: true };
        }
      }

      // Tạo lệnh git
      let gitArgs: string[] = [];
      switch (action) {
        case 'status':
          gitArgs = ['status', '--porcelain'];
          break;
        case 'diff':
          gitArgs = ['diff', '--stat'];
          break;
        case 'log':
          gitArgs = ['log', '--oneline', '--graph', '--decorate', `-${Math.min(limit, 100)}`];
          break;
        case 'branch':
          gitArgs = ['branch', '-a', '--list'];
          break;
        case 'add':
          if (!files) {
            return { content: 'Lỗi: Tham số "files" là bắt buộc cho hành động "add".', isError: true };
          }
          gitArgs = ['add', ...files.split(' ').filter(Boolean)];
          break;
        case 'commit':
          if (!message) {
            return { content: 'Lỗi: Tham số "message" là bắt buộc cho hành động "commit".', isError: true };
          }
          gitArgs = ['commit', '-m', message];
          break;
        case 'checkout':
          if (!branch) {
            return { content: 'Lỗi: Tham số "branch" là bắt buộc cho hành động "checkout".', isError: true };
          }
          gitArgs = ['checkout', branch];
          break;
        case 'pull':
          gitArgs = branch ? ['pull', 'origin', branch] : ['pull'];
          break;
        case 'push':
          gitArgs = branch ? ['push', 'origin', branch] : ['push'];
          break;
      }

      // Kiểm tra bảo mật cho các hành động không an toàn
      if (!SAFE_ACTIONS.includes(action as GitAction)) {
        const fullCommand = `git ${gitArgs.join(' ')}`;
        const securityCheck = validateCommandSecurity(fullCommand, true);
        if (!securityCheck.allowed) {
          return {
            content: `🚫 Hành động git bị từ chối: ${securityCheck.reason}`,
            isError: true,
          };
        }

        // Chặn các lệnh phá hoại
        if (action === 'push' && branch === '--force') {
          return {
            content: '🚫 Git push --force bị chặn vì lý do bảo mật. Hành động này có thể ghi đè lịch sử remote.',
            isError: true,
          };
        }
      }

      // Thực thi lệnh git
      const result = runGit(gitArgs, repoPath);

      if (result.exitCode !== 0) {
        const errorMsg = result.stderr || result.stdout;
        return {
          content: `❌ Lỗi git ${action}:\n${errorMsg}`,
          isError: true,
        };
      }

      // Format kết quả theo loại action
      let output: string;
      switch (action) {
        case 'status':
          output = formatStatus(result.stdout);
          break;
        case 'diff':
          output = formatDiff(result.stdout + '\n' + result.stderr);
          break;
        case 'log':
          output = formatLog(result.stdout);
          break;
        case 'branch': {
          const branches = result.stdout.split('\n').filter(Boolean);
          const current = branches.find(b => b.startsWith('*'));
          const others = branches.filter(b => !b.startsWith('*'));
          output = '🌿 GIT BRANCHES\n\n';
          if (current) output += `📍 ${current.trim()}\n\n`;
          output += others.slice(0, 100).join('\n');
          if (others.length > 100) output += `\n... và ${others.length - 100} branch khác`;
          break;
        }
        case 'add':
          output = `✅ Đã thêm file vào staging area:\n${files.split(' ').filter(Boolean).map(f => `  📄 ${f}`).join('\n')}`;
          break;
        case 'commit':
          output = `✅ Commit thành công!\n📝 "${message}"`;
          break;
        case 'checkout':
          output = `✅ Đã chuyển sang branch: ${branch}`;
          break;
        case 'pull':
          output = result.stdout || '✅ Pull thành công!';
          break;
        case 'push':
          output = result.stdout || '✅ Push thành công!';
          break;
        default:
          output = result.stdout || '✅ Thao tác hoàn tất.';
      }

      return { content: output };
    } catch (err: any) {
      return {
        content: `Lỗi git: ${err.message}`,
        isError: true,
      };
    }
  },
};