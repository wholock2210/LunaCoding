import type { Command } from './types.js';

/**
 * Định nghĩa tất cả các lệnh slash được hỗ trợ trong LunaCoding.
 * Mỗi lệnh có tên chính, alias (tuỳ chọn) và mô tả ngắn bằng tiếng Việt.
 */
export const registeredCommands: Command[] = [
  {
    name: '/provider',
    aliases: ['/providers'],
    description: 'Quản lý provider — thêm, xoá, chọn provider',
  },
  {
    name: '/model',
    aliases: ['/models'],
    description: 'Quản lý model — chọn model cho provider hiện tại',
  },
  {
    name: '/tool-mode',
    aliases: ['/tm'],
    description: 'Chế độ gọi tool: auto (tự động), native (API), xml (parse XML từ text)',
  },
  {
    name: '/logs',
    description: 'Xem log hệ thống — /logs (50 dòng cuối), /logs all, /logs clear',
  },
  {
    name: '/help',
    aliases: ['/h'],
    description: 'Hiển thị danh sách lệnh và trợ giúp',
  },
];

/**
 * Lọc danh sách lệnh dựa trên chuỗi truy vấn người dùng nhập sau dấu `/`.
 * @param query Chuỗi sau dấu `/` (có thể rỗng để hiện tất cả lệnh)
 * @returns Danh sách lệnh khớp với truy vấn
 */
export function filterCommands(query: string): Command[] {
  if (!query) {
    return [...registeredCommands];
  }

  const lower = query.toLowerCase();
  return registeredCommands.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(lower) ||
      cmd.aliases?.some((alias) => alias.toLowerCase().includes(lower)),
  );
}

/**
 * Kiểm tra xem một chuỗi nhập vào có phải là lệnh đã biết hay không.
 * So khớp chính xác tên lệnh hoặc tên lệnh + tham số.
 * @param input Chuỗi người dùng nhập (đã được trim)
 * @returns `true` nếu input khớp với một lệnh đã đăng ký
 */
export function isKnownCommand(input: string): boolean {
  const lower = input.toLowerCase();
  return registeredCommands.some(
    (cmd) =>
      lower === cmd.name.toLowerCase() ||
      lower.startsWith(cmd.name.toLowerCase() + ' ') ||
      cmd.aliases?.some(
        (alias) =>
          lower === alias.toLowerCase() ||
          lower.startsWith(alias.toLowerCase() + ' '),
      ),
  );
}

/**
 * Lấy danh sách tất cả tên lệnh (bao gồm cả alias) dưới dạng mảng phẳng.
 * Hữu ích cho việc hiển thị placeholder hoặc kiểm tra nhanh.
 * @returns Mảng tên lệnh và alias
 */
export function getAllCommandNames(): string[] {
  const names: string[] = [];
  for (const cmd of registeredCommands) {
    names.push(cmd.name);
    if (cmd.aliases) {
      names.push(...cmd.aliases);
    }
  }
  return names;
}