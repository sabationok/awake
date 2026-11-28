import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

/**
 * Встановлюваний Web UI. `window-controls-overlay` (Chrome / Edge на desktop) прибирає системну смугу заголовка:
 * сторінка малюється до верху вікна, кнопки вікна лежать поверх шапки, а підкладка видна і під ними.
 * Де overlay нема (Safari, мобільні), лишається `standalone`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MaControl',
    short_name: 'MaControl',
    description: 'Стан і керування Mac',
    // Локально UI живе під `/app` (корінь лише переводить туди); на Vercel — у корені.
    start_url: process.env.NEXT_PUBLIC_BUILD_TARGET === 'local' ? '/app' : '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    background_color: '#060403',
    theme_color: '#060403',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
