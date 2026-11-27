import { Suspense } from 'react';
import { LoginFormPage } from '@/live/web-auth/login-form-page';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginFormPage />
    </Suspense>
  );
}
