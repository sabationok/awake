import { Suspense } from 'react';
import { TailnetPairingPage } from '@/live/pairing/tailnet-pairing-page';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <TailnetPairingPage />
    </Suspense>
  );
}
