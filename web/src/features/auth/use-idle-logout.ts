'use client';
import { useEffect } from 'react';
import { logout, touchSession } from '@/server/auth-actions';

const EVENTS = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const;
/** Продовження сесії на сервері не частіше ніж раз на хвилину. */
const TOUCH_EVERY_MS = 60_000;

/** Читає обраний у логіні таймаут з не-httpOnly куки; без неї таймауту немає (сервер все одно гасить сесію). */
function readIdleMinutes(): number | null {
  const match = document.cookie.match(/(?:^|;\s*)awake_idle=(\d+)/);
  return match ? Number(match[1]) : null;
}

/** Бездіяльність у вкладці: користувач рухає мишею/клавішами — сесія продовжується; тиша довше за таймаут — вихід. */
export function useIdleLogout() {
  useEffect(() => {
    const minutes = readIdleMinutes();
    if (!minutes) return;
    let timer = 0;
    let lastTouch = 0;
    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void logout(), minutes * 60_000);
    };
    const onActivity = () => {
      arm();
      const now = Date.now();
      if (now - lastTouch > TOUCH_EVERY_MS) {
        lastTouch = now;
        void touchSession();
      }
    };
    arm();
    EVENTS.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      EVENTS.forEach((event) => window.removeEventListener(event, onActivity));
    };
  }, []);
}
