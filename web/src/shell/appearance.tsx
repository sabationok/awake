'use client';

import { useEffect, useState } from 'react';
import { Segmented } from '@/ui/primitives';

/**
 * Тема — налаштування цього клієнта, сервер про неї не знає (власник вирішив 2026-11-27: окремо в кожному клієнті).
 * Значення лежить у localStorage; до першого малювання його ставить THEME_BOOT_SCRIPT (theme-boot.ts) у layout.tsx.
 */
import { DEFAULT_THEME, THEME_COLOR, THEME_KEY, type ThemeChoice } from './theme-boot';

const OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'Системна' },
  { value: 'light', label: 'Світла' },
  { value: 'dark', label: 'Темна' },
];

function readChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'system' || saved === 'light' || saved === 'dark' ? saved : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function applyTheme(choice: ThemeChoice) {
  const resolved = choice === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : choice;
  document.documentElement.dataset.theme = resolved;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', THEME_COLOR[resolved]);
}

function useThemeChoice() {
  const [choice, setChoice] = useState<ThemeChoice>(DEFAULT_THEME);
  useEffect(() => setChoice(readChoice()), []);
  useEffect(() => {
    if (choice !== 'system') return;
    const media = matchMedia('(prefers-color-scheme: light)');
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [choice]);
  const change = (next: ThemeChoice) => {
    setChoice(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
    applyTheme(next);
  };
  return [choice, change] as const;
}

/** Секція «Вигляд» першою на сторінці «Налаштування»: розмітка та сама, що в серверних секцій (u-section / u-row). */
export function AppearanceSection() {
  const [choice, change] = useThemeChoice();
  return (
    <section className="u-section">
      <div className="u-section-head">
        <h3>Вигляд</h3>
      </div>
      <div className="u-panel">
        <div className="u-row">
          <div className="u-row-text">
            <span className="u-row-label">Тема</span>
          </div>
          <div className="u-row-control">
            <Segmented value={choice} options={OPTIONS} onChange={(next) => change(next as ThemeChoice)} />
          </div>
        </div>
      </div>
    </section>
  );
}
