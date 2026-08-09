# R.A.G.E LAN 2

Plateforme complète de LAN party esport : inscriptions joueurs/équipes, paiements,
arbres de tournoi animés, plan de salle interactif et fiches de présence PDF.

**9 tournois · 272 places · 59 tables · 152 chaises**

---

## Stack

| Couche      | Technologie                                              |
| ----------- | -------------------------------------------------------- |
| Framework   | Next.js 14 (App Router, Server Actions, RSC)             |
| Base        | PostgreSQL 15+ via Prisma 5 (`provider = "postgresql"`)  |
| UI          | Tailwind CSS 3, shadcn/ui, Lucide Icons                  |
| Animations  | Framer Motion 11                                          |
| Formulaires | React Hook Form + Zod                                     |
| PDF         | `@react-pdf/renderer`                                     |
| Auth        | JWT `jose` en cookie httpOnly + bcrypt                    |
| Paiement    | Stripe (squelette prêt à activer)                        |

---

## Démarrage — Windows (double-clic)

1. **`1-INSTALLATION.bat`** — une seule fois. Installe les dépendances, crée la
   base PostgreSQL, génère le `.env` et remplit les 9 tournois.
   Il demande le mot de passe du compte `postgres` (celui choisi à l'installation
   de PostgreSQL).
2. **`2-DEMARRER.bat`** — à chaque fois. Démarre le serveur et ouvre le navigateur.

Pour arrêter : ferme la fenêtre noire.

### Comptes créés par l'installation

| Rôle          | Email                | Mot de passe | Espace    |
| ------------- | -------------------- | ------------ | --------- |
| `SUPER_ADMIN` | `admin@ragelan.gg`   | `RageLan2!`  | `/admin`  |
| `ORGANIZER`   | `staff@ragelan.gg`   | `RageLan2!`  | `/staff`  |

> À changer avant la vraie LAN.

## Démarrage — ligne de commande

```bash
npm install
cp .env.example .env          # renseigne DATABASE_URL et AUTH_SECRET
npx prisma db push            # ou: npx prisma migrate dev --name init
npm run db:seed               # 9 tournois + plan de salle + comptes staff
npm run dev
```

> **AUTH_SECRET** doit faire 32 caractères minimum : `openssl rand -base64 32`.

### Schéma SQL pur

Si tu préfères piloter la base sans Prisma, [`sql/schema.sql`](sql/schema.sql) contient
le DDL autonome équivalent : types ENUM, contraintes `CHECK`, clés étrangères,
triggers de propagation de bracket et vues d'agrégation.

```bash
psql -U rage -d rage_lan_2 -f sql/schema.sql
```

---

## Structure du projet

```
.
├── prisma/
│   ├── schema.prisma              # Modèle complet (14 modèles, 10 enums)
│   └── seed.ts                    # 9 tournois + génération du plan de salle
├── sql/
│   └── schema.sql                 # DDL PostgreSQL autonome + triggers + vues
├── src/
│   ├── middleware.ts              # Garde de routes par rôle (JWT en edge)
│   ├── app/
│   │   ├── layout.tsx  page.tsx  globals.css
│   │   ├── login/  register/      # Authentification
│   │   ├── tournois/              # Liste + fiche tournoi (arbre public)
│   │   ├── dashboard/             # Espace joueur : inscriptions, place, paiement
│   │   ├── admin/                 # SUPER_ADMIN / ADMIN
│   │   │   ├── layout.tsx  page.tsx
│   │   │   └── tournois/[id]/{bracket,placement}/
│   │   ├── staff/                 # ORGANIZER
│   │   │   ├── page.tsx  checkin/
│   │   │   └── tournois/[id]/{bracket,placement}/
│   │   ├── actions/               # Server Actions
│   │   │   ├── auth.ts  registrations.ts  admin.ts
│   │   └── api/
│   │       ├── admin/tournaments/[id]/attendance/  # PDF de présence
│   │       └── payments/checkout/                  # Stripe (à activer)
│   ├── components/
│   │   ├── motion/                # Reveal (scroll), GlitchTitle, NeonTitle
│   │   ├── tournaments/           # TiltCard (3D + glare), TournamentCard
│   │   ├── brackets/              # BracketTree — progression animée
│   │   ├── floorplan/             # FloorPlan — drag & drop des sièges
│   │   ├── staff/                 # CheckInConsole — recherche instantanée
│   │   ├── admin/                 # BracketBoard, PlacementBoard, toggles
│   │   ├── auth/  payments/  layout/  home/  ui/
│   └── lib/
│       ├── prisma.ts  auth.ts  utils.ts  queries.ts  validations.ts
│       ├── bracket.ts             # Seeding, génération, propagation
│       ├── tournaments-data.ts    # Source de vérité des 9 tournois
│       └── pdf/attendance-sheet.tsx
```

