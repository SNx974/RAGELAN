import { prisma } from '@/lib/prisma';
import { ParticipantManager, type ParticipantRow } from '@/components/admin/participant-manager';

export const dynamic = 'force-dynamic';

export default async function AdminParticipantsPage() {
  const [registrations, tournaments] = await Promise.all([
    prisma.registration.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      include: {
        user: { select: { firstName: true, lastName: true, pseudo: true, email: true, phone: true } },
        tournament: { select: { id: true, name: true, accentFrom: true } },
        team: { select: { name: true } },
      },
      take: 1000,
    }),
    prisma.tournament.findMany({
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, maxPlayers: true },
    }),
  ]);

  const rows: ParticipantRow[] = registrations.map((r) => ({
    id: r.id,
    reference: r.reference,
    fullName: `${r.user.lastName.toUpperCase()} ${r.user.firstName}`,
    pseudo: r.ign ?? r.user.pseudo,
    email: r.user.email,
    phone: r.user.phone,
    tournamentId: r.tournament.id,
    tournamentName: r.tournament.name,
    accent: r.tournament.accentFrom,
    teamName: r.team?.name ?? null,
    status: r.status,
    paymentStatus: r.paymentStatus,
    createdAt: r.createdAt.toISOString(),
  }));

  return <ParticipantManager rows={rows} tournaments={tournaments} />;
}
