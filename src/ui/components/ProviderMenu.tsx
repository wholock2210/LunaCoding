import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { ProviderConfig, ProviderType } from '../../services/types.js';
import { t } from '../../services/language.js';

const ITEMS_PER_PAGE = 5;

interface ProviderMenuProps {
  providers: ProviderConfig[];
  onSelect: (providerId: string) => void;
  onAdd: () => void;
  onBack: () => void;
}

const PROVIDER_TYPE_LABELS: Record<ProviderType, string> = {
  'openai-compatible': 'OpenAI Compatible',
  anthropic: 'Anthropic',
  'google-gemini': 'Google Gemini',
  cohere: 'Cohere',
};

const ProviderMenu = ({ providers, onSelect, onAdd, onBack }: ProviderMenuProps) => {
  const [page, setPage] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const totalPages = Math.max(1, Math.ceil(providers.length / ITEMS_PER_PAGE));
  const startIdx = page * ITEMS_PER_PAGE;
  const visibleProviders = providers.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  const hasMoreUp = page > 0;
  const hasMoreDown = page < totalPages - 1;

  useInput((input, key) => {
    if (key.upArrow) {
      if (selectedIndex > 0) {
        setSelectedIndex((prev) => prev - 1);
      } else if (hasMoreUp) {
        setPage((prev) => prev - 1);
        setSelectedIndex(ITEMS_PER_PAGE - 1);
      }
    } else if (key.downArrow) {
      if (selectedIndex < visibleProviders.length - 1) {
        setSelectedIndex((prev) => prev + 1);
      } else if (hasMoreDown) {
        setPage((prev) => prev + 1);
        setSelectedIndex(0);
      }
    } else if (key.return) {
      const selected = visibleProviders[selectedIndex];
      if (selected) {
        onSelect(selected.id);
      }
    } else if (input === 'a' || input === 'A') {
      onAdd();
    } else if (input === 'q' || input === 'Q') {
      onBack();
    }
  });

  if (providers.length === 0) {
    return (
      <Box flexDirection="column" padding={1} borderStyle="round" borderColor="magenta">
        <Box marginBottom={1}>
          <Text bold color="magenta">
            {t('provider.title')}
          </Text>
        </Box>
        <Box marginY={1}>
          <Text dimColor>{t('provider.noProvider')}</Text>
        </Box>
        <Box marginY={1}>
          <Text>
            {t('provider.press')}
            <Text color="green" bold>A</Text>
            {t('provider.toAdd')}
            <Text color="yellow" bold>Q</Text>
            {t('provider.toQuit')}
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="magenta">
      <Box marginBottom={1}>
        <Text bold color="magenta">
          {t('provider.title')} — {t('provider.page')}{page + 1}/{totalPages}
        </Text>
      </Box>

      {hasMoreUp && (
        <Box>
          <Text color="cyan">{t('provider.moreAbove')}</Text>
        </Box>
      )}

      {visibleProviders.map((provider, idx) => {
        const isSelected = idx === selectedIndex;
        const typeLabel = PROVIDER_TYPE_LABELS[provider.type] ?? provider.type;
        const modelCount = provider.models.length;

        return (
          <Box key={provider.id} paddingY={0} paddingX={1}>
            <Text color={isSelected ? 'green' : undefined} bold={isSelected}>
              {isSelected ? '▶ ' : '  '}
              {provider.name}
            </Text>
            <Text dimColor> — {typeLabel}</Text>
            <Text dimColor> ({modelCount} model{modelCount !== 1 ? 's' : ''})</Text>
            {isSelected && (
              <Text color="green" bold>
                {' '}
                {t('provider.toSelect')}
              </Text>
            )}
          </Box>
        );
      })}

      {hasMoreDown && (
        <Box>
          <Text color="cyan">{t('provider.moreBelow')}</Text>
        </Box>
      )}

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>
          {t('provider.help.navigate')}
        </Text>
        <Text dimColor>
          {t('provider.help.actions')}
        </Text>
      </Box>
    </Box>
  );
};

export default ProviderMenu;