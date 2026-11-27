import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import '../ui/umbra.css';
import '../shell/shell.css';

export const metadata: Metadata = { title: 'MaControl · Umbra', description: 'Демо Web UI MaControl у стилі Umbra. Дії не надсилаються.' };
export const viewport: Viewport = { themeColor: '#000000', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uk" data-backdrop="gradient" suppressHydrationWarning>
      <head>
        {/* До першого малювання: `?theme=light` — пробна світла тема, `?backdrop=off` — без підкладки (порівняти). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var q=new URLSearchParams(location.search),d=document.documentElement;if(q.get('theme')==='light')d.dataset.theme='light';if(q.get('backdrop')==='off')delete d.dataset.backdrop}catch(e){}`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
