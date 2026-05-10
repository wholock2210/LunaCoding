/**
 * Module bảo mật cho execute_command.
 * Phát hiện và chặn các lệnh CLI nguy hiểm, fork bomb, và pattern tấn công phổ biến.
 */

/** Pattern các lệnh cực kỳ nguy hiểm - luôn bị chặn bất kể requires_approval */
const ALWAYS_BLOCKED_PATTERNS: RegExp[] = [
  // Fork bomb (classic và biến thể)
  /:\s*\(\s*\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;:/,
  /\(\)\s*\{\s*.*\|\s*.*&\s*\};\s*[^;]*;:/,

  // Xóa toàn bộ hệ thống
  /rm\s+(-[^ ]*r[^ ]*f[^ ]*|[^ ]*rf[^ ]*)\s+\/\s*$/,
  /rm\s+(-[^ ]*r[^ ]*f[^ ]*|[^ ]*rf[^ ]*)\s+\/\*/,
  /rm\s+(-[^ ]*r[^ ]*f[^ ]*|[^ ]*rf[^ ]*)\s+\/etc/,
  /rm\s+(-[^ ]*r[^ ]*f[^ ]*|[^ ]*rf[^ ]*)\s+\/boot/,
  /rm\s+(-[^ ]*r[^ ]*f[^ ]*|[^ ]*rf[^ ]*)\s+\/dev\//,

  // Xóa thư mục home
  /rm\s+(-[^ ]*r[^ ]*f[^ ]*|[^ ]*rf[^ ]*)\s+~(\/|$)/,
  /rm\s+(-[^ ]*r[^ ]*f[^ ]*|[^ ]*rf[^ ]*)\s+\$HOME/,

  // Format ổ đĩa
  /mkfs\b/,
  /mkfs\.\w+/,
  /dd\s+if=/,
  /mkswap\b/,

  // Ghi đè block device
  />\s*\/dev\/sd/,
  />\s*\/dev\/nvme/,
  />\s*\/dev\/hd/,
  />\s*\/dev\/mmcblk/,

  // Fork bomb qua script
  /while\s*\(\s*1\s*\)/,
  /while\s*true/,
  /while\s*:/,
  /for\s*\(\s*;\s*;\s*\)/,

  // Lệnh nguy hiểm với quyền root
  /chmod\s+(-[^ ]*R[^ ]*|[^ ]*R[^ ]*)\s+777\s+\//,
  /chown\s+-R\s+\w+\s+\//,
];

/** Pattern lệnh rủi ro - cần requires_approval: true */
const REQUIRES_APPROVAL_PATTERNS: RegExp[] = [
  // Sudo
  /\bsudo\b/,
  /\bdoas\b/,

  // Xóa file/thư mục (thông thường)
  /\brm\b/,
  /\brmdir\b/,
  /\bdel\b/,
  /\bdeltree\b/,

  // Chỉnh sửa quyền
  /\bchmod\b/,
  /\bchown\b/,
  /\bchattr\b/,

  // Thay đổi hệ thống
  /\bsystemctl\b/,
  /\bservice\b/,
  /\binit\.d\b/,

  // Tắt máy / khởi động lại
  /\bshutdown\b/,
  /\breboot\b/,
  /\bhalt\b/,
  /\bpoweroff\b/,
  /\binit\s+[06]\b/,

  // Ghi đè file quan trọng
  />\s*\/etc\//,
  />>\s*\/etc\//,

  // Process kill
  /\bkillall\b/,
  /\bpkill\b/,
  /\bkill\s+-9\b/,

  // Network manipulation
  /\biptables\b/,
  /\bufw\b/,

  // Mount/unmount
  /\bmount\b/,
  /\bumount\b/,

  // Package manager (có thể gây hại)
  /\bnpm\s+(install|uninstall|update)\s+-g\b/,
  /\bpip\s+(install|uninstall)\b/,
  /\bcargo\s+install\b/,
  /\bgem\s+install\b/,

  // Curl/wget pipe to shell
  /curl.*\|\s*(ba)?sh/,
  /wget.*\|\s*(ba)?sh/,
  /curl.*\|\s*bash/,
  /wget.*\|\s*bash/,

  // Docker với privileged mode
  /docker\s+run.*--privileged/,
  /docker\s+run.*-v\s+\/:/,

  // Git force push
  /git\s+push\s+(-[^ ]*f[^ ]*|[^ ]*f[^ ]*)/,
  /git\s+push\s+--force/,

  // Database destructive commands
  /\bDROP\s+(TABLE|DATABASE)\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\s+FROM\b/i,
];

/**
 * Kiểm tra xem một lệnh có thuộc danh sách luôn bị chặn không.
 * Trả về true nếu lệnh bị chặn.
 */
export function isAlwaysBlocked(command: string): boolean {
  const normalized = command.trim();
  if (normalized.length === 0) return false;

  for (const pattern of ALWAYS_BLOCKED_PATTERNS) {
    if (pattern.test(normalized)) {
      return true;
    }
  }
  return false;
}

/**
 * Kiểm tra xem một lệnh có cần phê duyệt không (dựa trên độ rủi ro).
 * Trả về true nếu lệnh cần requires_approval.
 */
export function requiresApprovalCheck(command: string): boolean {
  const normalized = command.trim();
  if (normalized.length === 0) return false;

  // Nếu lệnh đã bị chặn hoàn toàn, không cần kiểm tra approval
  if (isAlwaysBlocked(normalized)) return true;

  for (const pattern of REQUIRES_APPROVAL_PATTERNS) {
    if (pattern.test(normalized)) {
      return true;
    }
  }

  // Mặc định: các lệnh không khớp pattern rủi ro thì không cần approval
  return false;
}

/**
 * Validate toàn diện một lệnh CLI. Trả về:
 * - { allowed: false, reason: string } nếu bị chặn
 * - { allowed: true, requiresApproval: boolean } nếu được phép
 */
export function validateCommandSecurity(
  command: string,
  userRequiresApproval: boolean
): {
  allowed: boolean;
  reason?: string;
  requiresApproval?: boolean;
} {
  if (!command || typeof command !== 'string' || command.trim().length === 0) {
    return { allowed: false, reason: 'Lệnh không được để trống' };
  }

  // Kiểm tra độ dài tối đa (ngăn chặn injection qua command quá dài)
  if (command.length > 10000) {
    return { allowed: false, reason: 'Lệnh quá dài (tối đa 10,000 ký tự)' };
  }

  // 1. Kiểm tra danh sách luôn bị chặn
  if (isAlwaysBlocked(command)) {
    return {
      allowed: false,
      reason:
        'Lệnh bị chặn vì lý do bảo mật. Lệnh này có khả năng phá hủy hệ thống hoặc gây mất dữ liệu nghiêm trọng.',
    };
  }

  // 2. Kiểm tra lệnh có cần phê duyệt không
  const needsApproval = requiresApprovalCheck(command);

  // 3. Nếu lệnh cần phê duyệt nhưng user set requires_approval: false
  if (needsApproval && !userRequiresApproval) {
    return {
      allowed: false,
      reason: `Lệnh này yêu cầu phê duyệt (requires_approval: true) nhưng bạn đã đặt requires_approval: false. Hãy đặt requires_approval: true để thực thi lệnh này.`,
    };
  }

  return { allowed: true, requiresApproval: needsApproval };
}

/**
 * Sanitize nhẹ lệnh: loại bỏ các ký tự điều khiển nguy hiểm
 * (ngoại trừ newline và tab hợp lệ trong script).
 */
export function sanitizeCommand(command: string): string {
  return command
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''); // Giữ \n (0x0A) và \t (0x09)
}