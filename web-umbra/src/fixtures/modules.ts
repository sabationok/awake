import type { UiModuleInfo } from '@awake/contracts';

/** Модулі бічного меню в порядку `ModulesService.list()` (порядок реєстрації, без збереженого `moduleOrder`). */
export const FIXTURE_MODULES: UiModuleInfo[] = [
  { id: 'awake', title: 'Awake', icon: { symbol: 'cup.and.saucer.fill', tone: 'orange' }, permissions: ['sleepControl', 'thermalRead'] },
  { id: 'sleep', title: 'Sleeper', icon: { symbol: 'moon.zzz.fill', tone: 'indigo' }, permissions: [] },
  { id: 'keepers', title: 'Keepers', icon: { symbol: 'hand.raised.fill', tone: 'orange' }, permissions: [] },
  { id: 'media', title: 'Екран і звук', icon: { symbol: 'speaker.wave.2.fill', tone: 'indigo' }, permissions: [] },
  { id: 'system', title: 'Стан Mac', icon: { symbol: 'waveform.path.ecg', tone: 'green' }, permissions: ['thermalRead'] },
  { id: 'telegram', title: 'Telegram', icon: { symbol: 'paperplane.fill', tone: 'accent' }, permissions: [] },
  { id: 'groups', title: 'Групи', icon: { symbol: 'person.3.fill', tone: 'accent' }, permissions: [], parent: 'telegram' },
  { id: 'bot', title: 'Агент', icon: { symbol: 'cpu.fill', tone: 'accent' }, permissions: [] },
  { id: 'webui', title: 'Web UI', icon: { symbol: 'globe', tone: 'indigo' }, permissions: [] },
  { id: 'relay', title: 'Webhooxy', icon: { symbol: 'antenna.radiowaves.left.and.right', tone: 'accent' }, permissions: [] },
  { id: 'tailscale', title: 'Tailscale', icon: { symbol: 'point.3.connected.trianglepath.dotted', tone: 'accent' }, permissions: [] },
  { id: 'proximity', title: 'Поруч', icon: { symbol: 'iphone.radiowaves.left.and.right', tone: 'indigo' }, permissions: [] },
  { id: 'permissions', title: 'Дозволи', icon: { symbol: 'lock.fill', tone: 'accent' }, permissions: [] },
];
