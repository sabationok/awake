const pad = (value: number) => String(value).padStart(2, '0');

/** ISO-час → HH:MM у локальному часі Mac; некоректна дата → null. */
export function formatHhmm(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
