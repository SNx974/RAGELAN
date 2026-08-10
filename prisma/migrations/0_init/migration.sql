-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PLAYER', 'ORGANIZER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID_ONLINE', 'PAY_ON_SITE', 'PAID_ON_SITE', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'WAITLIST', 'CHECKED_IN', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "RegistrationType" AS ENUM ('TEAM_CAPTAIN', 'TEAM_MEMBER', 'SOLO');

-- CreateEnum
CREATE TYPE "SeatFormat" AS ENUM ('FIXED', 'ROTATION');

-- CreateEnum
CREATE TYPE "BracketType" AS ENUM ('SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'GROUPS_THEN_PLAYOFFS', 'ROUND_ROBIN', 'SWISS');

-- CreateEnum
CREATE TYPE "BracketStatus" AS ENUM ('DRAFT', 'SEEDING', 'RUNNING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'READY', 'IN_PROGRESS', 'COMPLETED', 'WALKOVER', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BracketSide" AS ENUM ('WINNERS', 'LOSERS', 'GRAND_FINAL', 'GROUP');

-- CreateEnum
CREATE TYPE "SeatKind" AS ENUM ('PC', 'CONSOLE', 'TABLE_TCG', 'STAFF', 'FREEPLAY');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ShareStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" VARCHAR(80) NOT NULL,
    "last_name" VARCHAR(80) NOT NULL,
    "pseudo" VARCHAR(40),
    "birth_date" DATE NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "address_line" VARCHAR(180) NOT NULL,
    "postal_code" VARCHAR(12) NOT NULL,
    "city" VARCHAR(90) NOT NULL,
    "country" VARCHAR(80) NOT NULL DEFAULT 'France',
    "role" "Role" NOT NULL DEFAULT 'PLAYER',
    "email_verified" TIMESTAMP(3),
    "avatar_url" TEXT,
    "guardian_name" VARCHAR(160),
    "guardian_phone" VARCHAR(30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip" INET,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "tagline" VARCHAR(180) NOT NULL,
    "platform" VARCHAR(40) NOT NULL,
    "max_players" INTEGER NOT NULL,
    "table_count" INTEGER NOT NULL,
    "chair_count" INTEGER NOT NULL,
    "team_size" INTEGER NOT NULL DEFAULT 1,
    "max_teams" INTEGER NOT NULL DEFAULT 0,
    "seat_format" "SeatFormat" NOT NULL DEFAULT 'FIXED',
    "players_per_table" INTEGER,
    "format_label" VARCHAR(160) NOT NULL,
    "bracket_type" "BracketType" NOT NULL DEFAULT 'SINGLE_ELIMINATION',
    "entry_fee_cents" INTEGER NOT NULL DEFAULT 0,
    "reserve_threshold" INTEGER NOT NULL DEFAULT 3,
    "accent_from" VARCHAR(9) NOT NULL DEFAULT '#FF2A2A',
    "accent_to" VARCHAR(9) NOT NULL DEFAULT '#FF6B00',
    "cover_image" TEXT,
    "rules_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "registration_open" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "event_name" TEXT NOT NULL DEFAULT 'R.A.G.E LAN 2',
    "registrations_open" BOOLEAN NOT NULL DEFAULT true,
    "registrations_close_at" TIMESTAMP(3),
    "venue_name" TEXT NOT NULL DEFAULT '',
    "venue_address" TEXT NOT NULL DEFAULT '',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "tournament_id" UUID NOT NULL,
    "captain_id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "tag" VARCHAR(8),
    "seed" INTEGER,
    "checked_in" BOOLEAN NOT NULL DEFAULT false,
    "logo_data" BYTEA,
    "logo_mime_type" VARCHAR(40),
    "contact_email" CITEXT NOT NULL,
    "contact_phone" VARCHAR(30) NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" VARCHAR(300),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "user_id" UUID,
    "first_name" VARCHAR(80) NOT NULL,
    "last_name" VARCHAR(80) NOT NULL,
    "pseudo" VARCHAR(40) NOT NULL,
    "email" CITEXT,
    "phone" VARCHAR(30),
    "birth_date" DATE NOT NULL,
    "guardian_name" VARCHAR(160),
    "guardian_phone" VARCHAR(30),
    "is_captain" BOOLEAN NOT NULL DEFAULT false,
    "is_substitute" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registrations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tournament_id" UUID NOT NULL,
    "team_id" UUID,
    "type" "RegistrationType" NOT NULL DEFAULT 'SOLO',
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "ign" VARCHAR(60),
    "notes" TEXT,
    "checked_in_at" TIMESTAMP(3),
    "checked_in_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "registration_id" UUID,
    "amount_cents" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" VARCHAR(20) NOT NULL DEFAULT 'stripe',
    "stripe_session_id" TEXT,
    "stripe_payment_intent_id" TEXT,
    "collected_by_id" UUID,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_shares" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "team_member_id" UUID NOT NULL,
    "token" VARCHAR(48) NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "status" "ShareStatus" NOT NULL DEFAULT 'PENDING',
    "stripe_session_id" TEXT,
    "method" VARCHAR(20),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brackets" (
    "id" UUID NOT NULL,
    "tournament_id" UUID NOT NULL,
    "name" VARCHAR(90) NOT NULL DEFAULT 'Arbre principal',
    "type" "BracketType" NOT NULL DEFAULT 'SINGLE_ELIMINATION',
    "status" "BracketStatus" NOT NULL DEFAULT 'DRAFT',
    "rounds_count" INTEGER NOT NULL DEFAULT 0,
    "third_place_match" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brackets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" UUID NOT NULL,
    "bracket_id" UUID NOT NULL,
    "round" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "side" "BracketSide" NOT NULL DEFAULT 'WINNERS',
    "group_label" VARCHAR(20),
    "best_of" INTEGER NOT NULL DEFAULT 1,
    "team_a_id" UUID,
    "team_b_id" UUID,
    "score_a" INTEGER NOT NULL DEFAULT 0,
    "score_b" INTEGER NOT NULL DEFAULT 0,
    "winner_id" UUID,
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "next_match_id" UUID,
    "next_match_slot" CHAR(1),
    "loser_match_id" UUID,
    "loser_match_slot" CHAR(1),
    "scheduled_at" TIMESTAMP(3),
    "station_label" VARCHAR(40),
    "reported_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seats" (
    "id" UUID NOT NULL,
    "tournament_id" UUID,
    "zone" VARCHAR(40) NOT NULL,
    "table_label" VARCHAR(20) NOT NULL,
    "seat_label" VARCHAR(20) NOT NULL,
    "kind" "SeatKind" NOT NULL DEFAULT 'PC',
    "x" REAL NOT NULL DEFAULT 0,
    "y" REAL NOT NULL DEFAULT 0,
    "rotation" REAL NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seat_placements" (
    "id" UUID NOT NULL,
    "seat_id" UUID NOT NULL,
    "registration_id" UUID,
    "user_id" UUID,
    "team_id" UUID,
    "assigned_by_id" UUID,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" VARCHAR(120),

    CONSTRAINT "seat_placements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizer_assignments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tournament_id" UUID NOT NULL,
    "can_manage_bracket" BOOLEAN NOT NULL DEFAULT true,
    "can_check_in" BOOLEAN NOT NULL DEFAULT true,
    "can_collect_payment" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizer_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" VARCHAR(60) NOT NULL,
    "entity_type" VARCHAR(40) NOT NULL,
    "entity_id" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_pseudo_key" ON "users"("pseudo");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_last_name_first_name_idx" ON "users"("last_name", "first_name");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_slug_key" ON "tournaments"("slug");

-- CreateIndex
CREATE INDEX "tournaments_sort_order_idx" ON "tournaments"("sort_order");

-- CreateIndex
CREATE INDEX "teams_status_idx" ON "teams"("status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_team_name_per_tournament" ON "teams"("tournament_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "uq_team_seed_per_tournament" ON "teams"("tournament_id", "seed");

-- CreateIndex
CREATE UNIQUE INDEX "uq_one_team_per_account" ON "teams"("captain_id");

-- CreateIndex
CREATE INDEX "team_members_user_id_idx" ON "team_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_member_pseudo_per_team" ON "team_members"("team_id", "pseudo");

-- CreateIndex
CREATE INDEX "registrations_tournament_id_status_idx" ON "registrations"("tournament_id", "status");

-- CreateIndex
CREATE INDEX "registrations_team_id_idx" ON "registrations"("team_id");

-- CreateIndex
CREATE INDEX "registrations_payment_status_idx" ON "registrations"("payment_status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_registration_user_tournament" ON "registrations"("user_id", "tournament_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_session_id_key" ON "payments"("stripe_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_payment_intent_id_key" ON "payments"("stripe_payment_intent_id");

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_shares_team_member_id_key" ON "payment_shares"("team_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_shares_token_key" ON "payment_shares"("token");

-- CreateIndex
CREATE UNIQUE INDEX "payment_shares_stripe_session_id_key" ON "payment_shares"("stripe_session_id");

-- CreateIndex
CREATE INDEX "payment_shares_team_id_status_idx" ON "payment_shares"("team_id", "status");

-- CreateIndex
CREATE INDEX "brackets_tournament_id_idx" ON "brackets"("tournament_id");

-- CreateIndex
CREATE INDEX "matches_bracket_id_round_idx" ON "matches"("bracket_id", "round");

-- CreateIndex
CREATE INDEX "matches_status_idx" ON "matches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_match_slot" ON "matches"("bracket_id", "side", "round", "position");

-- CreateIndex
CREATE INDEX "seats_tournament_id_idx" ON "seats"("tournament_id");

-- CreateIndex
CREATE INDEX "seats_zone_table_label_idx" ON "seats"("zone", "table_label");

-- CreateIndex
CREATE UNIQUE INDEX "uq_seat_label" ON "seats"("seat_label");

-- CreateIndex
CREATE UNIQUE INDEX "seat_placements_seat_id_key" ON "seat_placements"("seat_id");

-- CreateIndex
CREATE UNIQUE INDEX "seat_placements_registration_id_key" ON "seat_placements"("registration_id");

-- CreateIndex
CREATE INDEX "seat_placements_team_id_idx" ON "seat_placements"("team_id");

-- CreateIndex
CREATE INDEX "seat_placements_user_id_idx" ON "seat_placements"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_organizer_scope" ON "organizer_assignments"("user_id", "tournament_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_captain_id_fkey" FOREIGN KEY ("captain_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_checked_in_by_id_fkey" FOREIGN KEY ("checked_in_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_shares" ADD CONSTRAINT "payment_shares_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_shares" ADD CONSTRAINT "payment_shares_team_member_id_fkey" FOREIGN KEY ("team_member_id") REFERENCES "team_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brackets" ADD CONSTRAINT "brackets_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_bracket_id_fkey" FOREIGN KEY ("bracket_id") REFERENCES "brackets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_team_a_id_fkey" FOREIGN KEY ("team_a_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_team_b_id_fkey" FOREIGN KEY ("team_b_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_next_match_id_fkey" FOREIGN KEY ("next_match_id") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_loser_match_id_fkey" FOREIGN KEY ("loser_match_id") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seats" ADD CONSTRAINT "seats_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_placements" ADD CONSTRAINT "seat_placements_seat_id_fkey" FOREIGN KEY ("seat_id") REFERENCES "seats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_placements" ADD CONSTRAINT "seat_placements_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_placements" ADD CONSTRAINT "seat_placements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_placements" ADD CONSTRAINT "seat_placements_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizer_assignments" ADD CONSTRAINT "organizer_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizer_assignments" ADD CONSTRAINT "organizer_assignments_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

