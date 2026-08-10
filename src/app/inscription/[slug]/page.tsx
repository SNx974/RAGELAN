import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { totalDueCents, shareAmountCents } from '@/lib/pricing';
import { SoloRegistrationForm } from '@/components/registration/solo-registration-form';
import { TeamRegistrationForm } from '@/components/registration/team-registration-form';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const t = await prisma.tournament.findUnique({
    where: { slug: params.slug },
    select: { name: true },
  });
  return { title: t ? `Inscription — ${t.name}` : 'Inscription' };
}

export default async function RegistrationPage({ params }: { params: { slug: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/inscription/${params.slug}`);

  const tournament = await prisma.tournament.findUnique({
    where: { slug: params.slug },
    include: {
      _count: {
        select: {
          registrations: { where: { status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] } } },
        },
      },
    },
  });
  if (!tournament) notFound();

  const settings = await prisma.eventSettings.findUnique({ where: { id: 1 } });
  const globallyClosed = settings ? !settings.registrationsOpen : false;
  const slotsLeft = Math.max(0, tournament.maxPlayers - tournament._count.registrations);

  // Une seule équipe par compte : on prévient avant de saisir un roster.
  const existingTeam =
    tournament.teamSize > 1
      ? await prisma.team.findUnique({
          where: { captainId: user.id },
          include: { tournament: { select: { name: true } } },
        })
      : null;

  const alreadyRegistered = await prisma.registration.findUnique({
    where: { userId_tournamentId: { userId: user.id, tournamentId: tournament.id } },
    select: { id: true },
  });

  const shared = {
    tournament: {
      slug: tournament.slug,
      name: tournament.name,
      formatLabel: tournament.formatLabel,
      teamSize: tournament.teamSize,
      entryFeeCents: tournament.entryFeeCents,
      totalDueCents: totalDueCents(tournament),
      shareCents: shareAmountCents(tournament),
      reserveThreshold: tournament.reserveThreshold,
      accentFrom: tournament.accentFrom,
      accentTo: tournament.accentTo,
    },
    user: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      pseudo: user.pseudo,
      birthDate: user.birthDate.toISOString(),
      addressLine: user.addressLine,
      postalCode: user.postalCode,
      city: user.city,
    },
    venue: settings?.venueName ?? 'Gymnase Daniel Narcisse',
    venueAddress: settings?.venueAddress ?? '97419 La Possession',
  };

  return (
    <div className="container max-w-3xl py-10">
      <Link
        href={`/tournois/${tournament.slug}`}
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-white/45 transition-colors hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Retour au tournoi
      </Link>

      {globallyClosed || !tournament.registrationOpen ? (
        <Blocked title="Inscriptions fermées">
          Les inscriptions sur {tournament.name} ne sont pas ouvertes pour le moment.
        </Blocked>
      ) : alreadyRegistered ? (
        <Blocked title="Tu es déjà inscrit">
          Ton inscription sur {tournament.name} existe déjà. Retrouve-la dans ton espace.
        </Blocked>
      ) : existingTeam ? (
        <Blocked title="Une seule équipe par compte">
          Ton compte a déjà inscrit l&apos;équipe « {existingTeam.name} » sur{' '}
          {existingTeam.tournament.name}.
        </Blocked>
      ) : slotsLeft === 0 ? (
        <Blocked title="Tournoi complet">
          Toutes les places de {tournament.name} sont prises.
        </Blocked>
      ) : tournament.teamSize > 1 ? (
        <TeamRegistrationForm {...shared} />
      ) : (
        <SoloRegistrationForm {...shared} />
      )}
    </div>
  );
}

function Blocked({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card grid place-items-center px-6 py-16 text-center">
      <h1 className="font-display text-2xl font-bold text-white">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{children}</p>
      <Link
        href="/dashboard"
        className="mt-6 rounded-xl bg-rage-gradient px-5 py-2.5 text-sm font-bold text-black shadow-neon"
      >
        Mon espace
      </Link>
    </div>
  );
}
