'use client';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'sidebar.folded';

function read(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown;
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

/** Згорнуті модулі меню (за id сторінки), як `adaptiveSidebar.folded` в аппці. За замовчуванням усе розгорнуто. */
export function useFoldedNodes() {
  const [folded, setFolded] = useState<string[]>([]);
  useEffect(() => setFolded(read()), []);

  const toggle = useCallback((id: string) => {
    setFolded((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Приватний режим: пам'ятаємо лише до перезавантаження.
      }
      return next;
    });
  }, []);

  return { isFolded: (id: string) => folded.includes(id), toggle };
}
