import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { applyStatePatch, defineBind, defineProps, isShown, readStatePath, resolveBind, resolveNodeProps, showUnless, showWhen, type StateMessage } from '../src/state.ts';

const load = (name: string) => JSON.parse(readFileSync(new URL(`../fixtures/state/${name}.json`, import.meta.url), 'utf8')) as StateMessage;

test('patch застосовується без мутації і дає очікувані значення', () => {
  const full = load('full');
  const patch = load('patch');
  assert.equal(full.type, 'state.full');
  assert.equal(patch.type, 'state.patch');
  if (full.type !== 'state.full' || patch.type !== 'state.patch') return;
  assert.equal(patch.rev, full.rev + 1);
  const next = applyStatePatch(full.state, patch.ops);
  assert.equal(readStatePath(next, 'permissions.location'), 'granted');
  assert.equal(readStatePath(next, 'sessions.awake'), null);
  assert.equal(readStatePath(next, 'modules.awake.lowBatteryStop'), false);
  assert.equal(readStatePath(full.state, 'permissions.location'), 'notDetermined');
  assert.equal(next.system, full.state.system, 'незмінені гілки — ті самі обʼєкти');
});

test('resolveBind: мапа, boolean, null і fallback', () => {
  const full = load('full');
  if (full.type !== 'state.full') return;
  const bt = defineBind('switch', 'permissions.bluetooth', {
    granted: 'on', denied: 'off', notDetermined: 'off', restricted: 'disabled', requesting: 'pending',
  }, 'disabled');
  assert.equal(resolveBind(full.state, bt), 'on');
  assert.equal(resolveBind(full.state, defineBind('switch', 'system.muted', { true: 'on', false: 'off' }, 'disabled')), 'off');
  assert.equal(resolveBind(full.state, defineBind('status', 'sessions.sleeper', { null: 'idle' }, 'ok')), 'idle');
  assert.equal(resolveBind(full.state, { component: 'switch', path: 'nope.x', map: {}, fallback: 'disabled' }), 'disabled');
  assert.equal(resolveBind(full.state, { component: 'switch', path: 'system.volume', map: { '40': 'on' }, fallback: 'disabled' }), 'disabled');
});

test('заборонені ключі в патчі відкидаються', () => {
  assert.throws(() => applyStatePatch({}, [{ path: '__proto__.polluted', value: 1 }]), /forbidden/);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
  assert.equal(resolveBind({ a: 'x' }, { component: 'nav', path: 'a', map: { x: 'active' }, fallback: 'inactive' }), 'active');
  assert.equal(resolveBind({ a: 'toString' }, { component: 'nav', path: 'a', map: {}, fallback: 'inactive' }), 'inactive');
});

test('show: when / unless, null і обірваний шлях', () => {
  const full = load('full');
  if (full.type !== 'state.full') return;
  assert.equal(isShown(full.state, showWhen('sessions.awake', 'null')), false);
  assert.equal(isShown(full.state, showUnless('sessions.awake', 'null')), true);
  assert.equal(isShown(full.state, showWhen('sessions.sleeper', 'null')), true);
  assert.equal(isShown(full.state, showWhen('system.sleepBlocked', 'true')), true);
  assert.equal(isShown(full.state, { path: 'nope.x', when: ['true'] }), true);
  assert.equal(isShown(undefined, showWhen('sessions.awake', 'null')), true);
});

test('resolveNodeProps: пропи зі стейту, стан перемикача, без стейту — як є', () => {
  const full = load('full');
  if (full.type !== 'state.full') return;
  const timer = { type: 'timer', value: 'Не спить', until: null as string | null, bind: defineProps<{ until: unknown; from: unknown }>({ until: 'sessions.awake.until', from: 'sessions.awake.startedAt' }) };
  const resolved = resolveNodeProps(timer, full.state) as typeof timer & { from?: string };
  assert.equal(resolved.until, '2026-11-27T21:00:00.000Z');
  assert.equal(resolved.from, '2026-11-27T19:00:00.000Z');
  assert.equal(timer.until, null, 'без мутації');
  assert.equal(resolveNodeProps(timer, undefined), timer);
  const sw = { type: 'switch', value: true, bind: defineBind('switch', 'modules.awake.lowBatteryStop', { true: 'on', false: 'off' }, 'off') };
  assert.equal(resolveNodeProps(sw, applyStatePatch(full.state, [{ path: 'modules.awake.lowBatteryStop', value: false }])).value, false);
  const row = { type: 'row', control: { type: 'switch', value: false }, bind: defineBind('switch', 'system.muted', { true: 'on', false: 'off' }, 'off') };
  assert.deepEqual(resolveNodeProps(row, applyStatePatch(full.state, [{ path: 'system.muted', value: true }])).control, { type: 'switch', value: true });
});
