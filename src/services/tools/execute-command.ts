import { exec } from 'node:child_process';
import type { ToolDefinition } from './types.js';
import { sanitizeCommand, validateCommandSecurity } from './command-security.js';

const COMMAND_TIMEOUT_MS = 60_000; // 60 giây
const MAX_OUTPUT_LENGTH = 50_000;   // 50KB

/**
 * Sanitize nhẹ: loại bỏ ký tự điều khiển nguy hiểm ngoại trừ \n và \t.
 * (Wrapper cho hàm trong command-security để xử lý an toàn)
 */
function cleanControlChars(text: string): string {
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Cắt ngắn output nếu vượt quá giới hạn.
 */
function truncateOutput(output: string, maxLength: number): string {
  if (output.length <= maxLength) return output;
  const half = Math.floor(maxLength / 2);
  return (
    output.slice(0, half) +
    `\n\n... [ĐÃ CẮT BỚT: ${output.length - maxLength} ký tự bị lược bỏ] ...\n\n` +
    output.slice(-half)
  );
}

/**
 * Thực thi lệnh CLI bằng child_process.exec và trả về kết quả.
 */
function executeCommand(command: string, cwd: string): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  return new Promise((resolve, reject) => {
    const child = exec(
      command,
      {
        cwd,
        timeout: COMMAND_TIMEOUT_MS,
        maxBuffer: 1024 * 1024, // 1MB buffer
        shell: '/bin/bash',
        env: { ...process.env },
      },
      (error, stdout, stderr) => {
        if (error) {
          // Lỗi nhưng vẫn có thể có output
          if ('killed' in error && (error as any).killed) {
            return reject(new Error(`Lệnh bị timeout sau ${COMMAND_TIMEOUT_MS / 1000}s`));
          }

          // Lỗi exit code != 0 — vẫn trả về output để user xem
          const code = (error as any).code ?? 1;
          return resolve({
            stdout: stdout || '',
            stderr: stderr || error.message || '',
            exitCode: code,
          });
        }

        return resolve({
          stdout: stdout || '',
          stderr: stderr || '',
          exitCode: 0,
        });
      },
    );

    // Xử lý thêm trường hợp process bị kill bởi timeout
    child.on('error', (err) => {
      reject(new Error(`Không thể khởi chạy lệnh: ${err.message}`));
    });
  });
}

export const executeCommandTool: ToolDefinition = {
  name: 'execute_command',
  description:
    'Thực thi lệnh CLI trong terminal. Hỗ trợ cơ chế phê duyệt an toàn (requires_approval). Các lệnh nguy hiểm sẽ bị chặn.',
  parameters: [
    {
      name: 'command',
      type: 'string',
      description: 'Lệnh CLI cần thực thi (bash shell)',
      required: true,
    },
    {
      name: 'requires_approval',
      type: 'boolean',
      description:
        'Đặt true nếu lệnh có rủi ro (cài đặt package, xóa file, thay đổi hệ thống, git force push...)',
      required: true,
    },
  ],
  example: `<execute_command>\n<command>npm run build</command>\n<requires_approval>false</requires_approval>\n</execute_command>`,
  execute: async (args, context) => {
    try {
      const rawCommand = (args['command'] as string) || '';
      const userRequiresApproval =
        args['requires_approval'] === true ||
        args['requires_approval'] === 'true';

      // Validate cơ bản
      if (!rawCommand.trim()) {
        return { content: 'Lỗi: Lệnh không được để trống.', isError: true };
      }

      if (rawCommand.length > 10_000) {
        return {
          content: 'Lỗi: Lệnh quá dài (tối đa 10,000 ký tự).',
          isError: true,
        };
      }

      // Sanitize nhẹ lệnh
      const sanitized = sanitizeCommand(rawCommand);

      // Kiểm tra bảo mật
      const securityCheck = validateCommandSecurity(
        sanitized,
        userRequiresApproval,
      );
      if (!securityCheck.allowed) {
        return {
          content: `🚫 Lệnh bị từ chối: ${securityCheck.reason}`,
          isError: true,
        };
      }

      // Thực thi lệnh
      const result = await executeCommand(
        sanitized,
        context.workingDirectory,
      );

      // Tổng hợp output
      let output = '';
      let isError = false;

      const stdoutClean = cleanControlChars(result.stdout);
      const stderrClean = cleanControlChars(result.stderr);
      if (stdoutClean) {
        output += stdoutClean;
      }
      if (stderrClean) {
        if (output) output += '\n';
        output += `[STDERR]\n${stderrClean}`;
      }
      if (!output) {
        output = '(không có output)';
      }

      // Cắt bớt output nếu quá dài
      const truncated = truncateOutput(output, MAX_OUTPUT_LENGTH);

      // Header
      let header = '';
      if (result.exitCode === 0) {
        header += `✅ Lệnh thực thi thành công (exit code: 0)`;
      } else {
        header += `❌ Lệnh thực thi thất bại (exit code: ${result.exitCode})`;
        isError = true;
      }

      if (output !== truncated) {
        header += `\n⚠ Output đã bị cắt bớt (${output.length} → ${truncated.length} ký tự)`;
      }

      header += `:\n\n`;

      return { content: header + truncated, isError };
    } catch (err: any) {
      return {
        content: `🚫 Lỗi thực thi lệnh: ${err.message}`,
        isError: true,
      };
    }
  },
};