/**
 * Звідки прийшла дія модуля: транспорт агента. `web` — Web UI, напряму (LAN) чи через проксі
 * (webhooxy, далі, може, Cloudflare): проксі — це не окреме джерело, а шлях до `web`, він іде окремим полем.
 */
export type ModuleSource = 'mac' | 'telegram' | 'web';
