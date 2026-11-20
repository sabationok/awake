'use client';
import { Suspense } from 'react';
import { SduiPage } from '@/features/sdui/pages/sdui-page';
import { remoteSource } from '@/features/sdui/sources/remote-source';
import { logout } from '@/server/auth-actions';

/** Дашборд на Vercel: дерево з Upstash через серверні екшени, вихід у шапці. */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <SduiPage
        source={remoteSource}
        accessory={
          <form action={logout}>
            <button type="submit" className="pb-1.5 text-[15px] text-accent">
              Вийти
            </button>
          </form>
        }
      />
    </Suspense>
  );
}
