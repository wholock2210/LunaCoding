import { execSync, spawn } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';
import type { ToolDefinition, ToolResult } from './types.js';
import { resolveSafePath } from './path-utils.js';

type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';

interface DepResult {
  name: string;
  version: string;
  type: 'dependency' | 'devDependency';
}

export const manageDependenciesTool: ToolDefinition = {
  name: 'manage_dependencies',
  description:
    'Quản lý dependencies của dự án: cài đặt, gỡ bỏ, liệt kê, cập nhật packages. ' +
    'Hỗ trợ npm, yarn, pnpm, bun. Tự động phát hiện package manager từ lock file.',
  parameters: [
    {
      name: 'action',
      type: 'string',
      description: 'Hành động: "install", "uninstall", "list", "update", "install_all"',
      required: true,
    },
    {
      name: 'packages',
      type: 'string',
      description: 'Tên package hoặc danh sách cách nhau bởi dấu cách (cho install/uninstall/update). VD: "react lodash"',
      required: false,
    },
    {
      name: 'dev',
      type: 'boolean',
      description: 'Cài đặt/gỡ bỏ như devDependency. Mặc định: false.',
      required: false,
      default: false,
    },
    {
      name: 'path',
      type: 'string',
      description: 'Đường dẫn thư mục dự án (mặc định: thư mục làm việc hiện tại)',
      required: false,
    },
    {
      name: 'manager',
      type: 'string',
      description: 'Package manager: "npm", "yarn", "pnpm", "bun". Mặc định: tự động phát hiện.',
      required: false,
    },
  ],
  example:
    '<manage_dependencies>\n' +
    '  <action>install</action>\n' +
    '  <packages>react</packages>\n' +
    '  <dev>false</dev>\n' +
    '  <manager>npm</manager>\n' +
    '</manage_dependencies>',

  async execute(args, context): Promise<ToolResult> {
    try {
      const action = (args['action'] as string) || '';
      const packagesStr = (args['packages'] as string) || '';
      const dev = args['dev'] === true || args['dev'] === 'true';
      const rawPath = (args['path'] as string) || context.workingDirectory;
      const managerOverride = (args['manager'] as string) || null;

      const validActions = ['install', 'uninstall', 'list', 'update', 'install_all'];
      if (!validActions.includes(action)) {
        return {
          content: `Lỗi: Hành động "${action}" không hợp lệ. Các hành động hợp lệ: ${validActions.join(', ')}.`,
          isError: true,
        };
      }

      // Resolve đường dẫn an toàn
      let projectPath: string;
      try {
        projectPath = resolveSafePath(rawPath, context.workingDirectory);
      } catch (err: any) {
        return { content: `Lỗi đường dẫn: ${err.message}`, isError: true };
      }

      // Kiểm tra thư mục tồn tại
      if (!fs.existsSync(projectPath)) {
        return { content: `Lỗi: Thư mục "${rawPath}" không tồn tại.`, isError: true };
      }

      const stat = fs.statSync(projectPath);
      if (!stat.isDirectory()) {
        return { content: `Lỗi: "${rawPath}" không phải là thư mục.`, isError: true };
      }

      // Kiểm tra package.json
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return { content: 'Lỗi: Không tìm thấy package.json trong thư mục dự án.', isError: true };
      }

      // Xác định package manager
      let pkgManager: PackageManager;
      if (managerOverride && ['npm', 'yarn', 'pnpm', 'bun'].includes(managerOverride)) {
        pkgManager = managerOverride as PackageManager;
      } else {
        pkgManager = detectPackageManager(projectPath);
      }

      // Kiểm tra binary của package manager
      const pmPath = findPackageManagerBinary(pkgManager);
      if (!pmPath) {
        return {
          content: `Lỗi: Không tìm thấy ${pkgManager}. Hãy đảm bảo ${pkgManager} đã được cài đặt.`,
          isError: true,
        };
      }

      // Thực thi hành động
      switch (action) {
        case 'install':
          return await installPackages(pmPath, pkgManager, projectPath, packagesStr, dev);
        case 'uninstall':
          return await uninstallPackages(pmPath, pkgManager, projectPath, packagesStr, dev);
        case 'list':
          return await listPackages(projectPath);
        case 'update':
          return await updatePackages(pmPath, pkgManager, projectPath, packagesStr);
        case 'install_all':
          return await installAll(pmPath, pkgManager, projectPath);
        default:
          return { content: `Lỗi: Hành động "${action}" không được hỗ trợ.`, isError: true };
      }
    } catch (err: any) {
      return { content: `Lỗi không xác định: ${err.message}`, isError: true };
    }
  },
};

