/** Час HH:MM у локальній зоні Mac. */
export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
}
