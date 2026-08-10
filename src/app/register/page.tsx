import Link from 'next/link';
import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/register-form';
import { GlitchTitle } from '@/components/motion/glitch-title';

export const metadata: Metadata = { title: 'Créer un compte' };

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  return (
    <div className="container py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <GlitchTitle as="h1" text="Créer un compte" className="text-4xl font-bold" />
          <p className="mt-3 text-sm text-muted-foreground">
            Déjà inscrit ?{' '}
            <Link
              href={
                searchParams.next
                  ? `/login?next=${encodeURIComponent(searchParams.next)}`
                  : '/login'
              }
              className="font-semibold text-rage-orange hover:underline"
            >
              Connecte-toi
            </Link>
          </p>
        </div>
        <RegisterForm next={searchParams.next} />
      </div>
    </div>
  );
}
