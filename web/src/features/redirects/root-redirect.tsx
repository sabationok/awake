'use client';
import { useEffect } from 'react';
import { STEP_PATH } from './redirect-flows';

/**
 * Статична збірка: 302 зробити нікому. Переходимо в `/app`, зберігаючи query і hash — старі LAN-посилання з QR
 * несуть код у `#p=`, і він має дійти до сторінки.
 */
export function RootRedirect() {
  useEffect(() => {
    location.replace(`${STEP_PATH.dashboard}/${location.search}${location.hash}`);
  }, []);
  return null;
}
