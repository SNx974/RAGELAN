import { prisma } from '@/lib/prisma';
import { TeamReviewList, type ReviewableTeam } from '@/components/admin/team-review-list';

export const dynamic = 'force-dynamic';

export default async function AdminTeamsPage() {
  const teams = await prisma.team.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    include: {
      tournament: { select: { name: true, accentFrom: true, entryFeeCents: true } },
      captain: { select: { firstName: true, lastName: true, email: true, phone: true } },
      members: {
        orderBy: [{ isCaptain: 'desc' }, { isSubstitute: 'asc' }],
        select: {
          firstName: true,
          lastName: true,
          pseudo: true,
          birthDate: true,
          guardianName: true,
          isCaptain: true,
          isSubstitute: true,
        },
      },
    },
  });

  const rows: ReviewableTeam[] = teams.map((t) => ({
    id: t.id,
    name: t.name,
    tag: t.tag,
    status: t.status,
    hasLogo: t.logoData !== null,
    rejectionReason: t.rejectionReason,
    tournamentName: t.tournament.name,
    accent: t.tournament.accentFrom,
    entryFeeCents: t.tournament.entryFeeCents,
    contactEmail: t.contactEmail,
    contactPhone: t.contactPhone,
    captainName: `${t.captain.firstName} ${t.captain.lastName}`,
    createdAt: t.createdAt.toISOString(),
    players: t.members.map((m) => ({
      pseudo: m.pseudo,
      fullName: `${m.firstName} ${m.lastName}`,
      birthDate: m.birthDate.toISOString(),
      hasGuardian: Boolean(m.guardianName),
      isCaptain: m.isCaptain,
      isSubstitute: m.isSubstitute,
    })),
  }));

  return <TeamReviewList teams={rows} />;
}
