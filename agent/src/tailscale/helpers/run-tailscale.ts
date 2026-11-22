import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { TAILSCALE_CLI_PATHS, TAILSCALE_CLI_TIMEOUT_MS } from '../constants/tailscale-settings';

/** Шлях до CLI Tailscale або null, якщо його немає. */
export function findTailscaleCli(): string | null {
  return TAILSCALE_CLI_PATHS.find((path) => existsSync(path)) ?? null;
}

/** Запускає CLI без shell (аргументи не інтерпретуються) і віддає stdout. */
export function runTailscale(cli: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cli, args, { timeout: TAILSCALE_CLI_TIMEOUT_MS }, (error, stdout, stderr) => {
      if (error) reject(new Error((stderr || error.message).trim().split('\n')[0]));
      else resolve(stdout);
    });
  });
}
