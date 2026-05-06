import { getTool, hasTool, getAllDefinitions } from './registry.js';
import type { ToolCall, ToolResult, ToolExecutionContext } from './types.js';

// Barrel export — re-export mọi thứ từ types và registry
export type {
  ToolParameter,
  ToolExecutionContext,
  ToolResult,
  ToolDefinition,
  ToolCall,
  NativeToolFormat,
} from './types.js';

export {
  registerTool,
  getTool,
  hasTool,
  getAllDefinitions,
  formatForNativeProvider,
  formatForXmlPrompt,
  buildXmlSystemInstruction,
  parseOpenAiToolCalls,
  parseAnthropicToolUses,
} from './registry.js';

export { readFileTool } from './read-file.js';

// ============================================================
// Tool Executor
// ============================================================

/**
 * Thực thi một ToolCall, trả về ToolResult.
 * Tự động kiểm tra tool có tồn tại không, parse tham số,
 * và xử lý lỗi một cách an toàn.
 *
 * @param toolCall - Lời gọi tool đã parse (từ native hoặc XML)
 * @param context - Ngữ cảnh thực thi (working directory, messages)
 * @returns Kết quả thực thi tool (content + isError flag)
 */
export async function executeToolCall(
  toolCall: ToolCall,
  context: ToolExecutionContext,
): Promise<ToolResult> {
  const { name, arguments: args } = toolCall;

  // Kiểm tra tool có tồn tại không
  if (!hasTool(name)) {
    return {
      content: `LunaCoding: Tool "${name}" không tồn tại. Các tool có sẵn: ${getAllDefinitions()
        .map((t) => t.name)
        .join(', ')}`,
      isError: true,
    };
  }

  const tool = getTool(name)!;

  // Xác thực tham số bắt buộc
  for (const param of tool.parameters) {
    if (param.required !== false && args[param.name] === undefined) {
      return {
        content: `LunaCoding: Thiếu tham số bắt buộc "${param.name}" cho tool "${name}".`,
        isError: true,
      };
    }
  }

  try {
    const result = await tool.execute(args, context);
    return result;
  } catch (error: unknown) {
    return {
      content: `LunaCoding: Lỗi khi thực thi tool "${name}": ${String(error)}`,
      isError: true,
    };
  }
}