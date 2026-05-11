import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ToolDefinition, ToolResult } from './types.js';
import { resolveSafePath } from './path-utils.js';

/** Các framework được hỗ trợ */
type TestFramework = 'jest' | 'vitest' | 'mocha' | 'pytest' | 'cargo' | 'go' | 'auto';

const TIMEOUT_MS = 300_000; // 5 phút
const MAX_OUTPUT_LENGTH = 50_000;

interface TestResult {
  framework: string;
  passed: number;
  failed: number;
  errors: number;
  skipped: number;
  duration: string;
  output: string;
}

/**
 * Tự động phát hiện test framework từ cấu trúc dự án.
 */
function detectFramework(projectPath: string): TestFramework {
  const pkgJsonPath = path.join(projectPath, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const scripts = pkg.scripts || {};

      // Vitest thường có script "test": "vitest"
      if (deps['vitest'] || (scripts.test && scripts.test.includes('vitest'))) {
        return 'vitest';
      }
      // Jest
      if (deps['jest'] || (scripts.test && scripts.test.includes('jest'))) {
        return 'jest';
      }
      // Mocha
      if (deps['mocha'] || (scripts.test && scripts.test.includes('mocha'))) {
        return 'mocha';
      }
      // Fallback: nếu có script test, dùng npm test
      if (scripts.test) {
        // Kiểm tra xem có phải jest/vitest không qua script
        if (scripts.test.includes('jest')) return 'jest';
        if (scripts.test.includes('vitest')) return 'vitest';
        if (scripts.test.includes('mocha')) return 'mocha';
      }
    } catch {
      // Không parse được package.json
    }
  }

  // Python
  if (fs.existsSync(path.join(projectPath, 'pytest.ini')) ||
      fs.existsSync(path.join(projectPath, 'pyproject.toml')) ||
      fs.existsSync(path.join(projectPath, 'setup.cfg'))) {
    return 'pytest';
  }

  // Rust
  if (fs.existsSync(path.join(projectPath, 'Cargo.toml'))) {
    return 'cargo';
  }

  // Go
  if (fs.existsSync(path.join(projectPath, 'go.mod'))) {
    return 'go';
  }

  return 'auto';
}

/**
 * Xây dựng lệnh test dựa trên framework.
 */
function buildTestCommand(
  framework: TestFramework,
  projectPath: string,
  filter?: string,
  coverage?: boolean,
): string {
  switch (framework) {
    case 'jest': {
      let cmd = `cd "${projectPath}" && npx jest --no-cache --verbose`;
      if (filter) cmd += ` --testNamePattern="${filter}"`;
      if (coverage) cmd += ' --coverage';
      return cmd;
    }
    case 'vitest': {
      let cmd = `cd "${projectPath}" && npx vitest run --reporter=verbose`;
      if (filter) cmd += ` --testNamePattern="${filter}"`;
      if (coverage) cmd += ' --coverage';
      return cmd;
    }
    case 'mocha': {
      let cmd = `cd "${projectPath}" && npx mocha --reporter=spec`;
      if (filter) cmd += ` --grep="${filter}"`;
      return cmd;
    }
    case 'pytest': {
      let cmd = `cd "${projectPath}" && python -m pytest -v`;
      if (filter) cmd += ` -k "${filter}"`;
      if (coverage) cmd += ' --cov';
      return cmd;
    }
    case 'cargo': {
      let cmd = `cd "${projectPath}" && cargo test`;
      if (filter) cmd += ` "${filter}"`;
      return cmd;
    }
    case 'go': {
      let cmd = `cd "${projectPath}" && go test -v ./...`;
      if (filter) cmd += ` -run "${filter}"`;
      if (coverage) cmd += ' -cover';
      return cmd;
    }
    default:
      return `cd "${projectPath}" && npm test`;
  }
}

/**
 * Parse kết quả test từ output.
 */
