import * as path from 'node:path';

/**
 * Validate và resolve đường dẫn an toàn, chống path traversal attack.
 * Đảm bảo đường dẫn sau khi resolve không vượt ra ngoài workingDirectory.
 *
 * @param rawPath - Đường dẫn thô từ người dùng/AI
 * @param workingDirectory - Thư mục làm việc hiện tại
 * @returns Đường dẫn tuyệt đối đã resolve
 * @throws Error nếu đường dẫn không hợp lệ hoặc vượt ra ngoài workingDirectory
 */
export function resolveSafePath(rawPath: string, workingDirectory: string): string {
  // Kiểm tra tham số đầu vào
  if (!rawPath || typeof rawPath !== 'string') {
    throw new Error('Đường dẫn không được để trống');
  }

  if (!workingDirectory || typeof workingDirectory !== 'string') {
    throw new Error('Thư mục làm việc không hợp lệ');
  }

  // Chuẩn hóa workingDirectory thành tuyệt đối
  const normalizedWd = path.resolve(workingDirectory);

  // Resolve đường dẫn đầy đủ
  const resolved = path.resolve(normalizedWd, rawPath);

  // Chống path traversal: kiểm tra resolved có nằm trong workingDirectory không
  // Dùng path.relative để kiểm tra
  const relative = path.relative(normalizedWd, resolved);

  // Nếu relative bắt đầu bằng '..' hoặc rỗng sau khi chuẩn hóa -> path traversal
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(
      `Path traversal bị chặn: "${rawPath}" vượt ra ngoài thư mục làm việc`
    );
  }

  // Kiểm tra thêm: relative không được chứa null byte
  if (relative.includes('\0')) {
    throw new Error('Đường dẫn chứa ký tự không hợp lệ (null byte)');
  }

  return resolved;
}

/**
 * Validate cơ bản đường dẫn: không rỗng, không chứa ký tự nguy hiểm.
 *
 * @param rawPath - Đường dẫn cần kiểm tra
 * @throws Error nếu đường dẫn không hợp lệ
 */
export function validatePath(rawPath: string): void {
  if (!rawPath || typeof rawPath !== 'string' || rawPath.trim().length === 0) {
    throw new Error('Đường dẫn không được để trống');
  }

  // Chặn null byte injection
  if (rawPath.includes('\0')) {
    throw new Error('Đường dẫn chứa ký tự không hợp lệ (null byte)');
  }

  // Cảnh báo về ký tự đặc biệt (không chặn hoàn toàn, để resolveSafePath xử lý)
  if (rawPath.includes('~')) {
    // Cho phép ~ nhưng cảnh báo - sẽ được resolve bởi path.resolve
  }
}

/**
 * Lấy tên file an toàn từ đường dẫn (chỉ dùng để hiển thị).
 */
export function getSafeFileName(filePath: string): string {
  return path.basename(filePath);
}