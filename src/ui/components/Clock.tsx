import React, { useState, useEffect, useRef } from 'react';
import { Text } from 'ink';

interface ClockProps {
  /** Khi frozen = true, đồng hồ tạm dừng cập nhật để tránh re-render */
  frozen?: boolean;
}

/**
 * Đồng hồ hiển thị thời gian, cập nhật mỗi 5 giây.
 * Khi frozen=true, đồng hồ ngừng cập nhật để bảo vệ IME input.
 */
const Clock = ({ frozen = false }: ClockProps) => {
  const [currentTime, setCurrentTime] = useState<string>(
    () => new Date().toLocaleTimeString('vi-VN')
  );
  const frozenRef = useRef(frozen);
  frozenRef.current = frozen;

  useEffect(() => {
    const updateTime = () => {
      if (!frozenRef.current) {
        setCurrentTime(new Date().toLocaleTimeString('vi-VN'));
      }
    };
    const interval = setInterval(updateTime, 5000);
    return () => clearInterval(interval);
  }, []);

  return <Text color="green">🕐 {currentTime}</Text>;
};

export default React.memo(Clock);