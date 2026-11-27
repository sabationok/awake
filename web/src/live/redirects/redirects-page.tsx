'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SoloPage, StatusPage } from '@/shell/solo-page';
import { STEP_PATH, resolveRedirect } from './redirect-flows';

/**
 * `/app/redirects/?type=…&action=…` у статичній збірці: 302 зробити нікому, тож крок → сторінку перекладає клієнт
 * за тією ж мапою, що й web. `replace`, щоб код із QR не лишився в історії.
 */
export function RedirectsPage() {
  const router = useRouter();
  const query = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const result = resolveRedirect(new URLSearchParams(query.toString()));
    if (!result.ok) return setError(result.error);
    router.replace(`${STEP_PATH[result.step]}?${new URLSearchParams(result.params)}`);
  }, [query, router]);

  if (!error) return <SoloPage />;
  return <StatusPage label="Неправильне посилання" value={error} footer="Посилання пошкоджене або застаріле. Відскануй новий QR у MaControl на Mac." />;
}
