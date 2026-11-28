import type { MacState, UiNode, UiPage, UiRow } from '@macontrol/contracts';

/** Сторінка «Екран і звук»: гучність, вимкнення звуку і яскравість вбудованого дисплея. */
export function buildMediaPage(mac: MacState | null): UiPage {
  const children: UiNode[] = [
    { id: 'sound', type: 'section', title: 'Звук', children: [volumeRow(mac), muteRow(mac)] },
    {
      id: 'display',
      type: 'section',
      title: 'Екран',
      footer: 'Лише вбудований дисплей. Коли кришку закрито, яскравість не змінити.',
      children: [brightnessRow(mac)],
    },
  ];
  return {
    id: 'media',
    module: 'media',
    title: 'Екран і звук',
    icon: { symbol: 'speaker.wave.2.fill', tone: 'indigo' },
    group: 'modules',
    children,
  };
}

function volumeRow(mac: MacState | null): UiRow {
  const volume = mac?.volume ?? null;
  return {
    id: 'volume',
    type: 'row',
    label: 'Гучність',
    value: volume === null ? '—' : `${volume}%`,
    icon: { symbol: mac?.muted ? 'speaker.slash.fill' : 'speaker.wave.2.fill', tone: 'indigo' },
    control: {
      type: 'slider',
      value: volume ?? 0,
      min: 0,
      max: 100,
      step: 5,
      disabled: volume === null,
      action: { module: 'media', name: 'volume' },
    },
  };
}

function muteRow(mac: MacState | null): UiRow {
  return {
    id: 'mute',
    type: 'row',
    label: 'Без звуку',
    icon: { symbol: 'speaker.slash.fill', tone: 'gray' },
    control: {
      type: 'switch',
      value: mac?.muted ?? false,
      disabled: mac?.volume == null,
      on: { module: 'media', name: 'mute', params: { value: true } },
      off: { module: 'media', name: 'mute', params: { value: false } },
    },
  };
}

function brightnessRow(mac: MacState | null): UiRow {
  const brightness = mac?.brightness ?? null;
  return {
    id: 'brightness',
    type: 'row',
    label: 'Яскравість',
    value: brightness === null ? '—' : `${brightness}%`,
    icon: { symbol: 'sun.max.fill', tone: 'yellow' },
    control: {
      type: 'slider',
      value: brightness ?? 0,
      min: 0,
      max: 100,
      step: 5,
      disabled: brightness === null,
      action: { module: 'media', name: 'brightness' },
    },
  };
}
