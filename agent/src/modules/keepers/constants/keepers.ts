/** Id модуля і його сторінки. */
export const KEEPERS_MODULE = 'keepers';

/** Як часто питати macOS, хто тримає Mac без сну. */
export const KEEPERS_POLL_MS = 15_000;

/** Скільки чекати відповіді `pmset`. */
export const KEEPERS_PMSET_TIMEOUT_MS = 5_000;

export const KEEPERS_PMSET_PATH = '/usr/bin/pmset';

/** Типи утримань, що не дають заснути системі або екрану. Інші (фонові задачі, мережа) сну не тримають. */
export const KEEPER_SYSTEM_TYPES: readonly string[] = ['PreventUserIdleSystemSleep', 'NoIdleSleepAssertion', 'PreventSystemSleep'];
export const KEEPER_DISPLAY_TYPES: readonly string[] = ['PreventUserIdleDisplaySleep', 'NoDisplaySleepAssertion'];
