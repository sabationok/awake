import { isLinkHref } from '@macontrol/contracts';
import type { UiLinkButton } from '@macontrol/contracts';

/**
 * Кнопка-посилання (`UiLinkButton`). Адресу вирішує лише сервер; не `http(s)` (або зламана) — кнопки немає (null),
 * клієнт такої не отримає.
 */
export function linkButton(id: string, label: string, href: string | null): UiLinkButton | null {
  if (!href || !isLinkHref(href)) return null;
  return { id, label, href, variant: 'plain' };
}
