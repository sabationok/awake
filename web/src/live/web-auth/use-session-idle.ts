'use client';
import { useEffect } from 'react';

const EVENTS = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const;
/** Продовження сесії в агента не частіше ніж раз на хвилину. */
const TOUCH_EVERY_MS = 60_000;

/**
 * Бездіяльність у вкладці: рух — продовжити сесію (≤ 1/хв), тиша довше за таймаут — вихід.
 * Агент однаково гасить сесію сам, це лише щоб вкладка не лишалась відкритою.
 */
export function useSessionIdle(idleMinutes: number | null, { touch, expire }: { touch: () => void; expire: () => void }) {
  useEffect(() => {
    if (!idleMinutes) return;
    let timer = 0;
    let lastTouch = Date.now();
    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(expire, idleMinutes * 60_000);
    };
    const onActivity = () => {
      arm();
      const now = Date.now();
      if (now - lastTouch > TOUCH_EVERY_MS) {
        lastTouch = now;
        touch();
      }
    };
    arm();
    EVENTS.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      EVENTS.forEach((event) => window.removeEventListener(event, onActivity));
    };
  }, [idleMinutes, touch, expire]);
}
