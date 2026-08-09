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

const rosterMemberSchema = z.object({
  firstName: z.string().min(2).max(80),
  lastName: z.string().min(2).max(80),
  pseudo: z.string().min(2).max(40),
  email: z.string().email(),
  phone: z.string().regex(PHONE).optional().or(z.literal('')),
  isSubstitute: z.boolean().default(false),
});

/** Inscription capitaine : roster complet saisi en une fois. */
export const captainRegistrationSchema = z.object({
  tournamentSlug: z.string().min(1),
  teamName: z.string().min(2, 'Nom d’équipe trop court').max(60),
  teamTag: z.string().max(8).optional().or(z.literal('')),
  ign: z.string().max(60).optional().or(z.literal('')),
  paymentChoice: z.enum(['ONLINE', 'ON_SITE']),
  members: z.array(rosterMemberSchema).min(1, 'Ajoute au moins un coéquipier').max(9),
});

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

export const promoteUserSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['PLAYER', 'ORGANIZER', 'ADMIN', 'SUPER_ADMIN']),
});
