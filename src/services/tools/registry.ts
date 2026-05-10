import type { ToolDefinition, ToolParameter, NativeToolFormat } from './types.js';
import { readFileTool } from './read-file.js';
import { listFilesTool } from './list-files.js';
import { writeToFileTool } from './write-to-file.js';
import { searchFilesTool } from './search-files.js';
import { replaceInFileTool } from './replace-in-file.js';
import { executeCommandTool } from './execute-command.js';
import { readLintsTool } from './read-lints.js';
import { listCodeDefinitionsTool } from './list-code-definitions.js';
import { searchCodeSemanticTool } from './search-code-semantic.js';
import { manageDependenciesTool } from './manage-dependencies.js';

/**
 * Registry tập trung của tất cả các tool.
 * Khi thêm tool mới, chỉ cần import và thêm vào mảng này.
 */
export const allTools: ToolDefinition[] = [
  readFileTool,
  listFilesTool,
  writeToFileTool,
  searchFilesTool,
  replaceInFileTool,
  executeCommandTool,
  readLintsTool,
  listCodeDefinitionsTool,
  searchCodeSemanticTool,
  manageDependenciesTool,
];

// ============================================================
// Lookup Functions
// ============================================================

/** Lấy định nghĩa tool theo tên */
export function getTool(name: string): ToolDefinition | undefined {
  return allTools.find((t) => t.name === name);
}

/** Kiểm tra tool có tồn tại không */
export function hasTool(name: string): boolean {
  return allTools.some((t) => t.name === name);
}

/** Lấy tất cả định nghĩa tool */
export function getAllDefinitions(): ToolDefinition[] {
  return [...allTools];
}

/** Đăng ký thêm một tool mới vào runtime */
export function registerTool(tool: ToolDefinition): void {
  // Tránh trùng lặp
  const idx = allTools.findIndex((t) => t.name === tool.name);
  if (idx >= 0) {
    allTools[idx] = tool;
  } else {
    allTools.push(tool);
  }
}

// ============================================================
// Native Tool Formatting
// ============================================================

/**
 * Chuyển đổi ToolDefinition sang định dạng native tool của từng provider.
 * @param format - Định dạng đích (openai, anthropic, google-gemini, cohere)
 * @returns Mảng tool definitions ở định dạng của provider
 */
export function formatForNativeProvider(format: NativeToolFormat): Record<string, unknown>[] {
  return allTools.map((tool) => formatToolDefinition(tool, format));
}

function formatToolDefinition(tool: ToolDefinition, format: NativeToolFormat): Record<string, unknown> {
  switch (format) {
    case 'openai':
      return toOpenAiTool(tool);
    case 'anthropic':
      return toAnthropicTool(tool);
    case 'google-gemini':
      return toGeminiTool(tool);
    case 'cohere':
      return toCohereTool(tool);
    default:
      return toOpenAiTool(tool);
  }
}

function toOpenAiTool(tool: ToolDefinition): Record<string, unknown> {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: buildJsonSchema(tool.parameters),
    },
  };
}

function toAnthropicTool(tool: ToolDefinition): Record<string, unknown> {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: buildJsonSchema(tool.parameters),
  };
}

function toGeminiTool(tool: ToolDefinition): Record<string, unknown> {
  const required = tool.parameters
    .filter((p) => p.required !== false)
    .map((p) => p.name);

  const properties: Record<string, unknown> = {};
  for (const p of tool.parameters) {
    properties[p.name] = mapTypeToSchema(p);
  }

  return {
    functionDeclarations: [
      {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties,
          ...(required.length > 0 ? { required } : {}),
        },
      },
    ],
  };
}

function toCohereTool(tool: ToolDefinition): Record<string, unknown> {
  const required = tool.parameters
    .filter((p) => p.required !== false)
    .map((p) => p.name);

  const properties: Record<string, unknown> = {};
  for (const p of tool.parameters) {
    properties[p.name] = mapTypeToCohereSchema(p);
  }

  return {
    name: tool.name,
    description: tool.description,
    parameter_definitions: properties,
    ...(required.length > 0 ? { required_parameters: required } : {}),
  };
}

