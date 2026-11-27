import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { applyStatePatch, defineBind, readStatePath, resolveBind, type StateMessage } from '../src/state.ts';

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
