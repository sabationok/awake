import { Suspense } from 'react';
import { TailnetPairingPage } from '@/features/pairing/tailnet-pairing-page';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <TailnetPairingPage />
    </Suspense>
  );
}
