interface ServeJson {
  Web?: Record<string, { Handlers?: Record<string, { Proxy?: string }> }>;
}

/** `tailscale serve status --json`: чи веде https:443 (корінь) на http-порт агента. */
export function isServingPort(text: string, port: number): boolean {
  if (!text.trim()) return false;
  const serve = JSON.parse(text) as ServeJson;
  const targets = new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`, `127.0.0.1:${port}`, `localhost:${port}`]);
  return Object.entries(serve.Web ?? {}).some(
    ([host, web]) => host.endsWith(':443') && targets.has((web.Handlers?.['/']?.Proxy ?? '').replace(/\/$/, '')),
  );
}
