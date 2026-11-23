import { redirect } from 'next/navigation';
import { STEP_PATH } from '@/features/redirects/redirect-flows';

/** Корінь лише веде в застосунок: UI живе під `/app`, API — під `/api`. */
export default function Page() {
  redirect(STEP_PATH.dashboard);
}
