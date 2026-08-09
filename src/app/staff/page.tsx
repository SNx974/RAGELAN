import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ClipboardCheck, GitBranch, MapPinned, Download } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hasRole } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Reveal, RevealGroup } from '@/components/motion/reveal';

export const dynamic = 'force-dynamic';

export default async function StaffHomePage() {
  const user = await getCurrentUser();
  if (!user || !hasRole(user.role, 'ORGANIZER')) redirect('/login?next=/staff');

  const scopeIds = user.organizerScopes.map((s) => s.tournamentId);
  const tournaments = await prisma.tournament.findMany({
    where: hasRole(user.role, 'ADMIN') ? {} : { id: { in: scopeIds } },
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: {
        select: {
          registrations: { where: { status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] } } },
        },
      },
    },
  });

  const checkedIn = await prisma.registration.count({
    where: {
      status: 'CHECKED_IN',
      ...(hasRole(user.role, 'ADMIN') ? {} : { tournamentId: { in: scopeIds } }),
    },
  });

  return (
    <div className="container space-y-8 py-12">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-rage-orange">
              Espace organisateur
            </p>
            <h1 className="font-display text-3xl font-bold text-white">{user.firstName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {tournaments.length} tournoi{tournaments.length > 1 ? 's' : ''} assigné
              {tournaments.length > 1 ? 's' : ''} · {checkedIn} joueurs déjà présents
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/staff/checkin">
              <ClipboardCheck />
              Ouvrir le check-in
            </Link>
          </Button>
        </div>
      </Reveal>

      {tournaments.length === 0 ? (
        <div className="glass-card grid place-items-center px-6 py-20 text-center">
          <p className="font-display text-lg font-bold text-white">Aucun tournoi assigné</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Un administrateur doit te rattacher à un ou plusieurs tournois.
          </p>
        </div>
      ) : (
        <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => (
            <Reveal key={t.id}>
              <div className="glass-card spotlight p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-white">{t.name}</h2>
                  <Badge variant={t.registrationOpen ? 'success' : 'neutral'}>
                    {t.registrationOpen ? 'Ouvert' : 'Fermé'}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-white/40">
                  {t._count.registrations}/{t.maxPlayers} inscrits · {t.formatLabel}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/staff/tournois/${t.id}/bracket`}>
                      <GitBranch />
                      Arbre
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/staff/tournois/${t.id}/placement`}>
                      <MapPinned />
                      Placement
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <a
                      href={`/api/admin/tournaments/${t.id}/attendance`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download />
                      PDF
                    </a>
                  </Button>
                </div>
              </div>
            </Reveal>
          ))}
        </RevealGroup>
      )}
    </div>
  );
}
