import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { ToolDefinition, ToolExecutionContext, ToolResult } from "./types.js";
import { resolveSafePath } from "./path-utils.js";

const MAX_FILE_SIZE = 1_000_000; // 1MB

export const writeToFileTool: ToolDefinition = {
  name: "write_to_file",
  description:
    "Tạo mới hoặc ghi đè file, tự động tạo thư mục cha nếu chưa tồn tại.",
  parameters: [
    {
      name: "path",
      type: "string",
      description: "Đường dẫn file cần ghi",
      required: true,
    },
    {
      name: "content",
      type: "string",
      description: "Nội dung cần ghi vào file",
      required: true,
    },
  ],
  example:
    "<write_to_file>\n<path>src/hello.ts</path>\n<content>\nconsole.log(\"Xin chao\");\n</content>\n</write_to_file>",
  execute: async (
    args: Record<string, unknown>,
    context: ToolExecutionContext,
  ): Promise<ToolResult> => {
    try {
      const rawPath = (args["path"] as string) || "";
      const content = (args["content"] as string) ?? "";

      if (!rawPath.trim()) {
        return {
          isError: true,
          content: 'Lỗi: Tham số "path" không được để trống.',
        };
      }

      if (content.length > MAX_FILE_SIZE) {
        return {
          isError: true,
          content: `Lỗi: Nội dung file quá lớn (${content.length} bytes, tối đa ${MAX_FILE_SIZE} bytes).`,
        };
      }

      const fullPath = resolveSafePath(rawPath, context.workingDirectory);
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, content, "utf-8");
      const stat = await fs.stat(fullPath);

      return {
        isError: false,
        content: `Đã ghi file thành công: ${fullPath} (${stat.size} bytes)`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        isError: true,
        content: `Lỗi khi ghi file: ${message}`,
      };
    }
  },
};
