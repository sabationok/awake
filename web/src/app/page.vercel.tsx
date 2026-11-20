import { RemoteDashboardPage } from '@/features/awake/pages/remote-dashboard-page';
import { logout } from '@/server/auth-actions';
import { isPresenceConfigured, readPresence } from '@/server/presence';

export const dynamic = 'force-dynamic';

export default async function Page() {
  return <RemoteDashboardPage initial={await readPresence()} configured={isPresenceConfigured()} logout={logout} />;
}
