import type { UiQr } from '@awake/contracts';
import type { NodeProps } from '../sdui.types';

/**
 * QR сполучення шлеться лише в дерево Mac-аппки (scope mac): одноразовий код з Mac не виходить. У web вузол сюди не
 * доходить; якщо дійде, нічого не малюємо, щоб код не показався на іншому пристрої.
 */
export function QrNode(_props: NodeProps<UiQr>) {
  return null;
}
