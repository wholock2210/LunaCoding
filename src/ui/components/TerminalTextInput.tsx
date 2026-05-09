import React, { useState, useEffect } from 'react';
import { Text, useInput } from 'ink';

interface TerminalTextInputProps {
  /** Giá trị hiện tại của input */
  value: string;
  /** Placeholder khi input rỗng */
  placeholder?: string;
  /** Focus hay không (mặc định true) */
  focus?: boolean;
  /** Mask ký tự (cho password input) */
  mask?: string;
  /** Hiển thị cursor (mặc định true) */
  showCursor?: boolean;
  /** Callback khi giá trị thay đổi */
  onChange: (value: string) => void;
  /** Callback khi submit (Enter) */
  onSubmit?: (value: string) => void;
}

/**
 * TerminalTextInput
 * 
 * Fork từ ink-text-input, bổ sung prop `onCtrlO` để bắt tổ hợp Ctrl+O
 * trước khi nó bị xử lý như ký tự thường.
 * 
 * Ctrl+O (byte 0x0F) được parseKeypress parse thành:
 *   { name: 'o', ctrl: true, sequence: '\x0F' }
 * và useInput trả về input = 'o' (vì ctrl = true nên input = name).
 * 
 * Nếu không xử lý, nó rơi vào nhánh else → thêm 'o' vào text.
 * Bằng cách kiểm tra ở đầu useInput callback, ta nuốt phím này
 * và gọi onCtrlO() thay vì thêm vào text.
 */
const TerminalTextInput: React.FC<TerminalTextInputProps> = ({
  value: originalValue = '',
  placeholder = '',
  focus = true,
  mask,
  showCursor = true,
  onChange,
  onSubmit,
}) => {
  const [state, setState] = useState({
    cursorOffset: (originalValue || '').length,
    cursorWidth: 0,
  });
  const { cursorOffset } = state;

  // Sync cursor khi value thay đổi từ bên ngoài
  useEffect(() => {
    setState((previousState) => {
      if (!focus || !showCursor) {
        return previousState;
      }
      const newValue = originalValue || '';
      if (previousState.cursorOffset > newValue.length - 1) {
        return {
          cursorOffset: Math.max(0, newValue.length),
          cursorWidth: 0,
        };
      }
      return previousState;
    });
  }, [originalValue, focus, showCursor]);

  // ── Render value với highlight cursor ────────────────────────
  const renderedValue = mask
    ? mask.repeat(originalValue.length)
    : originalValue;

  let renderedText = renderedValue;
  let renderedPlaceholder = placeholder || undefined;

  if (showCursor && focus) {
    if (placeholder && renderedValue.length === 0) {
      renderedPlaceholder = placeholder;
      renderedText = '\u2588'; // block cursor
    } else if (renderedValue.length === 0) {
      renderedText = '\u2588';
    } else {
      let result = '';
      for (let i = 0; i < renderedValue.length; i++) {
        if (i === cursorOffset) {
          result += '\u2588';
        }
        result += renderedValue[i];
      }
      if (cursorOffset >= renderedValue.length) {
        result += '\u2588';
      }
      renderedText = result;
    }
  }

  // ── useInput handler ─────────────────────────────────────────
  useInput(
    (input, key) => {
      // ── Các phím không làm thay đổi text ──────────────────────
      if (
        key.upArrow ||
        key.downArrow ||
        (key.ctrl && input === 'c') ||
        (key.ctrl && input === 'o') ||
        key.tab ||
        (key.shift && key.tab)
      ) {
        return;
      }

      // ── Enter: submit ─────────────────────────────────────────
      if (key.return) {
        if (onSubmit) {
          onSubmit(originalValue);
        }
        return;
      }

      // ── Xử lý cursor và text ──────────────────────────────────
      let nextCursorOffset = cursorOffset;
      let nextValue = originalValue;
      let nextCursorWidth = 0;

      if (key.leftArrow) {
        if (showCursor) {
          nextCursorOffset--;
        }
      } else if (key.rightArrow) {
        if (showCursor) {
          nextCursorOffset++;
        }
      } else if (key.backspace || key.delete) {
        if (cursorOffset > 0) {
          nextValue =
            originalValue.slice(0, cursorOffset - 1) +
            originalValue.slice(cursorOffset, originalValue.length);
          nextCursorOffset--;
        }
      } else {
        // Ký tự thường — thêm vào text
        nextValue =
          originalValue.slice(0, cursorOffset) +
          input +
          originalValue.slice(cursorOffset, originalValue.length);
        nextCursorOffset += input.length;
        if (input.length > 1) {
          nextCursorWidth = input.length;
        }
      }

      // ── Clamp cursor ──────────────────────────────────────────
      if (nextCursorOffset < 0) {
        nextCursorOffset = 0;
      }
      if (nextCursorOffset > nextValue.length) {
        nextCursorOffset = nextValue.length;
      }

      // ── Update state ──────────────────────────────────────────
      setState({
        cursorOffset: nextCursorOffset,
        cursorWidth: nextCursorWidth,
      });

      // ── Call onChange nếu giá trị thay đổi ────────────────────
      if (nextValue !== originalValue) {
        onChange(nextValue);
      }
    },
    { isActive: focus },
  );

  // ── Render ────────────────────────────────────────────────────
  if (placeholder && originalValue.length === 0) {
    return React.createElement(
      Text,
      { dimColor: true },
      renderedPlaceholder,
    );
  }

  return React.createElement(Text, null, renderedText);
};

export default TerminalTextInput;