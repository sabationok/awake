import { notFound } from 'next/navigation';
import { SpecPreview } from '@/features/sdui/fixtures/spec-preview';

/** Прев'ю компонентів спеки для розробника; у production сторінки немає. */
export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <SpecPreview />;
}
