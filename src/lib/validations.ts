import { z } from 'zod';

const PHONE = /^(?:\+?\d{1,3}[\s.-]?)?(?:\d[\s.-]?){8,14}$/;

export const registerSchema = z
  .object({
    firstName: z.string().min(2, 'Prénom trop court').max(80),
    lastName: z.string().min(2, 'Nom trop court').max(80),
    pseudo: z.string().min(2).max(40).optional().or(z.literal('')),
    email: z.string().email('Email invalide').max(160),
    password: z
      .string()
      .min(10, '10 caractères minimum')
      .regex(/[a-z]/, 'Une minuscule requise')
      .regex(/[A-Z]/, 'Une majuscule requise')
      .regex(/\d/, 'Un chiffre requis'),
    confirmPassword: z.string(),
    birthDate: z.coerce
      .date()
      .refine((d) => d < new Date(), 'Date de naissance invalide')
      .refine((d) => d > new Date('1920-01-01'), 'Date de naissance invalide'),
    phone: z.string().regex(PHONE, 'Numéro de téléphone invalide'),
    addressLine: z.string().min(5, 'Adresse trop courte').max(180),
    postalCode: z.string().min(4).max(12),
    city: z.string().min(2).max(90),
    country: z.string().min(2).max(80).default('France'),
    guardianName: z.string().max(160).optional().or(z.literal('')),
    guardianPhone: z.string().max(30).optional().or(z.literal('')),
    acceptRules: z.literal(true, {
      errorMap: () => ({ message: 'Tu dois accepter le règlement' }),
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })
  // Un mineur doit renseigner un responsable légal.
  .refine(
    (d) => {
      const eighteen = new Date();
      eighteen.setFullYear(eighteen.getFullYear() - 18);
      if (d.birthDate <= eighteen) return true;
      return Boolean(d.guardianName && d.guardianPhone);
    },
    {
      message: 'Responsable légal obligatoire pour les mineurs',
      path: ['guardianName'],
    },
  );

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Âge minimum le jour de l'événement. */
export const MIN_AGE = 16;
export const EVENT_DATE = new Date(process.env.NEXT_PUBLIC_EVENT_DATE ?? '2026-10-23');

/** Âge révolu à la date de l'événement (et non aujourd'hui). */
export function ageAtEvent(birthDate: Date) {
  let age = EVENT_DATE.getFullYear() - birthDate.getFullYear();
  const m = EVENT_DATE.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && EVENT_DATE.getDate() < birthDate.getDate())) age--;
  return age;
}

const rosterMemberSchema = z
  .object({
    firstName: z.string().min(2, 'Prénom requis').max(80),
    lastName: z.string().min(2, 'Nom requis').max(80),
    pseudo: z.string().min(2, 'Pseudo requis').max(40),
    birthDate: z.coerce.date({ required_error: 'Date de naissance requise' }),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().regex(PHONE).optional().or(z.literal('')),
    guardianName: z.string().max(160).optional().or(z.literal('')),
    guardianPhone: z.string().max(30).optional().or(z.literal('')),
    isSubstitute: z.boolean().default(false),
  })
  .refine((m) => ageAtEvent(m.birthDate) >= MIN_AGE, {
    message: `${MIN_AGE} ans minimum le jour de l’événement`,
    path: ['birthDate'],
  })
  // 16-17 ans : autorisation parentale obligatoire.
  .refine((m) => ageAtEvent(m.birthDate) >= 18 || Boolean(m.guardianName && m.guardianPhone), {
    message: 'Joueur mineur : responsable légal obligatoire',
    path: ['guardianName'],
  });

