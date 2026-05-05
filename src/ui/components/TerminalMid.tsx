import React from 'react';
import { Box, Text } from 'ink';
import type { Message, ProviderConfig, ProviderType } from '../../services/types.js';
import ProviderMenu from './ProviderMenu.js';
import ProviderTypeSelect from './ProviderTypeSelect.js';
import ProviderAddForm from './ProviderAddForm.js';
import ModelMenu from './ModelMenu.js';
import ModelAddInput from './ModelAddInput.js';

// ─── Type định nghĩa UiMode ───────────────────────────────────────────

export type UiMode =
  | 'chat'
  | 'provider-list'
  | 'provider-type-select'
  | 'provider-add-form'
  | 'model-list';

// ─── Props gom theo nhóm mode ─────────────────────────────────────────

interface ChatModeProps {
  messages: Message[];
  isLoading: boolean;
}

interface ProviderListModeProps {
  providers: ProviderConfig[];
  onProviderSelect: (providerId: string) => void;
  onProviderAdd: () => void;
  onBack: () => void;
}

interface ProviderTypeSelectModeProps {
  onProviderTypeSelect: (type: ProviderType) => void;
  onBack: () => void;
}

interface ProviderAddFormModeProps {
  providerAddType: ProviderType;
  onProviderSave: (data: {
    name: string;
    type: ProviderType;
    baseUrl: string;
    apiKey: string;
    defaultModel: string;
  }) => void;
  onBack: () => void;
}

interface ModelListModeProps {
  provider: ProviderConfig;
  showModelAddInput: boolean;
  onModelSelect: (modelId: string) => void;
  onModelSetDefault: (modelId: string) => void;
  onModelDelete: (modelId: string) => void;
  onModelAdd: () => void;
  onModelFetch: () => void;
  onModelAddSubmit: (modelId: string) => void;
  onModelAddBack: () => void;
  onBack: () => void;
  isFetchingModels: boolean;
  modelFetchError: string | null;
}

// ─── Props tổng hợp cho TerminalMid ───────────────────────────────────

interface TerminalMidProps {
  uiMode: UiMode;
  chatProps: ChatModeProps;
  providerListProps: ProviderListModeProps;
  providerTypeSelectProps: ProviderTypeSelectModeProps;
  providerAddFormProps: ProviderAddFormModeProps;
  modelListProps: ModelListModeProps;
}

// ─── Component chat (giữ nguyên logic cũ) ───────────────────────────

const ChatView = ({ messages, isLoading }: ChatModeProps) => {
  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      padding={1}
      borderStyle="round"
      borderColor="blue"
    >
      {isLoading && (
        <Box marginBottom={1} padding={1}>
          <Text color="cyan" dimColor>
            🤖 LunaCoding đang trả lời...
          </Text>
        </Box>
      )}
      {messages.length === 0 && !isLoading ? (
        <Box justifyContent="center" alignItems="center" flexGrow={1}>
          <Text dimColor>
            Chưa có tin nhắn nào. Hãy nhập tin nhắn bên dưới để bắt đầu trò chuyện!
          </Text>
        </Box>
      ) : (
        messages.map((msg, index) => (
          <Box
            key={index}
            marginBottom={1}
            flexDirection="column"
            borderStyle="single"
            borderColor={msg.role === 'user' ? 'green' : 'yellow'}
            padding={1}
          >
            <Box justifyContent="space-between" marginBottom={1}>
              <Text bold color={msg.role === 'user' ? 'green' : 'yellow'}>
                {msg.role === 'user' ? '👤 Bạn' : '🤖 LunaCoding'}
              </Text>
              <Text dimColor>
                {msg.timestamp.toLocaleTimeString('vi-VN')}
              </Text>
            </Box>
            <Text wrap="wrap">{msg.content}</Text>
          </Box>
        ))
      )}
    </Box>
  );
};

// ─── Router component chính ───────────────────────────────────────────

const TerminalMid = ({
  uiMode,
  chatProps,
  providerListProps,
  providerTypeSelectProps,
  providerAddFormProps,
  modelListProps,
}: TerminalMidProps) => {
  switch (uiMode) {
    // ── Chat mode ──────────────────────────────────────────────
    case 'chat':
      return (
        <ChatView
          messages={chatProps.messages}
          isLoading={chatProps.isLoading}
        />
      );

    // ── Provider list mode ────────────────────────────────────
    case 'provider-list':
      return (
        <ProviderMenu
          providers={providerListProps.providers}
          onSelect={providerListProps.onProviderSelect}
          onAdd={providerListProps.onProviderAdd}
          onBack={providerListProps.onBack}
        />
      );

    // ── Provider type select mode ─────────────────────────────
    case 'provider-type-select':
      return (
        <ProviderTypeSelect
          onSelect={providerTypeSelectProps.onProviderTypeSelect}
          onBack={providerTypeSelectProps.onBack}
        />
      );

    // ── Provider add form mode ────────────────────────────────
    case 'provider-add-form':
      return (
        <ProviderAddForm
          type={providerAddFormProps.providerAddType}
          onSave={providerAddFormProps.onProviderSave}
          onBack={providerAddFormProps.onBack}
        />
      );

    // ── Model list mode ───────────────────────────────────────
    case 'model-list':
      if (modelListProps.showModelAddInput) {
        return (
          <ModelAddInput
            providerName={modelListProps.provider.name}
            existingModels={modelListProps.provider.models}
            onAdd={modelListProps.onModelAddSubmit}
            onBack={modelListProps.onModelAddBack}
          />
        );
      }
      return (
        <ModelMenu
          provider={modelListProps.provider}
          onSelect={modelListProps.onModelSelect}
          onSetDefault={modelListProps.onModelSetDefault}
          onDelete={modelListProps.onModelDelete}
          onAdd={modelListProps.onModelAdd}
          onFetch={modelListProps.onModelFetch}
          onBack={modelListProps.onBack}
          isFetching={modelListProps.isFetchingModels}
          fetchError={modelListProps.modelFetchError}
        />
      );

    // ── Fallback (không bao giờ xảy ra nếu type đúng) ─────────
    default:
      return (
        <Box flexDirection="column" flexGrow={1} padding={1} borderStyle="round" borderColor="blue">
          <Box justifyContent="center" alignItems="center" flexGrow={1}>
            <Text dimColor>Lỗi: uiMode không hợp lệ ({uiMode})</Text>
          </Box>
        </Box>
      );
  }
};

export default TerminalMid;