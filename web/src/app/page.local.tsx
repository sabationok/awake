import { Suspense } from 'react';
import { LocalSduiPage } from '@/features/sdui/pages/local-sdui-page';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LocalSduiPage />
    </Suspense>
  );
}
