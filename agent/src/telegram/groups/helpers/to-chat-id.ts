/** Id чату ядра (текст) → `chat_id` Bot API: числом, бо рядок там означає @username. */
export function toChatId(externalId: string): number | string {
  const id = Number(externalId);
  return Number.isSafeInteger(id) ? id : externalId;
}
