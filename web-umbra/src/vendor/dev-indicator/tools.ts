import { useSyncExternalStore } from 'react';

export interface DevTool {
  id: string;
  title: string;
  /** A short glyph or emoji shown before the title. */
  icon?: string;
  run: () => void | Promise<void>;
}

let tools: readonly DevTool[] = [];
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

/** Registering an id that already exists replaces that tool. Returns an unregister function. */
export function registerDevTool(tool: DevTool): () => void {
  const i = tools.findIndex((t) => t.id === tool.id);
  tools = i >= 0 ? tools.map((t, j) => (j === i ? tool : t)) : [...tools, tool];
  emit();
  return () => {
    // Compare by identity: if this id was re-registered, the old unregister must not remove the new tool.
    if (!tools.includes(tool)) return;
    tools = tools.filter((t) => t !== tool);
    emit();
  };
}

export function getDevTools(): readonly DevTool[] {
  return tools;
}

export function subscribeDevTools(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useDevTools(): readonly DevTool[] {
  return useSyncExternalStore(subscribeDevTools, getDevTools, getDevTools);
}
