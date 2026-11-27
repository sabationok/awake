import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import '../ui/umbra.css';
import '../shell/shell.css';
import { DevBuildIndicator } from '../shell/dev-build-indicator';
import { THEME_BOOT_SCRIPT } from '../shell/theme-boot';

export const metadata: Metadata = {
  title: 'MaControl · Umbra',
  description: 'Демо Web UI MaControl у стилі Umbra. Дії не надсилаються.',
  // iOS: контент заходить під статус-бар, тож підкладка видна до самого верху (відступи — safe-area у shell.css).
  appleWebApp: { capable: true, title: 'MaControl', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icon-192.png', apple: '/apple-touch-icon.png' },
};
// Колір смуги браузера = низ підкладки; світла тема перемикає його (shell/appearance.tsx).
export const viewport: Viewport = { themeColor: '#060403', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uk" data-theme="dark" data-backdrop="gradient" suppressHydrationWarning>
      <head>
        {/* До першого малювання: збережена тема клієнта; `?theme=light|dark|system` перекриває, `?backdrop=off` — без підкладки. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <DevBuildIndicator />
      </body>
    </html>
  );
}
