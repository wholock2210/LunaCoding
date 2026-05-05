import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { ProviderConfig } from '../../services/types.js';

const ITEMS_PER_PAGE = 5;

interface ModelMenuProps {
  provider: ProviderConfig;
  onSelect: (modelId: string) => void;
  onSetDefault: (modelId: string) => void;
  onDelete: (modelId: string) => void;
  onAdd: () => void;
  onFetch: () => void;
  onBack: () => void;
  isFetching: boolean;
  fetchError: string | null;
}

/**
 * Gộp trùng lặp model ID (case-insensitive) và giữ thứ tự xuất hiện đầu tiên.
 */
function deduplicateModels(models: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const m of models) {
    const key = m.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(m);
    }
  }
  return result;
}

const ModelMenu = ({
  provider,
  onSelect,
  onSetDefault,
  onDelete,
  onAdd,
  onFetch,
  onBack,
  isFetching,
  fetchError,
}: ModelMenuProps) => {
  const [page, setPage] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const models = deduplicateModels(provider.models);
  const totalPages = Math.max(1, Math.ceil(models.length / ITEMS_PER_PAGE));
  const startIdx = page * ITEMS_PER_PAGE;
  const visibleModels = models.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  const hasMoreUp = page > 0;
  const hasMoreDown = page < totalPages - 1;

  useInput((input, key) => {
    // Nếu đang ở chế độ xác nhận xóa
    if (confirmDelete) {
      if (input === 'y' || input === 'Y') {
        onDelete(confirmDelete);
        setConfirmDelete(null);
      } else if (input === 'n' || input === 'N' || key.escape) {
        setConfirmDelete(null);
      }
      return;
    }

    if (key.upArrow) {
      if (selectedIndex > 0) {
        setSelectedIndex((prev) => prev - 1);
      } else if (hasMoreUp) {
        setPage((prev) => prev - 1);
        setSelectedIndex(ITEMS_PER_PAGE - 1);
      }
    } else if (key.downArrow) {
      if (selectedIndex < visibleModels.length - 1) {
        setSelectedIndex((prev) => prev + 1);
      } else if (hasMoreDown) {
        setPage((prev) => prev + 1);
        setSelectedIndex(0);
      }
    } else if (key.return) {
      const selected = visibleModels[selectedIndex];
      if (selected) {
        onSelect(selected);
      }
    } else if (input === 'd' || input === 'D') {
      const selected = visibleModels[selectedIndex];
      if (selected) {
        onSetDefault(selected);
      }
    } else if (input === 'x' || input === 'X') {
      const selected = visibleModels[selectedIndex];
      if (selected) {
        setConfirmDelete(selected);
      }
    } else if (input === 'a' || input === 'A') {
      onAdd();
    } else if (input === 'f' || input === 'F') {
      onFetch();
    } else if (input === 'q' || input === 'Q') {
      onBack();
    }
  });

  // Trạng thái xác nhận xóa
  if (confirmDelete) {
    return (
      <Box flexDirection="column" padding={1} borderStyle="round" borderColor="red">
        <Box marginBottom={1}>
          <Text bold color="red">
            🗑️ Xác nhận xóa model
          </Text>
        </Box>
        <Box marginY={1}>
          <Text>
            Bạn có chắc muốn xóa model{' '}
            <Text color="yellow" bold>
              "{confirmDelete}"
            </Text>
            {' '}khỏi provider{' '}
            <Text color="magenta">{provider.name}</Text>?
          </Text>
        </Box>
        <Box marginY={1}>
          <Text>
            Nhấn <Text color="green" bold>Y</Text> để xác nhận,{' '}
            <Text color="red" bold>N</Text> để hủy
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="yellow">
      {/* Tiêu đề */}
      <Box marginBottom={1}>
        <Text bold color="yellow">
          🤖 Model — {provider.name}
        </Text>
        {provider.defaultModel && (
          <Text dimColor> (mặc định: {provider.defaultModel})</Text>
        )}
      </Box>

      {/* Trạng thái fetching */}
      {isFetching && (
        <Box marginBottom={1}>
          <Text color="yellow">⏳ Đang lấy danh sách model từ API...</Text>
        </Box>
      )}

      {fetchError && (
        <Box marginBottom={1}>
          <Text color="red">❌ {fetchError}</Text>
        </Box>
      )}

      {/* Empty state */}
      {models.length === 0 && !isFetching && (
        <Box marginY={1} flexDirection="column">
          <Text dimColor>Chưa có model nào được thêm.</Text>
          <Box marginTop={1}>
            <Text>
              Nhấn <Text color="green" bold>F</Text> để fetch từ API,{' '}
              <Text color="green" bold>A</Text> để thêm thủ công,{' '}
              <Text color="yellow" bold>Q</Text> để quay lại
            </Text>
          </Box>
        </Box>
      )}

      {/* Phân trang + danh sách */}
      {models.length > 0 && (
        <>
          <Box marginBottom={1}>
            <Text dimColor>
              Trang {page + 1}/{totalPages} — {models.length} model
            </Text>
          </Box>

          {hasMoreUp && (
            <Box>
              <Text color="cyan">↑ Còn model phía trên</Text>
            </Box>
          )}

          {visibleModels.map((model, idx) => {
            const isSelected = idx === selectedIndex;
            const isDefault = model === provider.defaultModel;

            return (
              <Box key={model} paddingY={0} paddingX={1}>
                <Text
                  color={isSelected ? 'green' : isDefault ? 'yellow' : undefined}
                  bold={isSelected || isDefault}
                >
                  {isSelected ? '▶ ' : '  '}
                  {isDefault ? '★ ' : '  '}
                  {model}
                </Text>
                {isDefault && (
                  <Text color="yellow" dimColor>
                    {' '}
                    (mặc định)
                  </Text>
                )}
                {isSelected && !isDefault && (
                  <Text color="green" bold>
                    {' '}
                    ← Chọn
                  </Text>
                )}
              </Box>
            );
          })}

          {hasMoreDown && (
            <Box>
              <Text color="cyan">↓ Còn model phía dưới</Text>
            </Box>
          )}
        </>
      )}

      {/* Hướng dẫn phím */}
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>
          Dùng <Text color="cyan" bold>↑↓</Text> để chọn,{' '}
          <Text color="green" bold>Enter</Text> để dùng model này chat
        </Text>
        <Text dimColor>
          Nhấn <Text color="green" bold>D</Text> đặt mặc định,{' '}
          <Text color="red" bold>X</Text> xóa,{' '}
          <Text color="green" bold>F</Text> fetch từ API,{' '}
          <Text color="green" bold>A</Text> thêm thủ công,{' '}
          <Text color="yellow" bold>Q</Text> quay lại
        </Text>
      </Box>
    </Box>
  );
};

export default ModelMenu;