/** Phát hiện package manager từ lock file trong thư mục dự án */
function detectPackageManager(projectPath: string): PackageManager {
  if (fs.existsSync(path.join(projectPath, 'bun.lockb')) || fs.existsSync(path.join(projectPath, 'bun.lock'))) {
    return 'bun';
  }
  if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) {
    return 'yarn';
  }
  // Mặc định npm
  return 'npm';
}

/** Tìm binary của package manager */
function findPackageManagerBinary(name: string): string | null {
  try {
    const result = execSync(`which "${name}" 2>/dev/null || command -v "${name}" 2>/dev/null`, {
      encoding: 'utf-8',
      timeout: 5000,
    });
    const pmPath = result.trim();
    if (pmPath && fs.existsSync(pmPath)) {
      return pmPath;
    }
  } catch {
    // Không tìm thấy
  }
  return null;
}

/** Cài đặt packages */
async function installPackages(
  pmPath: string,
  pkgManager: PackageManager,
  projectPath: string,
  packagesStr: string,
  dev: boolean,
): Promise<ToolResult> {
  const packages = packagesStr.split(/\s+/).filter(Boolean);
  if (packages.length === 0) {
    return { content: 'Lỗi: Cần chỉ định ít nhất một package để cài đặt.', isError: true };
  }

  const args = buildInstallArgs(pkgManager, packages, dev);
  const cmd = buildCommand(pkgManager, 'install', args);

  return await runCommand(pmPath, cmd, projectPath, `Cài đặt ${packages.join(', ')}`);
}

/** Gỡ bỏ packages */
async function uninstallPackages(
  pmPath: string,
  pkgManager: PackageManager,
  projectPath: string,
  packagesStr: string,
  dev: boolean,
): Promise<ToolResult> {
  const packages = packagesStr.split(/\s+/).filter(Boolean);
  if (packages.length === 0) {
    return { content: 'Lỗi: Cần chỉ định ít nhất một package để gỡ bỏ.', isError: true };
  }

  const args = buildUninstallArgs(pkgManager, packages, dev);
  const cmd = buildCommand(pkgManager, 'uninstall', args);

  return await runCommand(pmPath, cmd, projectPath, `Gỡ bỏ ${packages.join(', ')}`);
}

/** Liệt kê dependencies */
async function listPackages(projectPath: string): Promise<ToolResult> {
  try {
    const packageJsonContent = fs.readFileSync(
      path.join(projectPath, 'package.json'),
      'utf-8',
    );
    const packageJson = JSON.parse(packageJsonContent);

    const deps: DepResult[] = [];
    const devDeps: DepResult[] = [];

    if (packageJson.dependencies) {
      for (const [name, version] of Object.entries(packageJson.dependencies)) {
        deps.push({ name, version: version as string, type: 'dependency' });
      }
    }

    if (packageJson.devDependencies) {
      for (const [name, version] of Object.entries(packageJson.devDependencies)) {
        devDeps.push({ name, version: version as string, type: 'devDependency' });
      }
    }

    if (deps.length === 0 && devDeps.length === 0) {
      return { content: '📦 Không có dependencies nào được cài đặt.' };
    }

    const output: string[] = [];
    output.push(`📦 Dependencies của dự án:\n`);

    if (deps.length > 0) {
      output.push(`📌 Dependencies (${deps.length}):`);
      for (const d of deps.sort((a, b) => a.name.localeCompare(b.name))) {
        output.push(`  - ${d.name}@${d.version}`);
      }
      output.push('');
    }

    if (devDeps.length > 0) {
      output.push(`🔧 Dev Dependencies (${devDeps.length}):`);
      for (const d of devDeps.sort((a, b) => a.name.localeCompare(b.name))) {
        output.push(`  - ${d.name}@${d.version}`);
      }
    }

    return { content: output.join('\n') };
  } catch (err: any) {
    return { content: `Lỗi khi đọc package.json: ${err.message}`, isError: true };
  }
}

