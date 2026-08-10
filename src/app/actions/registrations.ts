'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getSession, requireTournamentAccess } from '@/lib/auth';
import { captainRegistrationSchema, soloRegistrationSchema, validateLogo } from '@/lib/validations';
import { generateShareToken, shareAmountCents, totalDueCents } from '@/lib/pricing';
import { generateReference } from '@/lib/reference';
import { sendRegistrationReceivedEmail } from '@/lib/email';
import { formatPrice } from '@/lib/utils';

/**
 * Inscription d'un capitaine avec son roster.
 * Tout se fait dans une transaction : équipe + membres + inscription
 * du capitaine, avec contrôle de capacité et de taille de roster.
 */
export async function registerAsCaptain(
  input: unknown,
  logo?: { data: Buffer; mimeType: string },
) {
  const session = await getSession();
  if (!session) return { error: 'Connexion requise.' };

  // Un compte créé par l'organisation sert à gérer l'événement, pas à
  // y jouer.
  const account = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { canRegister: true },
  });
  if (!account?.canRegister) {
    return {
      error:
        'Ce compte est un compte de gestion : il ne peut pas s’inscrire à un tournoi. Crée un compte joueur.',
    };
  }

  const parsed = captainRegistrationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'Formulaire invalide.', fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;

  // « 1 seule équipe par compte » : contrôle applicatif en plus de la
  // contrainte SQL, pour renvoyer un message clair plutôt qu'une erreur.
  const existingTeam = await prisma.team.findUnique({
    where: { captainId: session.sub },
    include: { tournament: { select: { name: true } } },
  });
  if (existingTeam) {
    return {
      error: `Ton compte a déjà inscrit l’équipe « ${existingTeam.name} » sur ${existingTeam.tournament.name}. Une seule équipe par compte.`,
    };
  }

  const tournament = await prisma.tournament.findUnique({
    where: { slug: data.tournamentSlug },
  });
  if (!tournament) return { error: 'Tournoi introuvable.' };
  if (!tournament.registrationOpen) return { error: 'Les inscriptions sont fermées.' };
  if (tournament.teamSize < 2) return { error: 'Ce tournoi est en format solo.' };

  const settings = await prisma.eventSettings.findUnique({ where: { id: 1 } });
  if (settings && !settings.registrationsOpen) {
    return { error: 'Les inscriptions de la LAN sont fermées.' };
  }

  // Le capitaine compte dans l'effectif : il manque teamSize - 1 joueurs.
  const titulars = data.members.filter((m) => !m.isSubstitute).length;
  if (titulars !== tournament.teamSize - 1) {
    return {
      error: `Il faut exactement ${tournament.teamSize - 1} coéquipiers titulaires (roster de ${tournament.teamSize}).`,
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const taken = await tx.registration.count({
        where: {
          tournamentId: tournament.id,
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        },
      });
      const incoming = data.members.length + 1;
      const overflow = taken + incoming > tournament.maxPlayers;

      const captain = await tx.user.findUniqueOrThrow({ where: { id: session.sub } });

      const team = await tx.team.create({
        data: {
          tournamentId: tournament.id,
          captainId: captain.id,
          name: data.teamName,
          tag: data.teamTag || null,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          logoData: logo?.data ?? null,
          logoMimeType: logo?.mimeType ?? null,
          // Rien n'est acquis : un admin doit valider l'équipe.
          status: 'PENDING',
          members: {
            create: [
              {
                userId: captain.id,
                firstName: captain.firstName,
                lastName: captain.lastName,
                pseudo: captain.pseudo ?? data.teamName,
                reference: generateReference(),
                email: captain.email,
                phone: captain.phone,
                birthDate: captain.birthDate,
                guardianName: captain.guardianName,
                guardianPhone: captain.guardianPhone,
                isCaptain: true,
              },
              ...data.members.map((m) => ({
                firstName: m.firstName,
                lastName: m.lastName,
                pseudo: m.pseudo,
                reference: generateReference(),
                birthDate: m.birthDate,
                email: m.email || null,
                phone: m.phone || null,
                guardianName: m.guardianName || null,
                guardianPhone: m.guardianPhone || null,
                isSubstitute: m.isSubstitute,
              })),
            ],
          },
        },
      });

      // Une part de paiement par joueur du roster. Le capitaine peut
      // toutes les régler d'un coup, ou distribuer un lien par joueur.
      const roster = await tx.teamMember.findMany({
        where: { teamId: team.id },
        select: { id: true },
      });
      await tx.paymentShare.createMany({
        data: roster.map((m) => ({
          teamId: team.id,
          teamMemberId: m.id,
          token: generateShareToken(),
          amountCents: shareAmountCents(tournament),
        })),
      });

      const registration = await tx.registration.create({
        data: {
          userId: captain.id,
          tournamentId: tournament.id,
          teamId: team.id,
          type: 'TEAM_CAPTAIN',
          reference: generateReference(),
          // Tant qu'aucune part n'est réglée, l'équipe ne consomme
          // aucune place : elle reste en liste d'attente.
          status: 'WAITLIST',
          paymentStatus: 'PENDING',
          ign: data.ign || null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: captain.id,
          action: 'registration.captain',
          entityType: 'team',
          entityId: team.id,
          payload: { tournament: tournament.slug, roster: incoming },
        },
      });

      return { teamId: team.id, registrationId: registration.id, waitlisted: overflow };
    });

    await sendRegistrationReceivedEmail({
      to: data.contactEmail,
      firstName: data.teamName,
      tournamentName: tournament.name,
      isTeam: true,
      priceLabel: `${formatPrice(totalDueCents(tournament))} (${formatPrice(shareAmountCents(tournament))} par joueur)`,
    });

    revalidatePath('/dashboard');
    revalidatePath(`/tournois/${tournament.slug}`);
    return { success: true as const, ...result };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur inconnue';
    if (message.includes('uq_team_name_per_tournament')) {
      return { error: 'Ce nom d’équipe est déjà pris sur ce tournoi.' };
    }
    if (message.includes('uq_registration_user_tournament')) {
      return { error: 'Tu es déjà inscrit à ce tournoi.' };
    }
    return { error: 'Inscription impossible : ' + message };
  }
}

