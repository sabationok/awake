'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Group } from '@/components/group';
import { KeyValueRow } from '@/components/key-value-row';
import { PageFrame } from '@/components/page-frame';
import { STEP_PATH, resolveRedirect } from './redirect-flows';

/**
 * `/redirects?type=…&action=…` у статичній збірці: 302 зробити нікому, тож крок → сторінку перекладає клієнт
 * за тією ж мапою, що й серверний роут на Vercel. `replace`, щоб код із QR не лишився в історії.
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

  return (
    <PageFrame title="MaControl">
      {error && (
        <Group footer="Посилання пошкоджене або застаріле. Відскануй новий QR у MaControl на Mac.">
          <KeyValueRow label="Неправильне посилання" value={error} />
        </Group>
      )}
    </PageFrame>
  );
}
