import type { ProximityReport } from '@awake/contracts';

const STATES = new Set(['on', 'off', 'unauthorized', 'unsupported', 'unknown']);

/** Рядок від аппки має правильну форму: стан Bluetooth і список пристроїв з id, назвою й числовим RSSI. */
export function isProximityReport(value: unknown): value is ProximityReport {
  const report = value as ProximityReport | null;
  return (
    typeof report === 'object' &&
    report !== null &&
    STATES.has(report.bluetooth) &&
    Array.isArray(report.devices) &&
    report.devices.every(
      (device) => typeof device?.id === 'string' && typeof device.name === 'string' && Number.isFinite(device.rssi),
    )
  );
}
