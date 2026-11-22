interface StatusJson {
  BackendState?: string;
  Self?: { DNSName?: string; UserID?: number };
  User?: Record<string, { LoginName?: string }>;
}

/** `tailscale status --json` → чи Mac у tailnet, його ім'я і логін власника. */
export function parseTailscaleStatus(text: string): { running: boolean; dnsName: string | null; login: string | null } {
  const status = JSON.parse(text) as StatusJson;
  const dnsName = status.Self?.DNSName?.replace(/\.$/, '') || null;
  const userId = status.Self?.UserID;
  const login = userId !== undefined ? (status.User?.[String(userId)]?.LoginName ?? null) : null;
  return { running: status.BackendState === 'Running', dnsName, login };
}