/** Cập nhật packages */
async function updatePackages(
  pmPath: string,
  pkgManager: PackageManager,
  projectPath: string,
  packagesStr: string,
): Promise<ToolResult> {
  const packages = packagesStr.split(/\s+/).filter(Boolean);

  let args: string[];
  let description: string;

  if (packages.length > 0) {
    args = buildUpdateArgs(pkgManager, packages);
    description = `Cập nhật ${packages.join(', ')}`;
  } else {
    args = buildUpdateAllArgs(pkgManager);
    description = 'Cập nhật tất cả packages';
  }

  const cmd = buildCommand(pkgManager, 'update', args);
  return await runCommand(pmPath, cmd, projectPath, description);
}

/** Cài đặt tất cả dependencies từ package.json */
async function installAll(
  pmPath: string,
  pkgManager: PackageManager,
  projectPath: string,
): Promise<ToolResult> {
  const cmd = buildInstallAllCommand(pkgManager);
  return await runCommand(pmPath, cmd, projectPath, 'Cài đặt tất cả dependencies');
}

/** Chạy command và trả về kết quả */
async function runCommand(
  pmPath: string,
  cmd: string,
  cwd: string,
  description: string,
): Promise<ToolResult> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';

    const child = spawn(pmPath, cmd.split(' ').slice(1), {
      cwd,
      shell: false,
      timeout: 120_000, // 2 phút timeout
    });

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('close', (code: number | null) => {
      if (code === 0) {
        const trimmed = stdout.trim();
        resolve({
          content: `✅ ${description} thành công.${trimmed ? `\n\nOutput:\n${trimmed.slice(0, 2000)}` : ''}`,
        });
      } else {
        const errorOutput = (stderr + stdout).slice(0, 2000);
        resolve({
          content: `❌ ${description} thất bại (exit code: ${code}).\n\n${errorOutput || 'Không có output lỗi.'}`,
          isError: true,
        });
      }
    });

    child.on('error', (err: Error) => {
      resolve({
        content: `❌ Lỗi khi chạy ${description}: ${err.message}`,
        isError: true,
      });
    });
  });
}

// ============================================================
// Command builders cho từng package manager
// ============================================================

function buildCommand(pm: PackageManager, action: string, args: string[]): string {
  switch (pm) {
    case 'npm':
      return `npm ${action} ${args.join(' ')}`;
    case 'yarn':
      if (action === 'uninstall') return `yarn remove ${args.join(' ')}`;
      return `yarn ${action} ${args.join(' ')}`;
    case 'pnpm':
      return `pnpm ${action} ${args.join(' ')}`;
    case 'bun':
      if (action === 'uninstall') return `bun remove ${args.join(' ')}`;
      return `bun ${action} ${args.join(' ')}`;
    default:
      return `npm ${action} ${args.join(' ')}`;
  }
}

function buildInstallArgs(pm: PackageManager, packages: string[], dev: boolean): string[] {
  const args: string[] = [];
  if (dev) {
    switch (pm) {
      case 'npm':
        args.push('--save-dev');
        break;
      case 'yarn':
        args.push('--dev');
        break;
      case 'pnpm':
        args.push('--save-dev');
        break;
      case 'bun':
        args.push('--dev');
        break;
    }
  }
  args.push(...packages);
  // Thêm --no-save flag để tránh hỏi xác nhận
  if (pm === 'npm') {
    args.push('--no-audit', '--no-fund');
  }
  return args;
}

function buildUninstallArgs(_pm: PackageManager, packages: string[], _dev: boolean): string[] {
  const args: string[] = [...packages];
  // Một số PM không có flag --dev cho uninstall
  return args;
}

function buildUpdateArgs(pm: PackageManager, packages: string[]): string[] {
  switch (pm) {
    case 'npm':
      return ['update', ...packages];
    case 'yarn':
      return ['upgrade', ...packages];
    case 'pnpm':
      return ['update', ...packages];
    case 'bun':
      return ['update', ...packages];
    default:
      return ['update', ...packages];
  }
}

function buildUpdateAllArgs(pm: PackageManager): string[] {
  switch (pm) {
    case 'npm':
      return ['update'];
    case 'yarn':
      return ['upgrade'];
    case 'pnpm':
      return ['update'];
    case 'bun':
      return ['update'];
    default:
      return ['update'];
  }
}

function buildInstallAllCommand(pm: PackageManager): string {
  switch (pm) {
    case 'npm':
      return 'npm install --no-audit --no-fund';
    case 'yarn':
      return 'yarn install';
    case 'pnpm':
      return 'pnpm install';
    case 'bun':
      return 'bun install';
    default:
      return 'npm install --no-audit --no-fund';
  }
}