function parseTestResult(framework: string, stdout: string, stderr: string): TestResult {
  const combined = stdout + '\n' + stderr;
  let passed = 0;
  let failed = 0;
  let errors = 0;
  let skipped = 0;
  let duration = 'N/A';

  switch (framework) {
    case 'jest':
    case 'vitest': {
      // Pattern cho Jest/Vitest: "Tests: 5 passed, 2 failed, 1 skipped, 10 total"
      const testsMatch = combined.match(/Tests:\s*(.+)/);
      if (testsMatch) {
        const detail = testsMatch[1]!;
        const passedMatch = detail.match(/(\d+)\s*passed/);
        const failedMatch = detail.match(/(\d+)\s*failed/);
        const skippedMatch = detail.match(/(\d+)\s*skipped/);
        if (passedMatch) passed = parseInt(passedMatch[1]!, 10);
        if (failedMatch) failed = parseInt(failedMatch[1]!, 10);
        if (skippedMatch) skipped = parseInt(skippedMatch[1]!, 10);
      }
      // Thời gian
      const timeMatch = combined.match(/Time:\s*([\d.]+)\s*s/);
      if (timeMatch) duration = `${timeMatch[1]}s`;
      break;
    }
    case 'mocha': {
      // Mocha output: "5 passing (200ms)", "2 failing"
      const passMatch = combined.match(/(\d+)\s*passing/);
      const failMatch = combined.match(/(\d+)\s*failing/);
      if (passMatch) passed = parseInt(passMatch[1]!, 10);
      if (failMatch) failed = parseInt(failMatch[1]!, 10);
      const timeMatch = combined.match(/\((\d+)\s*ms\)/);
      if (timeMatch) duration = `${timeMatch[1]}ms`;
      break;
    }
    case 'pytest': {
      // Pytest output: "3 passed, 1 failed in 2.50s"
      const passMatch = combined.match(/(\d+)\s*passed/);
      const failMatch = combined.match(/(\d+)\s*failed/);
      const errMatch = combined.match(/(\d+)\s*errors?/);
      const skipMatch = combined.match(/(\d+)\s*skipped/);
      if (passMatch) passed = parseInt(passMatch[1]!, 10);
      if (failMatch) failed = parseInt(failMatch[1]!, 10);
      if (errMatch) errors = parseInt(errMatch[1]!, 10);
      if (skipMatch) skipped = parseInt(skipMatch[1]!, 10);
      const timeMatch = combined.match(/in\s*([\d.]+)s/);
      if (timeMatch) duration = `${timeMatch[1]}s`;
      break;
    }
    case 'cargo': {
      // Cargo test output: "test result: ok. 10 passed; 0 failed; 0 ignored"
      const resultMatch = combined.match(/test result:\s*(.+)/);
      if (resultMatch) {
        const detail = resultMatch[1]!;
        const passMatch = detail.match(/(\d+)\s*passed/);
        const failMatch = detail.match(/(\d+)\s*failed/);
        const ignoreMatch = detail.match(/(\d+)\s*ignored/);
        if (passMatch) passed = parseInt(passMatch[1]!, 10);
        if (failMatch) failed = parseInt(failMatch[1]!, 10);
        if (ignoreMatch) skipped = parseInt(ignoreMatch[1]!, 10);
      }
      break;
    }
    case 'go': {
      // Go test output: "--- PASS: TestName (0.00s)", "--- FAIL: TestName (0.00s)"
      const passMatches = combined.match(/---\s*PASS:/g);
      const failMatches = combined.match(/---\s*FAIL:/g);
      const skipMatches = combined.match(/---\s*SKIP:/g);
      if (passMatches) passed = passMatches.length;
      if (failMatches) failed = failMatches.length;
      if (skipMatches) skipped = skipMatches.length;
      break;
    }
    default:
      break;
  }

  return { framework, passed, failed, errors, skipped, duration, output: combined };
}

/**
 * Format kết quả test thành text hiển thị.
 */
function formatTestResult(result: TestResult): string {
  const lines: string[] = [];
  const total = result.passed + result.failed + result.errors + result.skipped;

  lines.push(`🧪 KẾT QUẢ TEST (${result.framework})`);
  lines.push(`⏱  Thời gian: ${result.duration}`);
  lines.push('');

  if (total === 0 && result.failed === 0 && result.errors === 0) {
    lines.push('✅ Tất cả test đã pass!');
    if (result.passed > 0) {
      lines.push(`   Passed: ${result.passed}`);
    }
  } else {
    if (result.passed > 0) lines.push(`✅ Passed:  ${result.passed}`);
    if (result.failed > 0) lines.push(`❌ Failed:  ${result.failed}`);
    if (result.errors > 0) lines.push(`⚠  Errors:  ${result.errors}`);
    if (result.skipped > 0) lines.push(`⏭  Skipped: ${result.skipped}`);
    lines.push(`📊 Tổng:    ${total}`);
  }

  lines.push('');

  // Cắt bớt output nếu quá dài
  let output = result.output;
  if (output.length > MAX_OUTPUT_LENGTH) {
    const half = Math.floor(MAX_OUTPUT_LENGTH / 2);
    output = output.slice(0, half) +
      `\n\n... [ĐÃ CẮT BỚT: ${result.output.length - MAX_OUTPUT_LENGTH} ký tự] ...\n\n` +
      output.slice(-half);
  }
  lines.push('--- OUTPUT ---');
  lines.push(output);

  return lines.join('\n');
}

