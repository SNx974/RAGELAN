import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PlacementBoard } from '@/components/admin/placement-board';
import type { PlanSeat, PlanPlayer } from '@/components/floorplan/floor-plan';

export const dynamic = 'force-dynamic';

export default async function AdminPlacementPage({ params }: { params: { id: string } }) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: params.id },
    include: {
      seats: {
        where: { isActive: true },
        orderBy: [{ tableLabel: 'asc' }, { seatLabel: 'asc' }],
        include: {
          placement: {
            include: {
              registration: { select: { id: true } },
              user: { select: { id: true, firstName: true, lastName: true, pseudo: true } },
              team: { select: { id: true, name: true } },
            },
          },
        },
      },
      registrations: {
        where: {
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
          seatPlacement: { is: null },
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, pseudo: true } },
          team: { select: { id: true, name: true } },
        },
        orderBy: [{ team: { name: 'asc' } }, { createdAt: 'asc' }],
      },
    },
  });

  if (!tournament) notFound();

  const seats: PlanSeat[] = tournament.seats.map((s) => ({
    id: s.id,
    seatLabel: s.seatLabel,
    tableLabel: s.tableLabel,
    zone: s.zone,
    kind: s.kind,
    x: s.x,
    y: s.y,
    occupant:
      s.placement && s.placement.user && s.placement.registration
        ? {
            registrationId: s.placement.registration.id,
            userId: s.placement.user.id,
            firstName: s.placement.user.firstName,
            lastName: s.placement.user.lastName,
            displayName:
              s.placement.user.pseudo ??
              `${s.placement.user.firstName} ${s.placement.user.lastName}`,
            teamId: s.placement.team?.id ?? null,
            teamName: s.placement.team?.name ?? null,
          }
        : null,
  }));

  const unassigned: PlanPlayer[] = tournament.registrations.map((r) => ({
    registrationId: r.id,
    userId: r.user.id,
    firstName: r.user.firstName,
    lastName: r.user.lastName,
    displayName: r.user.pseudo ?? `${r.user.firstName} ${r.user.lastName}`,
    teamId: r.team?.id ?? null,
    teamName: r.team?.name ?? null,
  }));

  return (
    <PlacementBoard
      tournamentId={tournament.id}
      tournamentName={tournament.name}
      seatFormat={tournament.seatFormat}
      accent={tournament.accentFrom}
      seats={seats}
      unassigned={unassigned}
    />
  );
}
