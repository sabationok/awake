// Перевірка типів bind: `tsc -p contracts`. Кожен @ts-expect-error мусить бути помилкою.
import { defineBind, defineValueBind } from '../src/state.ts';

defineBind('switch', 'permissions.bluetooth', {
  granted: 'on', denied: 'off', notDetermined: 'off', restricted: 'disabled', requesting: 'pending',
}, 'disabled');

// @ts-expect-error — пропущено 'requesting': мапа мусить покрити кожне значення
defineBind('switch', 'permissions.bluetooth', { granted: 'on', denied: 'off', notDetermined: 'off', restricted: 'off' }, 'off');

// @ts-expect-error — 'active' не стан switch
defineBind('switch', 'permissions.location', { granted: 'active', denied: 'off', notDetermined: 'off', restricted: 'off', requesting: 'pending' }, 'off');

// @ts-expect-error — шляху немає в AppState
defineBind('status', 'permissions.camera', {}, 'idle');

defineBind('switch', 'system.muted', { true: 'on', false: 'off' }, 'disabled');
defineBind('status', 'sessions.awake', { null: 'idle' }, 'ok');
defineBind('switch', 'modules.awake.lowBatteryStop', { true: 'on', false: 'off' }, 'disabled');
defineBind('status', 'permissions.system.thermalRead', { granted: 'ok', missing: 'warn' }, 'idle');

defineValueBind('system.volume');
// @ts-expect-error — шляху немає
defineValueBind('system.fanSpeed');
