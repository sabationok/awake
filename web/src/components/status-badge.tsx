import type { SymbolTone } from './symbol-icon';
import { StatusDot } from './status-dot';

/**
 * @ui StatusBadge
 * @spec Стан словом з крапкою: «● Активна», «● Підключено». Один рядок, без переносу.
 * @keywords status, badge, state, dot, label
 */
export function StatusBadge({ label, tone, pulse = false }: { label: string; tone: SymbolTone; pulse?: boolean }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[13px] text-secondary">
      <StatusDot tone={tone} pulse={pulse} />
      {label}
    </span>
  );
}
