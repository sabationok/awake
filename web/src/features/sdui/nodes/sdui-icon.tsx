import type { UiIcon } from '@awake/contracts';
import { SymbolIcon } from '@/components/symbol-icon';
import { resolveSymbolIcon } from '../lib/symbol-icon-map';

/** Іконка ноди: кольоровий квадрат з гліфом; без іконки нічого не малює. */
export function SduiIcon({ icon }: { icon?: UiIcon }) {
  if (!icon) return null;
  const Glyph = resolveSymbolIcon(icon.symbol);
  return (
    <SymbolIcon tone={icon.tone}>
      <Glyph size={16} />
    </SymbolIcon>
  );
}
