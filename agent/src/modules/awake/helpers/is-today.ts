/** Чи припадає ISO-час на сьогоднішній день у локальній зоні Mac. */
export function isToday(iso: string, now: Date): boolean {
  const date = new Date(iso);
  return (
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
  );
}
