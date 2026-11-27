import { LoginPage } from '@/features/auth/login-page';
import { safeNextPath } from '@/features/redirects/safe-next';
import { PREVIEW_PASSWORD } from '@/server/preview-access';
import { isPreviewStage } from '@/server/stage';

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  // Preview: сервер приймає лише тестовий пароль, тож форма підставляє його сама.
  return <LoginPage next={safeNextPath(next)} previewPassword={isPreviewStage() ? PREVIEW_PASSWORD : undefined} />;
}
