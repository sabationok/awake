'use client';
import { Suspense } from 'react';
import { SduiPage } from '@/features/sdui/pages/sdui-page';
import { useHybridTree } from '@/features/sdui/hooks/use-hybrid-tree';
import { logout } from '@/server/auth-actions';
import { useIdleLogout } from '@/features/auth/use-idle-logout';

/** Дашборд на Vercel: дерево з Upstash, а з довіреної Wi-Fi — напряму з Mac; вихід у шапці. */
function VercelDashboard() {
  const { tree, send, mode, directError } = useHybridTree();
  useIdleLogout();
  return (
    <SduiPage
      tree={tree}
      send={send}
      mode={mode}
      directError={directError}
      accessory={
        <form action={logout}>
          <button type="submit" className="pb-1.5 text-[15px] text-accent">
            Вийти
          </button>
        </form>
      }
    />
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <VercelDashboard />
    </Suspense>
  );
}
