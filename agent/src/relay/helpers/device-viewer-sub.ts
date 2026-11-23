/** `sub` квитка viewer-а для сполученого пристрою: `device:<id>`. Квитки Web UI з паролем мають `dashboard`. */
const PREFIX = 'device:';

export const deviceViewerSub = (deviceId: number) => `${PREFIX}${deviceId}`;

/** id пристрою з `sub` або null, якщо квиток не пристрою. */
export function parseDeviceViewerSub(sub: string): number | null {
  if (!sub.startsWith(PREFIX)) return null;
  const id = Number(sub.slice(PREFIX.length));
  return Number.isInteger(id) && id > 0 ? id : null;
}
