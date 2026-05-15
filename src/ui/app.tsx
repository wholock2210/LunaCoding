import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, useInput } from 'ink';
import TerminalTop from './components/TerminalTop.js';
import TerminalMid from './components/TerminalMid.js';
import TerminalBottom from './components/TerminalBottom.js';
import { sendChatMessageStream } from '../services/chat.js';
import {
  loadConfig,
  saveConfig,
  setCurrentProvider,
  addProvider,
  updateProviderModels,
  setDefaultModel,
  getCurrentProvider,
  getToolParseMode,
  setToolParseMode,
} from '../services/config.js';
import { createProvider } from '../services/providers/registry.js';
import { getLogs, clearLogs } from '../services/logger.js';
import { randomUUID } from 'node:crypto';
import type {
  Message,
  UiMode,
  ProviderConfig,
  ProviderType,
  ChatStreamChunk,
  ToolParseMode,
  ToolCallRecord,
  AgentMode,
} from '../services/types.js';
import { MODE_LABELS } from './components/AgentModeBar.js';
import { initLanguage, setLanguage, t } from '../services/language.js';

const App = () => {
  // ============================================================
  // Chat state
  // ============================================================
  const [messages, setMessages] = useState<Message[]>([]);
  // Ref giữ giá trị messages mới nhất, tránh re-render TerminalBottom khi streaming
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const [isLoading, setIsLoading] = useState(false);
  // detailMode: false = Tóm tắt (ẩn thinking/tool), true = Chi tiết (hiển thị đầy đủ)
  const [detailMode, setDetailMode] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingPhase, setStreamingPhase] = useState<'thinking' | 'responding' | null>(null);

  // ============================================================
  // UI Mode & Provider state
  // ============================================================
  const [uiMode, setUiMode] = useState<UiMode>('chat');
  const [agentMode, setAgentMode] = useState<AgentMode>('normal');
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [selectedProviderType, setSelectedProviderType] =
    useState<ProviderType | null>(null);
  const [selectedProvider, setSelectedProvider] =
    useState<ProviderConfig | null>(null);
  const [modelFetching, setModelFetching] = useState(false);
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);
  const [showModelAddInput, setShowModelAddInput] = useState(false);

  // ============================================================
  // Stable input mode – hỗ trợ IME tiếng Việt (fcitx-bamboo)
  // Khi bật, giao diện chat sẽ không re-render trong lúc stream,
  // giúp con trỏ IME không bị nhảy.
  // ============================================================
  const [stableMode, setStableMode] = useState(false);
  // Ref cho stableMode và streamingPhase để đọc giá trị mới nhất
  // bên trong useCallback dependency [] (tránh stale closure)
  const stableModeRef = useRef(stableMode);
  stableModeRef.current = stableMode;
  const streamingPhaseRef = useRef(streamingPhase);
  streamingPhaseRef.current = streamingPhase;
  const isStreamingRef = useRef(isStreaming);
  isStreamingRef.current = isStreaming;

  // Buffer tích luỹ stream chunk khi stable mode đang bật.
  // Khi tắt stable mode, flush buffer này vào state để UI cập nhật.
  const streamBufferRef = useRef<{
    messages: Message[];
    placeholderIdx: number;
    thinkingText: string;
    responseText: string;
    finalUsage: ChatStreamChunk['usage'] | undefined;
    finished: boolean;
  } | null>(null);

  // Khi stableMode chuyển từ true → false, flush buffer ra UI
  useEffect(() => {
    if (!stableMode && streamBufferRef.current) {
      const buf = streamBufferRef.current;
      // Cập nhật phase
      if (buf.finished) {
        setStreamingPhase(null);
        setIsStreaming(false);
        setIsLoading(false);
      } else if (buf.responseText.length > 0) {
        setStreamingPhase('responding');
      } else if (buf.thinkingText.length > 0) {
        setStreamingPhase('thinking');
      }
      // Cập nhật messages
      setMessages([...buf.messages]);
      streamBufferRef.current = null;
    }
  }, [stableMode]);

  // ============================================================
  // Load providers từ config khi mount
  // ============================================================
  const refreshProviders = useCallback(() => {
    const config = loadConfig();
    setProviders(config.providers);
  }, []);

  useEffect(() => {
    const config = loadConfig();
    initLanguage(config.language);
    refreshProviders();
  }, []);

  // ============================================================
  // Keyboard shortcut: Ctrl+I to toggle stable mode
  // Ctrl+O: toggle chế độ Tóm tắt / Chi tiết
  // ============================================================
  useInput((input, key) => {
    if (key.ctrl && input === 'i') {
      setStableMode((prev) => !prev);
      return;
    }

    // Ctrl+O được xử lý bởi useEffect intercept 'keypress' bên dưới.
    // Giữ lại đây làm fallback trong trường hợp intercept không hoạt động.
    if (key.ctrl && input === 'o') {
      setDetailMode(prev => !prev);
      return;
    }
  });

  // ============================================================
  // Intercept 'keypress' event để bắt Ctrl+O
  // (Phương án #3 — FIX.md)
  // Ink TextInput độc chiếm sự kiện bàn phím khi focus,
  // useInput ở cấp App không nhận được Ctrl+O.
  // Giải pháp: gỡ listener 'keypress' của Ink, thay bằng listener
  // của ta để lọc Ctrl+O trước, forward các phím khác cho Ink.
  // ============================================================
  const handleCtrlORef = useRef(() => {
    setDetailMode(prev => !prev);
  });
  // Cập nhật ref mỗi render để tránh stale closure
  handleCtrlORef.current = () => {
    setDetailMode(prev => !prev);
  };

  useEffect(() => {
    const stdin = process.stdin;
    if (!stdin.isTTY) return;

    // Lưu lại tất cả listener 'keypress' gốc của Ink
    const originalListeners = stdin.listeners('keypress');

    // Gỡ toàn bộ listener gốc khỏi stdin
    stdin.removeAllListeners('keypress');

    // Đăng ký listener của ta – lọc Ctrl+O, forward phần còn lại
    const onKeypress = (chunk: any, key: any) => {
      // Kiểm tra Ctrl+O (ctrl + o)
      if (key?.ctrl && key?.name === 'o') {
        console.log('[Ctrl+O] handleCtrlO called');
        handleCtrlORef.current();
        return; // Nuốt phím Ctrl+O, không forward cho Ink
      }
      // Forward toàn bộ phím khác cho listener gốc của Ink
      for (const listener of originalListeners) {
        try {
          (listener as Function)(chunk, key);
        } catch {
          // Bỏ qua lỗi từ listener gốc
        }
      }
    };

    stdin.on('keypress', onKeypress);

    return () => {
      // Cleanup: gỡ listener của ta, khôi phục listener gốc của Ink
      stdin.off('keypress', onKeypress);
      for (const listener of originalListeners) {
        stdin.on('keypress', listener as (...args: any[]) => void);
      }
    };
  }, []);

  // ============================================================
  // Command handler — parse các lệnh /
  // ============================================================
  const handleCommand = useCallback((command: string) => {
    const normalized = command.trim().toLowerCase();

    if (normalized === '/provider' || normalized === '/providers') {
      refreshProviders();
      setUiMode('provider-list');
      return;
    }

    if (normalized === '/model' || normalized === '/models') {
      const current = getCurrentProvider();
      if (!current) {
        const helpMsg: Message = {
          role: 'assistant',
          content:
            'LunaCoding: Bạn chưa có provider nào được chọn. Dùng lệnh /provider để thêm hoặc chọn provider trước.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, helpMsg]);
        return;
      }
      // Refresh provider data từ config
      const cfg = loadConfig();
      const fresh = cfg.providers.find((p) => p.id === current.id) ?? current;
      setSelectedProvider(fresh);
      setShowModelAddInput(false);
      setModelFetchError(null);
      setUiMode('model-list');
      return;
    }

    // ── /logs ─────────────────────────────────────────────────
    if (normalized === '/logs') {
      const logContent = getLogs(50);
      const logMsg: Message = {
        role: 'assistant',
        content: `📋 **Log hệ thống (50 dòng cuối):**\n\`\`\`\n${logContent}\n\`\`\`\n\nDùng \`/logs all\` để xem toàn bộ, \`/logs clear\` để xóa.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, logMsg]);
      return;
    }

    if (normalized === '/logs all') {
      const logContent = getLogs(9999);
      const logMsg: Message = {
        role: 'assistant',
        content: `📋 **Toàn bộ log hệ thống:**\n\`\`\`\n${logContent}\n\`\`\``,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, logMsg]);
      return;
    }

    if (normalized === '/logs clear') {
      clearLogs();
      const confirmMsg: Message = {
        role: 'assistant',
        content: '🧹 Đã xóa toàn bộ log hệ thống.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, confirmMsg]);
      return;
    }

    // ── /tool-mode ──────────────────────────────────────────
    if (normalized === '/tool-mode' || normalized === '/tm') {
      const currentMode = getToolParseMode();
      const modeHelp: Message = {
        role: 'assistant',
        content:
          `🔧 **Chế độ gọi tool hiện tại: \`${currentMode}\`**\n\n` +
          `Các chế độ:\n` +
          `  • \`auto\`   — Tự động dùng native tool calling nếu provider hỗ trợ, nếu không thì parse XML\n` +
          `  • \`native\` — Luôn dùng native tool calling của provider (OpenAI, Anthropic, Gemini, Cohere)\n` +
          `  • \`xml\`    — Luôn parse XML tool call từ text response (dùng cho provider không hỗ trợ native)\n\n` +
          `Cách đổi chế độ:\n` +
          `  /tool-mode auto\n` +
          `  /tool-mode native\n` +
          `  /tool-mode xml\n` +
          `  /tm auto    (alias ngắn gọn)`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, modeHelp]);
      return;
    }

    // /tool-mode <mode> hoặc /tm <mode>
    const toolModeMatch = normalized.match(/^\/(?:tool-mode|tm)\s+(auto|native|xml)$/);
    if (toolModeMatch) {
      const newMode = toolModeMatch[1] as ToolParseMode;
      setToolParseMode(newMode);
      const confirmMsg: Message = {
        role: 'assistant',
        content: `🔧 Đã chuyển chế độ gọi tool sang **\`${newMode}\`**.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, confirmMsg]);
      return;
    }

    // ── /expand — toggle chế độ Tóm tắt / Chi tiết ────────────
    if (normalized === '/expand' || normalized === '/e') {
      setDetailMode(prev => !prev);
      const msg: Message = {
        role: 'assistant',
        content: detailMode ? '📁 Đã chuyển sang chế độ Tóm tắt.' : '📂 Đã chuyển sang chế độ Chi tiết.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, msg]);
      return;
    }

    // ── /mode — hiển thị hoặc chuyển AgentMode ─────────────────
    if (normalized === '/mode') {
      const modeList = MODE_LABELS.map(({ mode, label, desc }) =>
        `${agentMode === mode ? '◉' : '○'} **${mode}** — ${label}: ${desc}`
      ).join('\n');
      const modeMsg: Message = {
        role: 'assistant',
        content: `⚙️ **Chế độ agent hiện tại: \`${agentMode}\`**\n\n${modeList}\n\nDùng \`/mode <tên-mode>\` để chuyển. Hoặc nhấn **Tab** để xoay vòng mode.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, modeMsg]);
      return;
    }

    // /mode <tên-mode>
    const modeMatch = normalized.match(/^\/mode\s+(normal|plan|accept-edit|bypass|fix|god-mode)$/);
    if (modeMatch) {
      const newMode = modeMatch[1] as AgentMode;
      setAgentMode(newMode);
      const confirmMsg: Message = {
        role: 'assistant',
        content: `⚙️ Đã chuyển chế độ agent sang **\`${newMode}\`**.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, confirmMsg]);
      return;
    }

    if (normalized === '/help' || normalized === '/h') {
      const helpMsg: Message = {
        role: 'assistant',
        content:
          '📋 **Các lệnh có sẵn:**\n' +
          '  /provider  — Quản lý provider (thêm, chọn)\n' +
          '  /model     — Quản lý model của provider hiện tại\n' +
          '  /mode      — Xem/đổi chế độ agent (normal, plan, accept-edit, bypass, fix, god-mode)\n' +
          '  /tool-mode — Xem/đổi chế độ gọi tool (auto/native/xml)\n' +
          '  /logs      — Xem log hệ thống (/logs, /logs all, /logs clear)\n' +
          '  /expand    — Chuyển chế độ Tóm tắt / Chi tiết (alias: /e)\n' +
          '  /help      — Hiển thị trợ giúp này\n' +
          '\n💡 Nhập tin nhắn thông thường để trò chuyện với AI.\n' +
          '⌨️  Phím tắt: Tab (chuyển agent mode), Ctrl+O (toggle Tóm tắt/Chi tiết), Ctrl+I (stable mode).',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, helpMsg]);
      return;
    }

    // ── /language — đổi ngôn ngữ giao diện ──────────────────
    if (normalized === '/language' || normalized === '/lang') {
      const langMsg: Message = {
        role: 'assistant',
        content: t('app.language.invalid'),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, langMsg]);
      return;
    }

    const langMatch = normalized.match(/^\/(?:language|lang)\s+(vi|en)$/);
    if (langMatch) {
      const lang = langMatch[1] as 'vi' | 'en';
      setLanguage(lang);
      const cfg = loadConfig();
      cfg.language = lang;
      saveConfig(cfg);
      const langName = lang === 'vi' ? 'Tiếng Việt' : 'English';
      const confirmMsg: Message = {
        role: 'assistant',
        content: t('app.language.switched', { langName }),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, confirmMsg]);
      return;
    }

    // Lệnh không xác định
    const unknownMsg: Message = {
      role: 'assistant',
      content: `LunaCoding: Lệnh "${command}" không được hỗ trợ. Gõ /help để xem danh sách lệnh.`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, unknownMsg]);
  }, [refreshProviders]);

  // ============================================================
  // Chat handler
  // ============================================================
  const handleSendMessage = useCallback(async (input: string) => {
    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    // Tạo placeholder assistantMessage với content rỗng
    const placeholder: Message = {
      role: 'assistant',
      content: '',
      reasoningContent: '',
      reasoningTokens: undefined,
      completionTokens: undefined,
      totalTokens: undefined,
      timestamp: new Date(),
      toolCalls: [],
    };

    setMessages((prev) => [...prev, userMessage, placeholder]);
    if (!stableModeRef.current) {
      setIsLoading(true);
      setIsStreaming(true);
      setStreamingPhase(null);
    }

    const allMessages = [...messagesRef.current, userMessage];
    const placeholderIdx = allMessages.length; // index của placeholder trong messages

    let thinkingText = '';
    let responseText = '';
    let errorText = '';
    let finalUsage: ChatStreamChunk['usage'] | undefined;

    let currentMessages = [...allMessages];
    try {
      for await (const chunk of sendChatMessageStream(allMessages)) {
        if (chunk.type === 'reasoning') {
          thinkingText += chunk.text ?? '';
          currentMessages[placeholderIdx] = {
            ...currentMessages[placeholderIdx]!,
            reasoningContent: thinkingText,
          };
          if (!stableModeRef.current) {
            if (streamingPhaseRef.current !== 'thinking') {
              streamingPhaseRef.current = 'thinking';
              setStreamingPhase('thinking');
            }
            setMessages([...currentMessages]);
          }
        } else if (chunk.type === 'content') {
          responseText += chunk.text ?? '';
          currentMessages[placeholderIdx] = {
            ...currentMessages[placeholderIdx]!,
            content: responseText,
          };
          if (!stableModeRef.current) {
            if (streamingPhaseRef.current !== 'responding') {
              streamingPhaseRef.current = 'responding';
              setStreamingPhase('responding');
            }
            setMessages([...currentMessages]);
          }
        } else if (chunk.type === 'error') {
          // Nhận chunk lỗi từ chat.ts — hiển thị trực tiếp
          errorText = chunk.error ?? 'Lỗi không xác định từ provider.';
          currentMessages[placeholderIdx] = {
            ...currentMessages[placeholderIdx]!,
            content: `● LunaCoding: ${errorText}\n\n💡 Dùng \`/logs\` để xem chi tiết lỗi.`,
          };
          if (!stableModeRef.current) {
            setMessages([...currentMessages]);
          }
          // Không hiển thị thêm nội dung nào nữa, kết thúc stream
          streamingPhaseRef.current = null;
          if (!stableModeRef.current) {
            setStreamingPhase(null);
          }
        } else if (chunk.type === 'tool_call') {
          const tc = chunk.toolCall;
          if (tc) {
            const newRecord: ToolCallRecord = {
              id: randomUUID(),
              name: tc.name,
              arguments: tc.arguments,
              state: 'running',
            };
            const prevCalls = currentMessages[placeholderIdx]?.toolCalls ?? [];
            currentMessages[placeholderIdx] = {
              ...currentMessages[placeholderIdx]!,
              toolCalls: [...prevCalls, newRecord],
            };
            if (!stableModeRef.current) {
              setMessages([...currentMessages]);
            }
          }
        } else if (chunk.type === 'tool_result') {
          const tr = chunk.toolResult;
          if (tr) {
            const prevCalls = currentMessages[placeholderIdx]?.toolCalls ?? [];
            // Tìm tool đang chạy cuối cùng để ghi nhận kết quả
            const reversed = [...prevCalls].reverse();
            const runningIdxInReversed = reversed.findIndex(c => c.state === 'running');
            let updatedCalls = prevCalls;
            if (runningIdxInReversed !== -1) {
              const runningIdx = prevCalls.length - 1 - runningIdxInReversed;
              const newCalls = [...prevCalls];
              const existing = newCalls[runningIdx]!;
              newCalls[runningIdx] = {
                id: existing.id,
                name: existing.name,
                arguments: existing.arguments,
                resultContent: tr.content.slice(0, 2000),
                isError: tr.isError,
                state: tr.isError ? 'error' : 'success',
              };
              updatedCalls = newCalls;
            }
            currentMessages[placeholderIdx] = {
              ...currentMessages[placeholderIdx]!,
              toolCalls: updatedCalls,
            };
            if (!stableModeRef.current) {
              setMessages([...currentMessages]);
            }
          }
        } else if (chunk.type === 'done') {
          finalUsage = chunk.usage;
          streamingPhaseRef.current = null;
          if (!stableModeRef.current) {
            setStreamingPhase(null);
          }
        }

        // Khi stable mode bật, lưu trạng thái vào buffer để flush sau
        if (stableModeRef.current) {
          streamBufferRef.current = {
            messages: [...currentMessages],
            placeholderIdx,
            thinkingText,
            responseText,
            finalUsage,
            finished: chunk.type === 'done' || chunk.type === 'error',
          };
        }
      }
    } catch (err) {
      // Lỗi không mong đợi trong vòng lặp stream
      const errMsg = err instanceof Error ? err.message : String(err);
      errorText = `Lỗi kết nối: ${errMsg}`;
      currentMessages[placeholderIdx] = {
        ...currentMessages[placeholderIdx]!,
        content: `● LunaCoding: ${errorText}\n\n💡 Dùng \`/logs\` để xem chi tiết lỗi.`,
      };
      streamingPhaseRef.current = null;
      if (!stableModeRef.current) {
        setStreamingPhase(null);
        setMessages([...currentMessages]);
      }
    } finally {
      // Sau khi stream kết thúc, đồng bộ UI với dữ liệu cuối cùng
      // Nếu đã có lỗi (errorText) hoặc đã có phản hồi, giữ nguyên
      // Chỉ hiển thị fallback message khi không có gì cả
      if (!errorText) {
        if (responseText.length > 0 || thinkingText.length > 0) {
          // Có phản hồi bình thường — không cần làm gì thêm
        } else {
          // Không có phản hồi và không có lỗi cụ thể — fallback
          currentMessages[placeholderIdx] = {
            ...currentMessages[placeholderIdx]!,
            content: '● LunaCoding: Không thể kết nối đến provider hoặc stream bị gián đoạn. Vui lòng thử lại.\n\n💡 Dùng `/logs` để xem chi tiết lỗi.',
          };
        }
      }

      if (stableModeRef.current) {
        // Lưu trạng thái cuối vào buffer; useEffect sẽ flush khi tắt stable mode
        streamBufferRef.current = {
          messages: [...currentMessages],
          placeholderIdx,
          thinkingText,
          responseText,
          finalUsage,
          finished: true,
        };
      } else {
        setMessages((prev) => {
          const next = [...prev];
          if (next[placeholderIdx]) {
            // Giữ nguyên content nếu đã được set bởi error hoặc response
            const existingContent = currentMessages[placeholderIdx]?.content ?? '';
            const existingToolCalls = currentMessages[placeholderIdx]?.toolCalls;
            next[placeholderIdx] = {
              ...next[placeholderIdx],
              content: existingContent || next[placeholderIdx]?.content || '',
              toolCalls: existingToolCalls,
              reasoningTokens: finalUsage?.reasoningTokens,
              completionTokens: finalUsage
                ? finalUsage.completionTokens - (finalUsage.reasoningTokens ?? 0)
                : undefined,
              totalTokens: finalUsage?.totalTokens,
            };
          }
          return next;
        });
      }
    }

    if (!stableModeRef.current) {
      setIsLoading(false);
      setIsStreaming(false);
      streamingPhaseRef.current = null;
      setStreamingPhase(null);
    } else {
      // Khi stable mode bật, cập nhật trạng thái vào buffer để useEffect flush
      streamBufferRef.current = {
        ...(streamBufferRef.current ?? {
          messages: [],
          placeholderIdx,
          thinkingText: '',
          responseText: '',
          finalUsage: undefined,
          finished: false,
        }),
        finished: true,
      };
    }
  }, []);

  // ============================================================
  // Provider handlers
  // ============================================================

  /** Chọn provider → set làm current → về chat */
  const handleProviderSelect = useCallback((providerId: string) => {
    setCurrentProvider(providerId);
    refreshProviders();
    setUiMode('chat');
  }, [refreshProviders]);

  /** Mở form chọn loại provider */
  const handleOpenProviderAdd = useCallback(() => {
    setSelectedProviderType(null);
    setUiMode('provider-type-select');
  }, []);

  /** Chọn loại provider → mở form thêm */
  const handleProviderTypeSelect = useCallback((type: ProviderType) => {
    setSelectedProviderType(type);
    setUiMode('provider-add-form');
  }, []);

  /** Lưu provider mới → set làm current → về chat */
  const handleProviderSave = useCallback((data: {
    name: string;
    type: ProviderType;
    baseUrl: string;
    apiKey: string;
    defaultModel: string;
  }) => {
    const newProvider = addProvider({ ...data, models: [data.defaultModel] });
    setCurrentProvider(newProvider.id);
    refreshProviders();
    setUiMode('chat');
  }, [refreshProviders]);

  // ============================================================
  // Model handlers
  // ============================================================

  /** Chọn model → set làm default → về chat */
  const handleModelSelect = useCallback((modelId: string) => {
    if (selectedProvider) {
      setDefaultModel(selectedProvider.id, modelId);
    }
    refreshProviders();
    setUiMode('chat');
  }, [selectedProvider, refreshProviders]);

  /** Đặt model làm mặc định (giữ nguyên trong model-list) */
  const handleModelSetDefault = useCallback((modelId: string) => {
    if (selectedProvider) {
      const updated = setDefaultModel(selectedProvider.id, modelId);
      if (updated) {
        setSelectedProvider(updated);
      }
    }
    refreshProviders();
  }, [selectedProvider, refreshProviders]);

  /** Xóa model khỏi provider */
  const handleModelDelete = useCallback((modelId: string) => {
    if (!selectedProvider) return;
    const newModels = selectedProvider.models.filter((m) => m !== modelId);
    const updated = updateProviderModels(selectedProvider.id, newModels);
    if (updated) {
      setSelectedProvider(updated);
    }
    refreshProviders();
  }, [selectedProvider, refreshProviders]);

  /** Thêm model thủ công */
  const handleModelAddSubmit = useCallback((modelId: string) => {
    if (!selectedProvider) return;
    const newModels = [...selectedProvider.models, modelId];
    const updated = updateProviderModels(selectedProvider.id, newModels);
    if (updated) {
      setSelectedProvider(updated);
    }
    refreshProviders();
    setShowModelAddInput(false);
  }, [selectedProvider, refreshProviders]);

  /** Fetch model từ API */
  const handleFetchModels = useCallback(async () => {
    if (!selectedProvider) return;

    setModelFetching(true);
    setModelFetchError(null);

    try {
      const providerInstance = createProvider(selectedProvider);
      const fetchedModels = await providerInstance.listModels();
      const updated = updateProviderModels(selectedProvider.id, fetchedModels);
      if (updated) {
        setSelectedProvider(updated);
      }
      refreshProviders();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Lỗi không xác định';
      setModelFetchError(`Không thể lấy danh sách model: ${message}`);
    } finally {
      setModelFetching(false);
    }
  }, [selectedProvider, refreshProviders]);

  // ============================================================
  // Navigation handlers
  // ============================================================

  /** Mở ModelAddInput */
  const handleModelAddMode = useCallback(() => {
    setShowModelAddInput(true);
  }, []);

  /** Quay lại từ ModelAddInput về ModelMenu */
  const handleModelAddBack = useCallback(() => {
    setShowModelAddInput(false);
  }, []);

  /** Back từ ProviderMenu về chat */
  const handleProviderBack = useCallback(() => {
    setUiMode('chat');
  }, []);

  /** Back từ ProviderTypeSelect về ProviderMenu */
  const handleProviderTypeBack = useCallback(() => {
    refreshProviders();
    setUiMode('provider-list');
  }, [refreshProviders]);

  /** Back từ ProviderAddForm về ProviderTypeSelect (hoặc ProviderMenu) */
  const handleProviderFormBack = useCallback(() => {
    setUiMode('provider-type-select');
  }, []);

  /** Back từ ModelMenu về chat */
  const handleModelBack = useCallback(() => {
    setUiMode('chat');
  }, []);

  /** Chuyển đổi AgentMode */
  const handleAgentModeChange = useCallback((mode: AgentMode) => {
    setAgentMode(mode);
  }, []);

  // ============================================================
  // Render
  // ============================================================
  return (
    <Box flexDirection="column" height="100%">
      <TerminalTop stableMode={stableMode} />
      <TerminalMid
        uiMode={uiMode}
        chatProps={{
          messages,
          isLoading,
          isStreaming,
          streamingPhase,
          detailMode,
        }}
        providerListProps={{
          providers,
          onProviderSelect: handleProviderSelect,
          onProviderAdd: handleOpenProviderAdd,
          onBack: handleProviderBack,
        }}
        providerTypeSelectProps={{
          onProviderTypeSelect: handleProviderTypeSelect,
          onBack: handleProviderTypeBack,
        }}
        providerAddFormProps={{
          providerAddType: selectedProviderType!,
          onProviderSave: handleProviderSave,
          onBack: handleProviderFormBack,
        }}
        modelListProps={{
          provider: selectedProvider!,
          showModelAddInput,
          onModelSelect: handleModelSelect,
          onModelSetDefault: handleModelSetDefault,
          onModelDelete: handleModelDelete,
          onModelAdd: handleModelAddMode,
          onModelFetch: handleFetchModels,
          onModelAddSubmit: handleModelAddSubmit,
          onModelAddBack: handleModelAddBack,
          onBack: handleModelBack,
          isFetchingModels: modelFetching,
          modelFetchError,
        }}
      />
      <TerminalBottom
        onSend={handleSendMessage}
        onCommand={handleCommand}
        isLoading={isLoading}
        uiMode={uiMode}
        stableMode={stableMode}
        agentMode={agentMode}
        onAgentModeChange={handleAgentModeChange}
      />
    </Box>
  );
};

export default React.memo(App);