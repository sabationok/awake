import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import '../ui/umbra.css';
import '../shell/shell.css';

export const metadata: Metadata = { title: 'MaControl · Umbra', description: 'Демо Web UI MaControl у стилі Umbra. Дії не надсилаються.' };
export const viewport: Viewport = { themeColor: '#000000', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <head>
        {/* Пробна світла тема: `?theme=light` ставить data-theme до першого малювання, без спалаху темного. */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(new URLSearchParams(location.search).get('theme')==='light')document.documentElement.dataset.theme='light'}catch(e){}` }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
