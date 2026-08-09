import { prisma } from '@/lib/prisma';
import {
  SoloRegistrationList,
  type SoloRegistration,
} from '@/components/admin/solo-registration-list';

export const dynamic = 'force-dynamic';

export default async function AdminRegistrationsPage() {
  // Les inscriptions en équipe se traitent via la validation d'équipe :
  // on ne liste ici que les joueurs solo.
  const registrations = await prisma.registration.findMany({
    where: { type: 'SOLO' },
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    include: {
      user: { select: { firstName: true, lastName: true, pseudo: true, email: true, phone: true } },
      tournament: { select: { name: true, accentFrom: true, entryFeeCents: true } },
    },
    take: 500,
  });

  const rows: SoloRegistration[] = registrations.map((r) => ({
    id: r.id,
    fullName: `${r.user.firstName} ${r.user.lastName}`,
    pseudo: r.user.pseudo,
    email: r.user.email,
    phone: r.user.phone,
    ign: r.ign,
    notes: r.notes,
    tournamentName: r.tournament.name,
    accent: r.tournament.accentFrom,
    entryFeeCents: r.tournament.entryFeeCents,
    status: r.status,
    paymentStatus: r.paymentStatus,
    createdAt: r.createdAt.toISOString(),
  }));

  return <SoloRegistrationList registrations={rows} />;
}
