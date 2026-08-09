import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { UserRoleTable, type ManagedUser } from '@/components/admin/user-role-table';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session) redirect('/login?next=/admin/utilisateurs');

  const users = await prisma.user.findMany({
    orderBy: [{ role: 'desc' }, { lastName: 'asc' }],
    include: { _count: { select: { registrations: true } } },
    take: 500,
  });

  const rows: ManagedUser[] = users.map((u) => ({
    id: u.id,
    fullName: `${u.firstName} ${u.lastName}`,
    pseudo: u.pseudo,
    email: u.email,
    phone: u.phone,
    role: u.role,
    registrations: u._count.registrations,
    createdAt: u.createdAt.toISOString(),
    isSelf: u.id === session.sub,
  }));

  return <UserRoleTable users={rows} canPromote={session.role === 'SUPER_ADMIN'} />;
}
