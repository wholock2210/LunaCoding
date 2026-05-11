import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { ToolDefinition, ToolResult } from './types.js';
import { resolveSafePath } from './path-utils.js';

/**
 * Phát hiện hệ điều hành và trả về lệnh mở trình duyệt phù hợp.
 */
function getBrowserCommand(browser?: string): string {
  const platform = os.platform();

  // Nếu chỉ định browser cụ thể
  if (browser && browser !== 'default') {
    switch (browser.toLowerCase()) {
      case 'chrome':
      case 'google-chrome':
        return 'google-chrome';
      case 'chromium':
        return 'chromium-browser';
      case 'firefox':
        return 'firefox';
      case 'edge':
      case 'microsoft-edge':
        if (platform === 'linux') return 'microsoft-edge';
        return 'microsoft-edge';
      default:
        return browser;
    }
  }

  // Mặc định theo OS
  switch (platform) {
    case 'linux':
      return 'xdg-open';
    case 'darwin':
      return 'open';
    case 'win32':
      return 'start';
    default:
      return 'xdg-open';
  }
}

/**
 * Kiểm tra URL có hợp lệ không.
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'file:';
  } catch {
    return false;
  }
}

/**
 * Kiểm tra file có phải HTML không.
 */
function isHtmlFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.html' || ext === '.htm';
}

export const previewWebTool: ToolDefinition = {
  name: 'preview_web',
  description:
    'Mở URL hoặc file HTML trong trình duyệt để xem trước kết quả. ' +
    'Hỗ trợ http://, https://, và đường dẫn file .html.',
  parameters: [
    {
      name: 'url',
      type: 'string',
      description: 'URL (http://, https://) hoặc đường dẫn file HTML cần mở',
      required: true,
    },
    {
      name: 'browser',
      type: 'string',
      description: 'Trình duyệt: "default", "chrome", "firefox", "edge". Mặc định: default.',
      required: false,
      default: 'default',
    },
  ],
  example:
    '<preview_web>\n' +
    '  <url>http://localhost:3000</url>\n' +
    '  <browser>default</browser>\n' +
    '</preview_web>',

  async execute(args, context): Promise<ToolResult> {
    try {
      const rawUrl = (args['url'] as string) || '';
      const browser = (args['browser'] as string) || 'default';

      if (!rawUrl.trim()) {
        return { content: 'Lỗi: Tham số "url" là bắt buộc và không được rỗng.', isError: true };
      }

      let targetUrl: string;

      // Phân biệt URL vs đường dẫn file
      if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
        // URL trực tiếp — kiểm tra tính hợp lệ
        if (!isValidUrl(rawUrl)) {
          return { content: `Lỗi: URL không hợp lệ: "${rawUrl}"`, isError: true };
        }
        targetUrl = rawUrl;
      } else if (isHtmlFile(rawUrl) || !rawUrl.includes('://')) {
        // Đường dẫn file — resolve và kiểm tra tồn tại
        let filePath: string;
        try {
          filePath = resolveSafePath(rawUrl, context.workingDirectory);
        } catch (err: any) {
          return { content: `Lỗi đường dẫn: ${err.message}`, isError: true };
        }

        if (!fs.existsSync(filePath)) {
          return { content: `Lỗi: File "${rawUrl}" không tồn tại.`, isError: true };
        }

        const stat = fs.statSync(filePath);
        if (!stat.isFile()) {
          return { content: `Lỗi: "${rawUrl}" không phải là file.`, isError: true };
        }

        if (!isHtmlFile(filePath)) {
          return {
            content: `Lỗi: File "${rawUrl}" không phải file HTML (chỉ hỗ trợ .html, .htm).`,
            isError: true,
          };
        }

        // Chuyển thành file:// URI
        targetUrl = `file://${filePath}`;
      } else {
        return {
          content: `Lỗi: Không thể xác định loại URL: "${rawUrl}". Vui lòng dùng http://, https://, hoặc đường dẫn file .html.`,
          isError: true,
        };
      }

      // Xác định lệnh trình duyệt
      const browserCmd = getBrowserCommand(browser);

      // Kiểm tra trình duyệt có tồn tại (chỉ trên Linux)
      if (os.platform() === 'linux' && browser !== 'default' && browser !== 'xdg-open') {
        try {
          execSync(`which ${browserCmd}`, { stdio: 'ignore' });
        } catch {
          return {
            content: `Lỗi: Không tìm thấy trình duyệt "${browserCmd}". Hãy cài đặt hoặc dùng "default".`,
            isError: true,
          };
        }
      }

      // Mở URL trong trình duyệt (detached, không block)
      try {
        const platform = os.platform();
        let command: string;

        if (platform === 'win32') {
          command = `start "" "${targetUrl}"`;
        } else if (platform === 'darwin') {
          command = `open "${targetUrl}"`;
        } else {
          // Linux
          command = `${browserCmd} "${targetUrl}"`;
        }

        execSync(command, {
          stdio: 'ignore',
          timeout: 5000,
        } as any);

      } catch (err: any) {
        // Nếu không mở được bằng browser cụ thể, thử fallback xdg-open
        if (os.platform() === 'linux' && browserCmd !== 'xdg-open') {
          try {
            execSync(`xdg-open "${targetUrl}"`, { stdio: 'ignore', timeout: 5000 } as any);
          } catch {
            return {
              content: `Lỗi: Không thể mở trình duyệt. Lệnh "${browserCmd}" không khả dụng.\nURL: ${targetUrl}`,
              isError: true,
            };
          }
          return { content: `✅ Đã mở URL bằng xdg-open (fallback): ${targetUrl}` };
        }
        return {
          content: `Lỗi khi mở trình duyệt: ${err.message}\nURL: ${targetUrl}`,
          isError: true,
        };
      }

      return { content: `✅ Đã mở trong trình duyệt (${browserCmd}): ${targetUrl}` };
    } catch (err: any) {
      return {
        content: `Lỗi preview_web: ${err.message}`,
        isError: true,
      };
    }
  },
};