export const runTestsTool: ToolDefinition = {
  name: 'run_tests',
  description:
    'Chạy test suite của dự án và trả về kết quả có cấu trúc (passed/failed/errors/skipped). ' +
    'Tự động phát hiện test framework (Jest, Vitest, Mocha, Pytest, Cargo, Go).',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'Đường dẫn thư mục dự án (mặc định: thư mục làm việc hiện tại)',
      required: false,
    },
    {
      name: 'framework',
      type: 'string',
      description: 'Test framework: "jest", "vitest", "mocha", "pytest", "cargo", "go", "auto". Mặc định: auto.',
      required: false,
      default: 'auto',
    },
    {
      name: 'filter',
      type: 'string',
      description: 'Pattern lọc test (vd: "Auth", "src/__tests__/login"). Chỉ chạy test khớp pattern.',
      required: false,
    },
    {
      name: 'coverage',
      type: 'boolean',
      description: 'Bật coverage report. Mặc định: false.',
      required: false,
      default: false,
    },
  ],
  example:
    '<run_tests>\n' +
    '  <path>.</path>\n' +
    '  <framework>auto</framework>\n' +
    '  <filter>Auth</filter>\n' +
    '  <coverage>false</coverage>\n' +
    '</run_tests>',

  async execute(args, context): Promise<ToolResult> {
    try {
      const rawPath = (args['path'] as string) || context.workingDirectory;
      const frameworkOverride = (args['framework'] as string) || 'auto';
      const filter = (args['filter'] as string) || undefined;
      const coverage = args['coverage'] === true || args['coverage'] === 'true';

      // Validate framework
      const validFrameworks: TestFramework[] = ['jest', 'vitest', 'mocha', 'pytest', 'cargo', 'go', 'auto'];
      if (!validFrameworks.includes(frameworkOverride as TestFramework)) {
        return {
          content: `Lỗi: Framework "${frameworkOverride}" không hợp lệ. Các framework hỗ trợ: ${validFrameworks.join(', ')}.`,
          isError: true,
        };
      }

      // Resolve đường dẫn
      let projectPath: string;
      try {
        projectPath = resolveSafePath(rawPath, context.workingDirectory);
      } catch (err: any) {
        return { content: `Lỗi đường dẫn: ${err.message}`, isError: true };
      }

      if (!fs.existsSync(projectPath)) {
        return { content: `Lỗi: Thư mục "${rawPath}" không tồn tại.`, isError: true };
      }

      const stat = fs.statSync(projectPath);
      if (!stat.isDirectory()) {
        return { content: `Lỗi: "${rawPath}" không phải là thư mục.`, isError: true };
      }

      // Phát hiện framework
      let framework: TestFramework;
      if (frameworkOverride !== 'auto') {
        framework = frameworkOverride as TestFramework;
      } else {
        framework = detectFramework(projectPath);
        if (framework === 'auto') {
          return {
            content: 'Lỗi: Không thể tự động phát hiện test framework. Hãy chỉ định framework cụ thể (jest, vitest, mocha, pytest, cargo, go).',
            isError: true,
          };
        }
      }

      // Xây dựng và thực thi lệnh test
      const command = buildTestCommand(framework, projectPath, filter, coverage);

      // Thực thi với spawn (không dùng exec vì output có thể lớn)
      const result = await new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
        let stdout = '';
        let stderr = '';

        const child = spawn('bash', ['-c', command], {
          cwd: projectPath,
          timeout: TIMEOUT_MS,
          env: { ...process.env, CI: 'true', FORCE_COLOR: '0' },
        });

        child.stdout?.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        child.stderr?.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        child.on('close', (code: number | null) => {
          resolve({ stdout, stderr, exitCode: code ?? 1 });
        });

        child.on('error', (err: Error) => {
          resolve({ stdout, stderr: err.message, exitCode: 1 });
        });
      });

      // Parse và format kết quả
      const testResult = parseTestResult(framework, result.stdout, result.stderr);
      const formatted = formatTestResult(testResult);

      const isError = testResult.failed > 0 || testResult.errors > 0 || result.exitCode !== 0;

      return { content: formatted, isError };
    } catch (err: any) {
      return {
        content: `Lỗi khi chạy test: ${err.message}`,
        isError: true,
      };
    }
  },
};