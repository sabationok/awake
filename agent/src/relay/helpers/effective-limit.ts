/** Значення поля з `relay:limits:effective` за ключем select-а: `limits.viewerSend.queueSize` → effective.viewerSend.queueSize. */
export function effectiveLimit(effective: Record<string, unknown> | null, settingKey: string): string | null {
  if (!effective) return null;
  const value = settingKey
    .split('.')
    .slice(1)
    .reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), effective);
  return typeof value === 'number' || typeof value === 'string' ? String(value) : null;
}
