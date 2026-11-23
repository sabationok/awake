import { Suspense } from 'react';
import { RedirectsPage } from '@/features/redirects/redirects-page';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RedirectsPage />
    </Suspense>
  );
}
