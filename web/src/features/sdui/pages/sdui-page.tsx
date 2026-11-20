'use client';
import type { ReactNode } from 'react';
import { AppShell } from '../components/app-shell';
import { useUiTree } from '../hooks/use-ui-tree';
import type { UiSource } from '../sources/ui-source';

interface SduiPageProps {
  source: UiSource;
  accessory?: ReactNode;
}

/** Сторінка, яку малює дерево з джерела: локальний агент або Upstash через серверні екшени. */
export function SduiPage({ source, accessory }: SduiPageProps) {
  const { tree, send, readOnly } = useUiTree(source);
  return <AppShell tree={tree} send={send} readOnly={readOnly} accessory={accessory} />;
}
