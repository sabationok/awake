import { escapeHtml } from '../../common/escape-html';

/** Той самий вигляд, що й у сповіщень скрипта: хост, заголовок і поля події в <pre>. */
export function formatEventMessage(host: string, title: string, fields: Record<string, string | number>): string {
  return `💻 <b>${escapeHtml(host)}</b>\n${escapeHtml(title)}\n<pre>${escapeHtml(JSON.stringify(fields, null, 2))}</pre>`;
}
