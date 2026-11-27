import { RootRedirect } from '@/live/redirects/root-redirect';

/** Корінь лише веде в застосунок: UI живе під `/app`, API — під `/api`. */
export default function Page() {
  return <RootRedirect />;
}
