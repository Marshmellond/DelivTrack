'use client';

import { useEffect, useState, useRef } from 'react';

export default function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
}: {
  value: number;
  prefix?: string;
  suffix?: string;
}) {
  const safeValue = isNaN(value) || !isFinite(value) ? 0 : value;
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const target = safeValue;
    const duration = 800;
    const startTime = Date.now();
    const startVal = display;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startVal + (target - startVal) * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeValue]);

  return (
    <span className="stat-number">
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}
