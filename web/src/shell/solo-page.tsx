'use client';
import { Power } from 'lucide-react';
import type { ReactNode } from 'react';
import { Panel, Row, Section } from '@/ui/primitives';

/**
 * Сторінка без інтерфейсу сервера (вхід, сполучення, «сервер недоступний»): назва аппки і вузька колонка по центру,
 * у тих самих токенах і підкладці, що й Shell.
 */
export function SoloPage({ children }: { children?: ReactNode }) {
  return (
    <div className="s-solo">
      <header className="s-solo-head">
        <span className="s-host-icon">
          <Power />
        </span>
        <b>MaControl</b>
      </header>
      <main className="s-solo-body">{children}</main>
    </div>
  );
}

/** Стан замість інтерфейсу сервера: один рядок із назвою стану і пояснення під ним; праворуч — дія, якщо є. */
export function StatusPage({ label, footer, value, action }: { label: string; footer?: string; value?: string; action?: ReactNode }) {
  return (
    <SoloPage>
      <Section footer={footer} trailing={action}>
        <Panel>
          <Row label={label} value={value} />
        </Panel>
      </Section>
    </SoloPage>
  );
}
