/** Час HH:MM:SS у локальній зоні Mac: для рядка «Виконано» над меню бота. */
export function formatClockSeconds(date: Date): string {
  return date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
