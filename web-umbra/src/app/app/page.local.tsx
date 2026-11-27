import { Suspense } from 'react';
import { LocalApp } from '@/live/local-app';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LocalApp />
    </Suspense>
  );
}