/** Inscription capitaine/manager : roster complet saisi en une fois. */
export const captainRegistrationSchema = z.object({
  tournamentSlug: z.string().min(1),
  teamName: z.string().min(2, 'Nom d’équipe trop court').max(60),
  teamTag: z.string().max(8).optional().or(z.literal('')),
  ign: z.string().max(60).optional().or(z.literal('')),
  // Moyen de contact du référent : obligatoire pour le suivi du paiement.
  contactEmail: z.string().email('Email de contact invalide'),
  contactPhone: z.string().regex(PHONE, 'Téléphone de contact invalide'),
  paymentChoice: z.enum(['ONLINE', 'ON_SITE']),
  members: z.array(rosterMemberSchema).min(1, 'Ajoute au moins un coéquipier').max(9),
});

/** Logo d'équipe : PNG, 5 Mo maximum. */
export const MAX_LOGO_BYTES = 5 * 1024 * 1024;
export const ALLOWED_LOGO_TYPES = ['image/png'] as const;

export function validateLogo(file: { type: string; size: number }) {
  if (!ALLOWED_LOGO_TYPES.includes(file.type as (typeof ALLOWED_LOGO_TYPES)[number])) {
    return 'Le logo doit être au format PNG.';
  }
  if (file.size > MAX_LOGO_BYTES) {
    return `Le logo dépasse 5 Mo (${(file.size / 1024 / 1024).toFixed(1)} Mo).`;
  }
  return null;
}

export type CaptainRegistrationInput = z.infer<typeof captainRegistrationSchema>;

/** Inscription solo. */
export const soloRegistrationSchema = z.object({
  tournamentSlug: z.string().min(1),
  ign: z.string().max(60).optional().or(z.literal('')),
  paymentChoice: z.enum(['ONLINE', 'ON_SITE']),
  lookingForTeam: z.boolean().default(false),
});

export type SoloRegistrationInput = z.infer<typeof soloRegistrationSchema>;

export const reportScoreSchema = z.object({
  matchId: z.string().uuid(),
  scoreA: z.number().int().min(0).max(99),
  scoreB: z.number().int().min(0).max(99),
});

export const assignSeatSchema = z.object({
  seatId: z.string().uuid(),
  registrationId: z.string().uuid().nullable(),
});

/** Saisie manuelle d'une équipe par un super admin. */
export const manualTeamSchema = z.object({
  tournamentId: z.string().uuid(),
  teamName: z.string().min(2, 'Nom d’équipe requis').max(60),
  teamTag: z.string().max(8).optional().or(z.literal('')),
  captainFirstName: z.string().min(2, 'Prénom du référent requis').max(80),
  captainLastName: z.string().min(2, 'Nom du référent requis').max(80),
  contactEmail: z.string().email('Email de contact invalide'),
  contactPhone: z.string().regex(PHONE, 'Téléphone de contact invalide'),
  members: z
    .array(
      z.object({
        firstName: z.string().min(2, 'Prénom requis').max(80),
        lastName: z.string().min(2, 'Nom requis').max(80),
        pseudo: z.string().min(2, 'Pseudo requis').max(40),
        birthDate: z.coerce.date(),
        isSubstitute: z.boolean().default(false),
      }),
    )
    .min(1, 'Au moins un joueur')
    .max(10),
});

/** Édition d'un tournoi depuis l'espace admin. */
export const updateTournamentSchema = z.object({
  name: z.string().min(2).max(120),
  tagline: z.string().min(2).max(180),
  formatLabel: z.string().min(2).max(160),
  entryFeeCents: z.coerce.number().int().min(0).max(100_000),
  maxPlayers: z.coerce.number().int().min(2).max(500),
  maxTeams: z.coerce.number().int().min(0).max(200),
  teamSize: z.coerce.number().int().min(1).max(10),
  tableCount: z.coerce.number().int().min(1).max(200),
  chairCount: z.coerce.number().int().min(1).max(500),
  seatFormat: z.enum(['FIXED', 'ROTATION']),
  registrationOpen: z.coerce.boolean(),
});

export type UpdateTournamentInput = z.infer<typeof updateTournamentSchema>;

export const promoteUserSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['PLAYER', 'ORGANIZER', 'ADMIN', 'SUPER_ADMIN']),
});
