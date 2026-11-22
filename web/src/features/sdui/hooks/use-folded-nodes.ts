'use client';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'sidebar.expanded';

function read(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown;
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

/** Розгорнуті модулі меню (за id сторінки), як `adaptiveSidebar.expanded` в аппці. За замовчуванням усе згорнуто. */
export function useFoldedNodes() {
  const [expanded, setExpanded] = useState<string[]>([]);
  useEffect(() => setExpanded(read()), []);

  const toggle = useCallback((id: string) => {
    setExpanded((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Приватний режим: пам'ятаємо лише до перезавантаження.
      }
      return next;
    });
  }, []);

  return { isFolded: (id: string) => !expanded.includes(id), toggle };
}
