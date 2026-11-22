/** value / status стають ключами JSON: рядок без керівних символів, обрізаний; порожнє — відкинути клітинку (правило 7). */
export function normalizeStatKey(raw: unknown, max: number): string | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const text = (typeof raw === 'object' ? JSON.stringify(raw) : String(raw)).replace(/[\u0000-\u001f]/g, ' ').trim();
  return text ? text.slice(0, max) : null;
}
