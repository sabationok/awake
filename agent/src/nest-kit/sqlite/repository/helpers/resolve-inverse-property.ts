// TEMP nest-kit shim — target: @my-nestjs-kit/sqlite

/** `(session) => session.device` → `'device'`: викликає функцію на Proxy, що запам'ятовує, яке поле прочитали. */
export function resolveInverseProperty(inverse: (entity: any) => unknown): string {
  let property: string | undefined;
  const probe = new Proxy({}, { get: (_target, key) => ((property ??= String(key)), undefined) });
  inverse(probe);
  if (!property) throw new Error('Relation inverse must read a property: (child) => child.parent');
  return property;
}
