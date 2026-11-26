const UNIT_SECONDS: Record<string, number> = { m: 60, h: 3600, d: 86400 };

/** `30m`, `2h`, `1d` → секунди; інше → null. */
export function durationSeconds(duration: string): number | null {
  const match = /^(\d+)([mhd])$/.exec(duration.toLowerCase());
  if (!match) return null;
  const count = Number(match[1]);
  return count > 0 ? count * UNIT_SECONDS[match[2]] : null;
}
