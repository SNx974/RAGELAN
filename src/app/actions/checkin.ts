'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getSession, hasRole } from '@/lib/auth';
import { normalizeReference } from '@/lib/reference';

export type ScanResult =
  | { kind: 'NOT_FOUND'; reference: string }
  | { kind: 'FORBIDDEN'; tournamentName: string; contacts: string[] }
  | {
      kind: 'OK';
      reference: string;
      fullName: string;
      pseudo: string;
      tournamentId: string;
      tournamentName: string;
      teamName: string | null;
      isCaptain: boolean;
      seatLabel: string | null;
      paid: boolean;
      amountDueCents: number;
      checkedIn: boolean;
      checkedInAt: string | null;
      /** Discriminant pour la validation : les deux tables diffèrent. */
      target: { type: 'registration' | 'member'; id: string };
    };

/**
 * Retrouve un participant depuis sa référence (QR ou saisie manuelle).
 *
 * Une référence désigne soit une inscription solo, soit un joueur d'une
 * équipe : seul le capitaine porte une Registration, les coéquipiers
 * n'existent que comme TeamMember.
 */
export async function lookupReference(rawReference: string): Promise<ScanResult> {
  const session = await getSession();
  if (!session || !hasRole(session.role, 'ORGANIZER')) {
    return { kind: 'NOT_FOUND', reference: rawReference };
  }

  const reference = normalizeReference(rawReference);

  const registration = await prisma.registration.findUnique({
    where: { reference },
    include: {
      user: { select: { firstName: true, lastName: true, pseudo: true } },
      tournament: { select: { id: true, name: true, entryFeeCents: true } },
      team: { select: { name: true } },
      seatPlacement: { include: { seat: { select: { seatLabel: true } } } },
    },
  });

  if (registration) {
    const allowed = await canManage(session, registration.tournament.id);
    if (!allowed) return forbidden(registration.tournament.id, registration.tournament.name);

    return {
      kind: 'OK',
      reference,
      fullName: `${registration.user.firstName} ${registration.user.lastName}`,
      pseudo: registration.ign ?? registration.user.pseudo ?? '—',
      tournamentId: registration.tournament.id,
      tournamentName: registration.tournament.name,
      teamName: registration.team?.name ?? null,
      isCaptain: registration.type === 'TEAM_CAPTAIN',
      seatLabel: registration.seatPlacement?.seat.seatLabel ?? null,
      paid: ['PAID_ONLINE', 'PAID_ON_SITE'].includes(registration.paymentStatus),
      amountDueCents: registration.tournament.entryFeeCents,
      checkedIn: registration.status === 'CHECKED_IN',
      checkedInAt: registration.checkedInAt?.toISOString() ?? null,
      target: { type: 'registration', id: registration.id },
    };
  }

  const member = await prisma.teamMember.findUnique({
    where: { reference },
    include: {
      share: { select: { status: true, amountCents: true } },
      team: {
        select: {
          name: true,
          tournament: { select: { id: true, name: true, entryFeeCents: true } },
        },
      },
    },
  });

  if (!member) return { kind: 'NOT_FOUND', reference };

  const allowed = await canManage(session, member.team.tournament.id);
  if (!allowed) return forbidden(member.team.tournament.id, member.team.tournament.name);

  return {
    kind: 'OK',
    reference,
    fullName: `${member.firstName} ${member.lastName}`,
    pseudo: member.pseudo,
    tournamentId: member.team.tournament.id,
    tournamentName: member.team.tournament.name,
    teamName: member.team.name,
    isCaptain: member.isCaptain,
    seatLabel: null,
    paid: member.share?.status === 'PAID',
    amountDueCents: member.share?.amountCents ?? member.team.tournament.entryFeeCents,
    checkedIn: member.checkedInAt !== null,
    checkedInAt: member.checkedInAt?.toISOString() ?? null,
    target: { type: 'member', id: member.id },
  };
}

/** Valide la présence. Rejoue sans effet si le joueur est déjà pointé. */
export async function confirmPresence(
  target: { type: 'registration' | 'member'; id: string },
  tournamentId: string,
) {
  const session = await getSession();
  if (!session || !hasRole(session.role, 'ORGANIZER')) {
    return { error: 'Accès refusé.' };
  }
  if (!(await canManage(session, tournamentId))) {
    const t = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { name: true },
    });
    const { contacts } = await forbidden(tournamentId, t?.name ?? '');
    return {
      error: `Tu n’es pas assigné à ce tournoi. Merci de voir : ${contacts.join(', ') || 'un administrateur'}.`,
    };
  }

  if (target.type === 'registration') {
    await prisma.registration.update({
      where: { id: target.id },
      data: { status: 'CHECKED_IN', checkedInAt: new Date(), checkedInById: session.sub },
    });
  } else {
    await prisma.teamMember.update({
      where: { id: target.id },
      data: { checkedInAt: new Date(), checkedInById: session.sub },
    });
  }

  await prisma.auditLog.create({
    data: {
      actorId: session.sub,
      action: 'checkin.confirm',
      entityType: target.type,
      entityId: target.id,
      payload: { tournamentId },
    },
  });

  revalidatePath('/staff/checkin');
  revalidatePath('/staff/scan');
  return { success: true as const };
}

/** ADMIN et au-delà passent partout ; un ORGANIZER est cantonné à ses tournois. */
async function canManage(
  session: { sub: string; role: string },
  tournamentId: string,
): Promise<boolean> {
  if (hasRole(session.role as never, 'ADMIN')) return true;
  const scope = await prisma.organizerAssignment.findUnique({
    where: { userId_tournamentId: { userId: session.sub, tournamentId } },
    select: { canCheckIn: true },
  });
  return scope?.canCheckIn ?? false;
}

/**
 * Refus explicite : on nomme les personnes habilitées, pour que le
 * joueur soit renvoyé vers le bon interlocuteur plutôt que baladé.
 */
async function forbidden(tournamentId: string, tournamentName: string) {
  const assignments = await prisma.organizerAssignment.findMany({
    where: { tournamentId, canCheckIn: true },
    include: { user: { select: { firstName: true, lastName: true, pseudo: true } } },
  });

  return {
    kind: 'FORBIDDEN' as const,
    tournamentName,
    contacts: assignments.map(
      (a) => a.user.pseudo ?? `${a.user.firstName} ${a.user.lastName}`,
    ),
  };
}
