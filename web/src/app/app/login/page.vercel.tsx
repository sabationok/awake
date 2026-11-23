import { LoginPage } from '@/features/auth/login-page';
import { safeNextPath } from '@/features/redirects/safe-next';

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <LoginPage next={safeNextPath(next)} />;
}