---

## Public vs organisation

Les **tables et chaises sont des données d'organisation** : elles n'apparaissent
nulle part côté public. Le type `TournamentCardData` ne les contient même pas, donc
elles ne sont jamais sérialisées vers le navigateur sur les pages publiques.

| Écran                        | Joueurs | Places libres | Tables / chaises |
| ---------------------------- | :-----: | :-----------: | :--------------: |
| Accueil, liste, fiche tournoi |    ✅    |       ✅       |        ❌         |
| `/admin` (vue d'ensemble)     |    ✅    |       ✅       |        ✅         |
| `/admin/.../placement`        |    ✅    |       ✅       |        ✅         |

---

## Logo

Dépose le logo dans `public/logo.png` — voir [`public/LOGO.md`](public/LOGO.md).
Tant que le fichier est absent, le header et le footer affichent automatiquement
un wordmark typographique de repli, donc rien ne casse.

---

## Les 9 tournois

| Tournoi           | Joueurs | Tables | Chaises | Format                       |
| ----------------- | ------: | -----: | ------: | ---------------------------- |
| Valorant          |      40 |     20 |      40 | 8 équipes, 5v5, places fixes |
| Rocket League     |      24 |     12 |      24 | 8 équipes, 3v3, places fixes |
| TFT               |      16 |      8 |      16 | Places fixes                 |
| Fortnite          |      32 |      4 |       8 | 2v2, rotation                |
| TCG               |      40 |      7 |      40 | 6 joueurs/table, fixes       |
| SSBU              |      32 |      2 |       4 | 1v1, rotation                |
| Mario Kart        |      24 |      2 |       8 | Multi-postes, rotation       |
| Tekken 8          |      32 |      2 |       4 | 1v1, rotation                |
| FC27              |      32 |      2 |       8 | Rotation                     |

---

## Modèle de données

14 modèles : `User`, `Session`, `Tournament`, `EventSettings`, `Team`, `TeamMember`,
`Registration`, `Payment`, `Bracket`, `Match`, `Seat`, `SeatPlacement`,
`OrganizerAssignment`, `AuditLog`.

Garanties d'intégrité notables :

- `uq_registration_user_tournament` — un joueur ne peut s'inscrire qu'une fois par tournoi.
- `SeatPlacement.seatId` en `@unique` — pas de double booking d'un siège.
- `matches_winner_is_participant` — le vainqueur d'un match y a effectivement joué.
- `users_guardian_required_for_minors` — responsable légal obligatoire sous 18 ans.
- Trigger `propagate_match_result` — le vainqueur (et le perdant en double élimination)
  remonte automatiquement au match suivant.
- Trigger `enforce_tournament_capacity` — bascule en `WAITLIST` quand le tournoi est plein.

---

## Rôles et permissions

| Rôle          | Portée                                                          |
| ------------- | --------------------------------------------------------------- |
| `PLAYER`      | Son profil, ses inscriptions, ses paiements                     |
| `ORGANIZER`   | Check-in, encaissement, brackets — **uniquement ses tournois**   |
| `ADMIN`       | Tous les tournois, inscriptions, placements, PDF                |
| `SUPER_ADMIN` | + promotion/rétrogradation des comptes                          |

La restriction par tournoi est appliquée côté serveur par `requireTournamentAccess()`
dans chaque Server Action — le middleware ne fait que le premier filtrage de route.

---

## Activer Stripe

1. Renseigne `STRIPE_SECRET_KEY` et `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` dans `.env`.
2. Décommente le bloc d'intégration dans `src/app/api/payments/checkout/route.ts`.
3. Ajoute le webhook `checkout.session.completed` qui passe le `Payment`
   en `PAID_ONLINE` et met à jour la `Registration` correspondante.

Le reste de la chaîne (modèle `Payment`, statuts, affichage dashboard, encaissement
sur place par le staff) est déjà en place.

---

## Scripts

| Commande             | Effet                                    |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Serveur de développement                 |
| `npm run build`      | `prisma generate` + build de production   |
| `npm run db:migrate` | Crée et applique une migration            |
| `npm run db:seed`    | Peuple les 9 tournois et le plan de salle |
| `npm run db:studio`  | Explorateur Prisma Studio                 |
