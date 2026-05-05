import React, { useState, useEffect } from 'react';
import { Box, useInput } from 'ink';
import TerminalTop from './components/TerminalTop.js';
import TerminalMid from './components/TerminalMid.js';
import TerminalBottom from './components/TerminalBottom.js';
import { sendChatMessage } from '../services/chat.js';
import {
  loadConfig,
  setCurrentProvider,
  addProvider,
  updateProviderModels,
  setDefaultModel,
  getCurrentProvider,
} from '../services/config.js';
import { createProvider } from '../services/providers/registry.js';
import type {
  Message,
  UiMode,
  ProviderConfig,
  ProviderType,
} from '../services/types.js';

const App = () => {
  // ============================================================
  // Chat state
  // ============================================================
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedThinkingIndices, setExpandedThinkingIndices] = useState<Set<number>>(new Set());

  // ============================================================
  // UI Mode & Provider state
  // ============================================================
  const [uiMode, setUiMode] = useState<UiMode>('chat');
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [selectedProviderType, setSelectedProviderType] =
    useState<ProviderType | null>(null);
  const [selectedProvider, setSelectedProvider] =
    useState<ProviderConfig | null>(null);
  const [modelFetching, setModelFetching] = useState(false);
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);
  const [showModelAddInput, setShowModelAddInput] = useState(false);

  // ============================================================
  // Load providers từ config khi mount
  // ============================================================
  const refreshProviders = () => {
    const config = loadConfig();
    setProviders(config.providers);
  };

  useEffect(() => {
    refreshProviders();
  }, []);

  // ============================================================
  // Keyboard shortcut: Ctrl+O to toggle all reasoning blocks
  // ============================================================
  useInput((input, key) => {
    if (key.ctrl && input === 'o') {
      const reasoningIndices: number[] = [];
      messages.forEach((msg, idx) => {
        if (msg.role === 'assistant' && msg.reasoningContent) {
          reasoningIndices.push(idx);
        }
      });

      if (reasoningIndices.length > 0) {
        setExpandedThinkingIndices(prev => {
          const allExpanded = reasoningIndices.every(idx => prev.has(idx));
          const next = new Set(prev);
          if (allExpanded) {
            reasoningIndices.forEach(idx => next.delete(idx));
          } else {
            reasoningIndices.forEach(idx => next.add(idx));
          }
          return next;
        });
      }
    }
  });

  // ============================================================
  // Command handler — parse các lệnh /
  // ============================================================
  const handleCommand = (command: string) => {
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

    if (normalized === '/help' || normalized === '/h') {
      const helpMsg: Message = {
        role: 'assistant',
        content:
          '📋 **Các lệnh có sẵn:**\n' +
          '  /provider  — Quản lý provider (thêm, chọn)\n' +
          '  /model     — Quản lý model của provider hiện tại\n' +
          '  /help      — Hiển thị trợ giúp này\n' +
          '\n💡 Nhập tin nhắn thông thường để trò chuyện với AI.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, helpMsg]);
      return;
    }

    // Lệnh không xác định
    const unknownMsg: Message = {
      role: 'assistant',
      content: `LunaCoding: Lệnh "${command}" không được hỗ trợ. Gõ /help để xem danh sách lệnh.`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, unknownMsg]);
  };

  // ============================================================
  // Chat handler
  // ============================================================
  const handleSendMessage = async (input: string) => {
    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const result = await sendChatMessage([...messages, userMessage]);

    const assistantMessage: Message = {
      role: 'assistant',
      content: result.content,
      reasoningContent: result.reasoning,
      reasoningTokens: result.usage?.reasoningTokens,
      completionTokens: result.usage
        ? result.usage.completionTokens - (result.usage.reasoningTokens ?? 0)
        : undefined,
      totalTokens: result.usage?.totalTokens,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsLoading(false);
  };

  // ============================================================
  // Provider handlers
  // ============================================================

  /** Chọn provider → set làm current → về chat */
  const handleProviderSelect = (providerId: string) => {
    setCurrentProvider(providerId);
    refreshProviders();
    setUiMode('chat');
  };

  /** Mở form chọn loại provider */
  const handleOpenProviderAdd = () => {
    setSelectedProviderType(null);
    setUiMode('provider-type-select');
  };

  /** Chọn loại provider → mở form thêm */
  const handleProviderTypeSelect = (type: ProviderType) => {
    setSelectedProviderType(type);
    setUiMode('provider-add-form');
  };

  /** Lưu provider mới → set làm current → về chat */
  const handleProviderSave = (data: {
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
  };

  // ============================================================
  // Model handlers
  // ============================================================

  /** Chọn model → set làm default → về chat */
  const handleModelSelect = (modelId: string) => {
    if (selectedProvider) {
      setDefaultModel(selectedProvider.id, modelId);
    }
    refreshProviders();
    setUiMode('chat');
  };

  /** Đặt model làm mặc định (giữ nguyên trong model-list) */
  const handleModelSetDefault = (modelId: string) => {
    if (selectedProvider) {
      const updated = setDefaultModel(selectedProvider.id, modelId);
      if (updated) {
        setSelectedProvider(updated);
      }
    }
    refreshProviders();
  };

  /** Xóa model khỏi provider */
  const handleModelDelete = (modelId: string) => {
    if (!selectedProvider) return;
    const newModels = selectedProvider.models.filter((m) => m !== modelId);
    const updated = updateProviderModels(selectedProvider.id, newModels);
    if (updated) {
      setSelectedProvider(updated);
    }
    refreshProviders();
  };

  /** Thêm model thủ công */
  const handleModelAddSubmit = (modelId: string) => {
    if (!selectedProvider) return;
    const newModels = [...selectedProvider.models, modelId];
    const updated = updateProviderModels(selectedProvider.id, newModels);
    if (updated) {
      setSelectedProvider(updated);
    }
    refreshProviders();
    setShowModelAddInput(false);
  };

  /** Fetch model từ API */
  const handleFetchModels = async () => {
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
  };

  // ============================================================
  // Navigation handlers
  // ============================================================

  /** Mở ModelAddInput */
  const handleModelAddMode = () => {
    setShowModelAddInput(true);
  };

  /** Quay lại từ ModelAddInput về ModelMenu */
  const handleModelAddBack = () => {
    setShowModelAddInput(false);
  };

  /** Back từ ProviderMenu về chat */
  const handleProviderBack = () => {
    setUiMode('chat');
  };

  /** Back từ ProviderTypeSelect về ProviderMenu */
  const handleProviderTypeBack = () => {
    refreshProviders();
    setUiMode('provider-list');
  };

  /** Back từ ProviderAddForm về ProviderTypeSelect (hoặc ProviderMenu) */
  const handleProviderFormBack = () => {
    setUiMode('provider-type-select');
  };

  /** Back từ ModelMenu về chat */
  const handleModelBack = () => {
    setUiMode('chat');
  };

  // ============================================================
  // Render
  // ============================================================
  return (
    <Box flexDirection="column" height="100%">
      <TerminalTop />
      <TerminalMid
        uiMode={uiMode}
        chatProps={{
          messages,
          isLoading,
          expandedThinkingIndices,
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
      />
    </Box>
  );
};

export default App;