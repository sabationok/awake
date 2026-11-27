'use client';

import { DevIndicator } from '../vendor/dev-indicator';
import '../vendor/dev-indicator/dev-indicator.css';
import devBuild from '../generated/dev-build.json';
import type { DevBuild } from '../vendor/dev-indicator';

/** Паспорт збірки пише `pnpm gen:dev-build` перед dev / build; у production індикатор нічого не малює. */
export function DevBuildIndicator() {
  return <DevIndicator build={devBuild as DevBuild} defaultMode="floating" defaultStripEdge="bottom" />;
}
