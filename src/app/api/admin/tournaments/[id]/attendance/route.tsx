import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { requireTournamentAccess } from '@/lib/auth';
import { AttendanceSheet, type AttendanceRow } from '@/lib/pdf/attendance-sheet';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/tournaments/[id]/attendance
 * Génère la fiche de présence PDF du tournoi.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireTournamentAccess(params.id, 'canCheckIn');
  } catch {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: params.id },
    include: {
      registrations: {
        where: { status: { not: 'CANCELLED' } },
        include: {
          user: true,
          team: { select: { name: true, seed: true } },
          seatPlacement: { include: { seat: { select: { seatLabel: true } } } },
        },
        orderBy: [{ team: { name: 'asc' } }, { user: { lastName: 'asc' } }],
      },
    },
  });

  if (!tournament) {
    return NextResponse.json({ error: 'Tournoi introuvable' }, { status: 404 });
  }

  const settings = await prisma.eventSettings.findUnique({ where: { id: 1 } });

  const rows: AttendanceRow[] = tournament.registrations.map((r) => ({
    teamName: r.team?.name ?? null,
    lastName: r.user.lastName,
    firstName: r.user.firstName,
    pseudo: r.user.pseudo,
    ign: r.ign,
    phone: r.user.phone,
    seatLabel: r.seatPlacement?.seat.seatLabel ?? null,
    paymentStatus: r.paymentStatus,
    status: r.status,
  }));

  const buffer = await renderToBuffer(
    <AttendanceSheet
      eventName={settings?.eventName ?? 'R.A.G.E LAN 2'}
      tournamentName={tournament.name}
      formatLabel={tournament.formatLabel}
      venue={settings?.venueName ?? ''}
      generatedAt={new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'long',
        timeStyle: 'short',
      }).format(new Date())}
      rows={rows}
    />,
  );

  const filename = `presence-${tournament.slug}-${new Date().toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
