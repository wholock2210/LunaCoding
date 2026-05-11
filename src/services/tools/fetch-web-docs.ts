import type { ToolDefinition, ToolResult } from './types.js';

/**
 * Tìm kiếm tài liệu lập trình từ MDN Web Docs hoặc DevDocs.io.
 *
 * Hỗ trợ:
 * - MDN: Tìm kiếm qua API developer.mozilla.org
 * - DevDocs: Tìm kiếm qua index.json của DevDocs
 */

const TIMEOUT_MS = 10_000; // 10 giây timeout cho HTTP request

/** Slug mapping cho DevDocs — ánh xạ language → devdocs slug */
const DEVDOCS_SLUG_MAP: Record<string, string> = {
  javascript: 'javascript',
  js: 'javascript',
  python: 'python~3.12',
  css: 'css',
  html: 'html',
  react: 'react',
  vue: 'vue~3',
  angular: 'angular',
  node: 'node',
  typescript: 'typescript',
  ts: 'typescript',
  rust: 'rust',
  go: 'go',
  ruby: 'ruby~3.3',
  php: 'php',
  bash: 'bash',
  sql: 'sqlite',
};

/**
 * Kết quả tìm kiếm tài liệu.
 */
interface DocResult {
  title: string;
  url: string;
  excerpt: string;
  source: string;
}

/**
 * Fetch với timeout.
 */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'LunaCoding/1.0 (Documentation Fetcher)',
        'Accept': 'application/json',
      },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Tìm kiếm trên MDN Web Docs.
 */
async function searchMDN(query: string, _language: string): Promise<DocResult[]> {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://developer.mozilla.org/api/v1/search?q=${encodedQuery}&locale=vi&size=5`;

  try {
    const response = await fetchWithTimeout(url, TIMEOUT_MS);
    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as {
      documents?: Array<{
        title: string;
        mdn_url: string;
        excerpt: string;
        summary?: string;
      }>;
    };

    if (!data.documents || data.documents.length === 0) {
      return [];
    }

    return data.documents.slice(0, 5).map((doc) => ({
      title: doc.title,
      url: doc.mdn_url,
      excerpt: doc.excerpt || doc.summary || 'Không có mô tả.',
      source: 'MDN',
    }));
  } catch {
    return [];
  }
}

/**
 * Tìm kiếm trên DevDocs.io.
 */
async function searchDevDocs(query: string, language: string): Promise<DocResult[]> {
  const slug = DEVDOCS_SLUG_MAP[language.toLowerCase()] || 'javascript';
  const url = `https://documents.devdocs.io/${slug}/index.json`;

  try {
    const response = await fetchWithTimeout(url, TIMEOUT_MS);
    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as {
      entries?: Array<{
        name: string;
        path: string;
        type: string;
      }>;
    };

    if (!data.entries || data.entries.length === 0) {
      return [];
    }

    // Tìm kiếm fuzzy — lọc entries khớp với query
    const lowerQuery = query.toLowerCase();
    const matched = data.entries
      .filter((entry) => entry.name.toLowerCase().includes(lowerQuery))
      .slice(0, 5);

    if (matched.length === 0) {
      return [];
    }

    return matched.map((entry) => ({
      title: entry.name,
      url: `https://devdocs.io/${slug}/${entry.path}`,
      excerpt: `Loại: ${entry.type}. Xem tài liệu đầy đủ trên DevDocs.`,
      source: 'DevDocs',
    }));
  } catch {
    return [];
  }
}

/**
 * Format kết quả tìm kiếm thành text hiển thị.
 */
function formatResults(results: DocResult[], query: string, source: string): string {
  if (results.length === 0) {
    return `📚 Không tìm thấy kết quả cho "${query}" trên ${source}.`;
  }

  const lines: string[] = [];
  lines.push(`📚 KẾT QUẢ TÌM KIẾM: "${query}" (${source})`);
  lines.push('');

  results.forEach((result, index) => {
    lines.push(`${index + 1}. ${result.title}`);
    lines.push(`   🔗 ${result.url}`);
    lines.push(`   📝 ${result.excerpt}`);
    lines.push('');
  });

  lines.push(`📊 Tìm thấy ${results.length} kết quả trên ${source}.`);

  return lines.join('\n');
}

export const fetchWebDocsTool: ToolDefinition = {
  name: 'fetch_web_docs',
  description:
    'Tìm kiếm tài liệu lập trình từ MDN Web Docs hoặc DevDocs.io. ' +
    'Hỗ trợ nhiều ngôn ngữ: JavaScript, Python, CSS, HTML, React, TypeScript, Rust, Go, v.v.',
  parameters: [
    {
      name: 'query',
      type: 'string',
      description: 'Từ khóa tìm kiếm (vd: "Array.map", "useState", "flexbox")',
      required: true,
    },
    {
      name: 'source',
      type: 'string',
      description: 'Nguồn tài liệu: "mdn", "devdocs". Mặc định: mdn.',
      required: false,
      default: 'mdn',
    },
    {
      name: 'language',
      type: 'string',
      description: 'Ngôn ngữ/framework: "javascript", "python", "css", "html", "react", "typescript", "rust", "go", v.v. Mặc định: javascript.',
      required: false,
      default: 'javascript',
    },
  ],
  example:
    '<fetch_web_docs>\n' +
    '  <query>Array.prototype.map</query>\n' +
    '  <source>mdn</source>\n' +
    '  <language>javascript</language>\n' +
    '</fetch_web_docs>',

  async execute(args, _context): Promise<ToolResult> {
    try {
      const query = (args['query'] as string) || '';
      const source = (args['source'] as string) || 'mdn';
      const language = (args['language'] as string) || 'javascript';

      // Validate tham số
      if (!query.trim()) {
        return { content: 'Lỗi: Tham số "query" là bắt buộc và không được rỗng.', isError: true };
      }

      if (query.length > 500) {
        return { content: 'Lỗi: Từ khóa tìm kiếm quá dài (tối đa 500 ký tự).', isError: true };
      }

      const validSources = ['mdn', 'devdocs'];
      if (!validSources.includes(source.toLowerCase())) {
        return {
          content: `Lỗi: Nguồn "${source}" không hợp lệ. Các nguồn hỗ trợ: mdn, devdocs.`,
          isError: true,
        };
      }

      // Thực hiện tìm kiếm
      let results: DocResult[];

      if (source === 'mdn') {
        results = await searchMDN(query, language);
      } else {
        results = await searchDevDocs(query, language);
      }

      // Format và trả về kết quả
      const formatted = formatResults(results, query, source.toUpperCase());

      return { content: formatted };
    } catch (err: any) {
      return {
        content: `Lỗi khi tìm kiếm tài liệu: ${err.message || 'Lỗi không xác định'}`,
        isError: true,
      };
    }
  },
};