import Link from 'next/link';
import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';
import { GlitchTitle } from '@/components/motion/glitch-title';

export const metadata: Metadata = { title: 'Connexion' };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  return (
    <div className="container grid min-h-[80vh] place-items-center py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <GlitchTitle as="h1" text="Connexion" className="text-4xl font-bold" />
          <p className="mt-3 text-sm text-muted-foreground">
            Pas encore de compte ?{' '}
            <Link
              href={
                searchParams.next
                  ? `/register?next=${encodeURIComponent(searchParams.next)}`
                  : '/register'
              }
              className="font-semibold text-rage-orange hover:underline"
            >
              Crée-le en une minute
            </Link>
          </p>
        </div>
        <LoginForm next={searchParams.next} />
      </div>
    </div>
  );
}