function buildJsonSchema(params: ToolParameter[]): Record<string, unknown> {
  const required = params
    .filter((p) => p.required !== false)
    .map((p) => p.name);

  const properties: Record<string, unknown> = {};
  for (const p of params) {
    properties[p.name] = mapTypeToSchema(p);
  }

  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

function mapTypeToSchema(param: ToolParameter): Record<string, unknown> {
  const desc = param.default !== undefined
    ? `${param.description} (Mặc định: ${param.default})`
    : param.description;

  switch (param.type) {
    case 'string':
      return { type: 'string', description: desc };
    case 'number':
      return { type: 'number', description: desc };
    case 'boolean':
      return { type: 'boolean', description: desc };
    case 'array':
      return { type: 'array', items: { type: 'string' }, description: desc };
    default:
      return { type: 'string', description: desc };
  }
}

function mapTypeToCohereSchema(param: ToolParameter): Record<string, unknown> {
  const desc = param.default !== undefined
    ? `${param.description} (Mặc định: ${param.default})`
    : param.description;

  switch (param.type) {
    case 'string':
      return { type: 'str', description: desc };
    case 'number':
      return { type: 'float', description: desc };
    case 'boolean':
      return { type: 'bool', description: desc };
    case 'array':
      return { type: 'list', description: desc };
    default:
      return { type: 'str', description: desc };
  }
}

// ============================================================
// XML Prompt Formatting (dùng khi toolParseMode = 'xml')
// ============================================================

/**
 * Tạo prompt XML instruct cho AI về cách sử dụng tool.
 * Chèn vào system message khi toolParseMode = 'xml'.
 */
export function formatForXmlPrompt(): string {
  if (allTools.length === 0) return '';

  const toolDescriptions = allTools.map((tool) => {
    const params = tool.parameters
      .map((p) => {
        const req = p.required !== false ? ' (bắt buộc)' : '';
        const def = p.default !== undefined ? ` Mặc định: ${p.default}.` : '';
        return `  - <${p.name}>${p.type}${req}${def} ${p.description}`;
      })
      .join('\n');

    return `### ${tool.name}\n${tool.description}\n\nCú pháp XML:\n${tool.example}\n\nTham số:\n${params}`;
  }).join('\n\n');

  return toolDescriptions;
}

/**
 * Tạo system instruction hoàn chỉnh cho XML mode.
 */
export function buildXmlSystemInstruction(): string {
  const toolList = allTools.map((t) => t.name).join(', ');
  const toolDetails = formatForXmlPrompt();

  return `Bạn có thể sử dụng các công cụ (tools) sau để hỗ trợ trả lời:

${toolDetails}

QUY TẮC SỬ DỤNG TOOL:
1. Khi cần gọi tool, hãy xuất XML block TRONG CÙNG MỘT message với nội dung text (nếu có).
2. Không được dùng XML trong Markdown code block (\`\`\`xml ... \`\`\`), phải viết trực tiếp XML thô.
3. Có thể gọi nhiều tool trong cùng 1 message.
4. Sau khi nhận kết quả tool, phản hồi bằng tiếng Việt tự nhiên, không xuất thêm XML trừ khi cần gọi tool tiếp.
5. Đọc kết quả tool cẩn thận và chỉ trả lời dựa trên thông tin thực tế từ tool.

Các tool có sẵn: ${toolList}`;
}

// ============================================================
// Parse Native Tool Call Responses
// ============================================================

/**
 * Parse OpenAI-style tool_calls từ response thành dạng chung.
 */
export function parseOpenAiToolCalls(
  toolCalls: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>,
): Array<{ id: string; name: string; arguments: Record<string, unknown> }> {
  return toolCalls.map((tc) => ({
    id: tc.id,
    name: tc.function.name,
    arguments: safeParseJson(tc.function.arguments),
  }));
}

/**
 * Parse Anthropic-style tool_use blocks từ response thành dạng chung.
 */
export function parseAnthropicToolUses(
  toolUses: Array<{
    id: string;
    name: string;
    input: Record<string, unknown>;
  }>,
): Array<{ id: string; name: string; arguments: Record<string, unknown> }> {
  return toolUses.map((tu) => ({
    id: tu.id,
    name: tu.name,
    arguments: tu.input,
  }));
}

function safeParseJson(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}