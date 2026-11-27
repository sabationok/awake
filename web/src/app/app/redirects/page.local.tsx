import { Suspense } from 'react';
import { RedirectsPage } from '@/live/redirects/redirects-page';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RedirectsPage />
    </Suspense>
  );
}