/**
 * Point d'entrée du formulaire équipe.
 *
 * Le logo est un fichier : il transite par un `FormData`, le reste du
 * formulaire étant sérialisé en JSON dans le même envoi.
 */
export async function submitTeamRegistration(formData: FormData) {
  const raw = formData.get('payload');
  if (typeof raw !== 'string') return { error: 'Formulaire invalide.' };

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return { error: 'Formulaire illisible.' };
  }

  const file = formData.get('logo');
  let logo: { data: Buffer; mimeType: string } | undefined;

  if (file instanceof File && file.size > 0) {
    const problem = validateLogo({ type: file.type, size: file.size });
    if (problem) return { error: problem };
    logo = {
      data: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type,
    };
  }

  return registerAsCaptain(payload, logo);
}

/** Inscription d'un joueur solo. */
export async function registerAsSolo(input: unknown) {
  const session = await getSession();
  if (!session) return { error: 'Connexion requise.' };

  // Un compte créé par l'organisation sert à gérer l'événement, pas à
  // y jouer.
  const account = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { canRegister: true },
  });
  if (!account?.canRegister) {
    return {
      error:
        'Ce compte est un compte de gestion : il ne peut pas s’inscrire à un tournoi. Crée un compte joueur.',
    };
  }

  const parsed = soloRegistrationSchema.safeParse(input);
  if (!parsed.success) return { error: 'Formulaire invalide.' };
  const data = parsed.data;

  const tournament = await prisma.tournament.findUnique({
    where: { slug: data.tournamentSlug },
  });
  if (!tournament) return { error: 'Tournoi introuvable.' };
  if (!tournament.registrationOpen) return { error: 'Les inscriptions sont fermées.' };

  const taken = await prisma.registration.count({
    where: {
      tournamentId: tournament.id,
      status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
    },
  });

  // Tournoi plein : on accepte quand même, en liste d'attente. Rien
  // n'est à payer maintenant — le règlement se fera sur place si une
  // place se libère.
  const waitlisted = taken >= tournament.maxPlayers;

  let registrationId: string;
  try {
    // Tant que le paiement intégral n'est pas reçu, aucune place n'est
    // tenue : l'inscription reste en liste d'attente. Le webhook Stripe
    // la fera passer en attente de validation admin.
    const created = await prisma.registration.create({
      data: {
        userId: session.sub,
        tournamentId: tournament.id,
        type: 'SOLO',
        reference: generateReference(),
        status: 'WAITLIST',
        paymentStatus: waitlisted ? 'PAY_ON_SITE' : 'PENDING',
        ign: data.ign || null,
        notes: data.lookingForTeam ? 'Cherche une équipe' : null,
      },
    });
    registrationId = created.id;
  } catch {
    return { error: 'Tu es déjà inscrit à ce tournoi.' };
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.sub },
    select: { email: true, firstName: true },
  });
  await sendRegistrationReceivedEmail({
    to: user.email,
    firstName: user.firstName,
    tournamentName: tournament.name,
    isTeam: false,
    priceLabel: formatPrice(totalDueCents(tournament)),
  });

  revalidatePath('/dashboard');
  revalidatePath(`/tournois/${tournament.slug}`);
  return { success: true as const, registrationId, waitlisted };
}

/** Check-in staff le jour J. */
export async function checkInRegistration(registrationId: string) {
  const registration = await prisma.registration.findUniqueOrThrow({
    where: { id: registrationId },
    select: { tournamentId: true, status: true },
  });
  const session = await requireTournamentAccess(registration.tournamentId, 'canCheckIn');

  const updated = await prisma.registration.update({
    where: { id: registrationId },
    data: {
      status: 'CHECKED_IN',
      checkedInAt: new Date(),
      checkedInById: session.sub,
    },
  });

  revalidatePath('/staff/checkin');
  return { success: true, status: updated.status };
}

/** Encaissement sur place par le staff. */
export async function collectOnSitePayment(
  registrationId: string,
  method: 'cash' | 'card_on_site',
) {
  const registration = await prisma.registration.findUniqueOrThrow({
    where: { id: registrationId },
    include: { tournament: { select: { id: true, entryFeeCents: true } } },
  });
  const session = await requireTournamentAccess(registration.tournament.id, 'canCollectPayment');

  await prisma.$transaction([
    prisma.registration.update({
      where: { id: registrationId },
      data: { paymentStatus: 'PAID_ON_SITE' },
    }),
    prisma.payment.create({
      data: {
        userId: registration.userId,
        registrationId,
        amountCents: registration.tournament.entryFeeCents,
        status: 'PAID_ON_SITE',
        method,
        collectedById: session.sub,
        paidAt: new Date(),
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: session.sub,
        action: 'payment.collect',
        entityType: 'registration',
        entityId: registrationId,
        payload: { method, amountCents: registration.tournament.entryFeeCents },
      },
    }),
  ]);

  revalidatePath('/staff/checkin');
  return { success: true };
}
