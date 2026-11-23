'use client';
import type { ReactNode } from 'react';
import type { UiTree } from '@awake/contracts';
import { AppShell } from '../components/app-shell';
import type { SduiEventHandler, SduiMode } from '../sdui.types';

interface SduiPageProps {
  tree: UiTree | null;
  /** Без send дерево лише для перегляду. */
  send?: SduiEventHandler;
  /** Web UI на Vercel: режим зв'язку з Mac для шапки. На локальному Web UI не задається. */
  mode?: SduiMode;
  directError?: boolean;
  accessory?: ReactNode;
}

/** Сторінка, яку малює дерево: його дає хук джерела (локальний агент або гібрид Upstash/Mac). */
export function SduiPage({ tree, send, mode, directError, accessory }: SduiPageProps) {
  return <AppShell tree={tree} send={send} mode={mode} directError={directError} accessory={accessory} />;
}
