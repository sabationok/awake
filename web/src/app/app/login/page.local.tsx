import { Suspense } from 'react';
import { LoginFormPage } from '@/features/web-auth/login-form-page';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginFormPage />
    </Suspense>
  );
}
