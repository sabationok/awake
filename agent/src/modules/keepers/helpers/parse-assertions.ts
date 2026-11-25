import { KEEPER_DISPLAY_TYPES, KEEPER_SYSTEM_TYPES } from '../constants/keepers';
import type { Keeper } from '../types/keeper.types';

/** Рядок `pmset -g assertions`: `pid 4529(Claude): [0x0002…] 22:38:35 NoIdleSleepAssertion named: "Electron"`. */
const LINE = /^\s*pid (\d+)\(([^)]*)\): \[(0x[0-9a-f]+)\] (\d+):(\d\d):(\d\d) (\w+) named: "(.*?)"/i;

/** Утримання, що не дають заснути, з виводу `pmset -g assertions`. `now` — момент читання. */
export function parseAssertions(output: string, now: number): Keeper[] {
  const keepers: Keeper[] = [];
  for (const line of output.split('\n')) {
    const match = LINE.exec(line);
    if (!match) continue;
    const [, pid, process, id, hours, minutes, seconds, type, reason] = match;
    const kind = KEEPER_DISPLAY_TYPES.includes(type) ? 'display' : KEEPER_SYSTEM_TYPES.includes(type) ? 'system' : null;
    if (kind === null) continue;
    const heldMs = (Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds)) * 1000;
    keepers.push({ id, pid: Number(pid), process, kind, reason, since: new Date(now - heldMs).toISOString() });
  }
  return keepers;
}
