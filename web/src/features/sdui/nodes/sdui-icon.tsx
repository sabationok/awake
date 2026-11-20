import type { UiIcon } from '@awake/contracts';
import { SymbolIcon } from '@/components/symbol-icon';
import { resolveSymbolIcon } from '../lib/symbol-icon-map';

/** Іконка ноди: кольоровий квадрат з гліфом; без іконки нічого не малює. large — велика плитка головного рядка. */
export function SduiIcon({ icon, large = false }: { icon?: UiIcon; large?: boolean }) {
  if (!icon) return null;
  const Glyph = resolveSymbolIcon(icon.symbol);
  return (
    <SymbolIcon tone={icon.tone} size={large ? 'lg' : 'sm'}>
      <Glyph size={large ? 20 : 16} />
    </SymbolIcon>
  );
}
