import { escapeHtml } from '../../common/escape-html';

/** Той самий вигляд, що й у сповіщень скрипта: хост, заголовок і поля події в <pre>. `body` — звичайний текст між заголовком і полями (список змін). */
export function formatEventMessage(host: string, title: string, fields: Record<string, string | number>, body?: string): string {
  const text = body ? `\n${escapeHtml(body)}` : '';
  return `💻 <b>${escapeHtml(host)}</b>\n${escapeHtml(title)}${text}\n<pre>${escapeHtml(JSON.stringify(fields, null, 2))}</pre>`;
}
