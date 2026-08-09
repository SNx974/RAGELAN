import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hasRole } from '@/lib/auth';
import { CheckInConsole, type CheckInRow } from '@/components/staff/checkin-console';

export const dynamic = 'force-dynamic';

export default async function StaffCheckInPage() {
  const user = await getCurrentUser();
  if (!user || !hasRole(user.role, 'ORGANIZER')) redirect('/login?next=/staff/checkin');

  // Un ORGANIZER ne voit que ses tournois ; ADMIN+ voit tout.
  const scopeIds = user.organizerScopes.map((s) => s.tournamentId);
  const where = hasRole(user.role, 'ADMIN') ? {} : { tournamentId: { in: scopeIds } };

  const registrations = await prisma.registration.findMany({
    where: { ...where, status: { notIn: ['CANCELLED'] } },
    include: {
      user: { select: { firstName: true, lastName: true, pseudo: true, phone: true } },
      tournament: { select: { name: true, slug: true, entryFeeCents: true, accentFrom: true } },
      team: { select: { name: true } },
      seatPlacement: { include: { seat: { select: { seatLabel: true } } } },
    },
    orderBy: [{ user: { lastName: 'asc' } }],
    take: 1000,
  });

  const rows: CheckInRow[] = registrations.map((r) => ({
    id: r.id,
    fullName: `${r.user.firstName} ${r.user.lastName}`,
    pseudo: r.user.pseudo,
    phone: r.user.phone,
    tournamentName: r.tournament.name,
    accent: r.tournament.accentFrom,
    entryFeeCents: r.tournament.entryFeeCents,
    teamName: r.team?.name ?? null,
    seatLabel: r.seatPlacement?.seat.seatLabel ?? null,
    status: r.status,
    paymentStatus: r.paymentStatus,
  }));

  return <CheckInConsole rows={rows} />;
}
