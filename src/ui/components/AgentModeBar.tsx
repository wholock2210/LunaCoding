import React from 'react';
import { Box, Text } from 'ink';
import type { AgentMode } from '../../services/types.js';
import { t } from '../../services/language.js';

// ── Constants ─────────────────────────────────────────────────
const MODE_ORDER: AgentMode[] = [
  'normal',
  'plan',
  'accept-edit',
  'bypass',
  'fix',
  'god-mode',
];

/** Map mode → t key để lấy label từ language.ts */
const MODE_LABEL_KEYS: Record<AgentMode, string> = {
  'normal': 'mode.normal',
  'plan': 'mode.plan',
  'accept-edit': 'mode.acceptEdits',
  'bypass': 'mode.auto',
  'fix': 'mode.fix',
  'god-mode': 'mode.godMode',
};

/** Map mode → t key để lấy desc từ language.ts */
const MODE_DESC_KEYS: Record<AgentMode, string> = {
  'normal': 'mode.normal.desc',
  'plan': 'mode.plan.desc',
  'accept-edit': 'mode.acceptEdits.desc',
  'bypass': 'mode.auto.desc',
  'fix': 'mode.fix.desc',
  'god-mode': 'mode.godMode.desc',
};

/** Lấy mode kế tiếp trong danh sách xoay vòng */
export function getNextMode(current: AgentMode): AgentMode {
  const idx = MODE_ORDER.indexOf(current);
  return MODE_ORDER[(idx + 1) % MODE_ORDER.length]!;
}

/** Lấy tên hiển thị của một mode */
export function getModeLabel(mode: AgentMode): string {
  const key = MODE_LABEL_KEYS[mode];
  return key ? t(key as any) : mode;
}

/** Danh sách mode với nhãn và mô tả (dùng bởi /mode command) */
export const MODE_LABELS: { mode: AgentMode; label: string; desc: string }[] =
  MODE_ORDER.map((mode) => ({
    mode,
    label: getModeLabel(mode),
    desc: MODE_DESC_KEYS[mode] ? t(MODE_DESC_KEYS[mode] as any) : '',
  }));

// ── Props ─────────────────────────────────────────────────────
interface AgentModeBarProps {
  currentMode: AgentMode;
}

// ── Component ─────────────────────────────────────────────────
const AgentModeBar = ({ currentMode }: AgentModeBarProps) => {
  return (
    <Box flexDirection="column" marginTop={0}>
      {/* Hàng các mode badge */}
      <Box flexDirection="row" flexWrap="wrap">
        {MODE_ORDER.map((mode, idx) => {
          const isActive = mode === currentMode;
          return (
            <Box key={mode} flexDirection="row">
              {idx > 0 && <Text dimColor>  </Text>}
              <Text
                color={isActive ? '#22D3EE' : undefined}
                bold={isActive}
                dimColor={!isActive}
              >
                {isActive ? '◉' : '○'} {getModeLabel(mode)}
              </Text>
            </Box>
          );
        })}
      </Box>
      {/* Dòng gợi ý */}
      <Box marginTop={0}>
        <Text dimColor>
          {t('mode.hint')}
        </Text>
      </Box>
    </Box>
  );
};

export default React.memo(AgentModeBar);
