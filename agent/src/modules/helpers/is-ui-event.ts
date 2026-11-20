import type { UiEvent } from '@awake/contracts';

type Plain = Record<string, unknown>;

const isObject = (value: unknown): value is Plain =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isPrimitive = (value: unknown): value is string | number | boolean =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

/** Перевіряє форму події з дашборду; саме значення перевіряє модуль за описом налаштування. */
export function isUiEvent(body: unknown): body is UiEvent {
  if (!isObject(body)) return false;
  if (body.type === 'action') {
    const action = body.action;
    return (
      isObject(action) &&
      typeof action.module === 'string' &&
      typeof action.name === 'string' &&
      (action.params === undefined || (isObject(action.params) && Object.values(action.params).every(isPrimitive)))
    );
  }
  if (body.type === 'setting') {
    const change = body.change;
    return (
      isObject(change) &&
      typeof change.module === 'string' &&
      typeof change.key === 'string' &&
      isPrimitive(change.value)
    );
  }
  return false;
}
