import { prisma } from '@/lib/prisma';
import { StaffAssignments, type StaffMember } from '@/components/admin/staff-assignments';

export const dynamic = 'force-dynamic';

export default async function AdminStaffPage() {
  const [staff, tournaments] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ['ORGANIZER', 'ADMIN', 'SUPER_ADMIN'] } },
      orderBy: [{ role: 'desc' }, { lastName: 'asc' }],
      include: { organizerScopes: { select: { tournamentId: true } } },
    }),
    prisma.tournament.findMany({
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, accentFrom: true },
    }),
  ]);

  const members: StaffMember[] = staff.map((u) => ({
    id: u.id,
    fullName: `${u.firstName} ${u.lastName}`,
    email: u.email,
    role: u.role as StaffMember['role'],
    tournamentIds: u.organizerScopes.map((s) => s.tournamentId),
  }));

  return <StaffAssignments staff={members} tournaments={tournaments} />;
}
