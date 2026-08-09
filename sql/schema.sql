-- ═══════════════════════════════════════════════════════════════
--  R.A.G.E LAN 2 — Schéma PostgreSQL complet (DDL autonome)
--  Équivalent SQL pur de prisma/schema.prisma.
--  Usage : psql -U rage -d rage_lan_2 -f sql/schema.sql
-- ═══════════════════════════════════════════════════════════════

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- recherche floue pour le check-in

-- ─────────────────────────── ENUMS ───────────────────────────

CREATE TYPE role                AS ENUM ('PLAYER','ORGANIZER','ADMIN','SUPER_ADMIN');
CREATE TYPE payment_status      AS ENUM ('PENDING','PAID_ONLINE','PAY_ON_SITE','PAID_ON_SITE','REFUNDED');
CREATE TYPE registration_status AS ENUM ('PENDING','CONFIRMED','WAITLIST','CHECKED_IN','CANCELLED','NO_SHOW');
CREATE TYPE registration_type   AS ENUM ('TEAM_CAPTAIN','TEAM_MEMBER','SOLO');
CREATE TYPE seat_format         AS ENUM ('FIXED','ROTATION');
CREATE TYPE bracket_type        AS ENUM ('SINGLE_ELIMINATION','DOUBLE_ELIMINATION','GROUPS_THEN_PLAYOFFS','ROUND_ROBIN','SWISS');
CREATE TYPE bracket_status      AS ENUM ('DRAFT','SEEDING','RUNNING','COMPLETED');
CREATE TYPE match_status        AS ENUM ('PENDING','READY','IN_PROGRESS','COMPLETED','WALKOVER','CANCELLED');
CREATE TYPE bracket_side        AS ENUM ('WINNERS','LOSERS','GRAND_FINAL','GROUP');
CREATE TYPE seat_kind           AS ENUM ('PC','CONSOLE','TABLE_TCG','STAFF','FREEPLAY');

-- Fonction générique de maintien de updated_at
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────── USERS ───────────────────────────

CREATE TABLE users (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email          citext NOT NULL UNIQUE,
  password_hash  text NOT NULL,
  first_name     varchar(80) NOT NULL,
  last_name      varchar(80) NOT NULL,
  pseudo         varchar(40) UNIQUE,

  birth_date     date NOT NULL,
  phone          varchar(30) NOT NULL,

  address_line   varchar(180) NOT NULL,
  postal_code    varchar(12) NOT NULL,
  city           varchar(90) NOT NULL,
  country        varchar(80) NOT NULL DEFAULT 'France',

  role           role NOT NULL DEFAULT 'PLAYER',
  email_verified timestamptz,
  avatar_url     text,

  guardian_name  varchar(160),
  guardian_phone varchar(30),

  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT users_email_format CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT users_birth_date_sane CHECK (birth_date > DATE '1920-01-01' AND birth_date < CURRENT_DATE),
  -- Un mineur doit déclarer un responsable légal.
  CONSTRAINT users_guardian_required_for_minors CHECK (
    birth_date <= (CURRENT_DATE - INTERVAL '18 years')
    OR (guardian_name IS NOT NULL AND guardian_phone IS NOT NULL)
  )
);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_name ON users(last_name, first_name);
CREATE INDEX idx_users_search ON users USING gin ((first_name || ' ' || last_name || ' ' || coalesce(pseudo,'')) gin_trgm_ops);
CREATE TRIGGER trg_users_touch BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE sessions (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  user_agent text,
  ip         inet,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expiry ON sessions(expires_at);

-- ───────────────────────── TOURNAMENTS ───────────────────────

CREATE TABLE tournaments (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug              varchar(60) NOT NULL UNIQUE,
  name              varchar(120) NOT NULL,
  tagline           varchar(180) NOT NULL,
  platform          varchar(40) NOT NULL,

  max_players       integer NOT NULL,
  table_count       integer NOT NULL,
  chair_count       integer NOT NULL,
  team_size         integer NOT NULL DEFAULT 1,
  max_teams         integer NOT NULL DEFAULT 0,
  seat_format       seat_format NOT NULL DEFAULT 'FIXED',
  players_per_table integer,

  format_label      varchar(160) NOT NULL,
  bracket_type      bracket_type NOT NULL DEFAULT 'SINGLE_ELIMINATION',

  entry_fee_cents   integer NOT NULL DEFAULT 0,
  accent_from       varchar(9) NOT NULL DEFAULT '#FF2A2A',
  accent_to         varchar(9) NOT NULL DEFAULT '#FF6B00',
  cover_image       text,
  rules_url         text,
  sort_order        integer NOT NULL DEFAULT 0,

  registration_open boolean NOT NULL DEFAULT true,
  starts_at         timestamptz,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT tournaments_positive_capacity CHECK (max_players > 0 AND table_count > 0 AND chair_count > 0),
  CONSTRAINT tournaments_team_size CHECK (team_size >= 1),
  CONSTRAINT tournaments_entry_fee CHECK (entry_fee_cents >= 0),
  -- En places fixes, il faut au moins une chaise par joueur inscrit.
  CONSTRAINT tournaments_fixed_seats_cover_players CHECK (
    seat_format <> 'FIXED' OR chair_count >= max_players
  )
);
CREATE INDEX idx_tournaments_sort ON tournaments(sort_order);
CREATE TRIGGER trg_tournaments_touch BEFORE UPDATE ON tournaments FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE event_settings (
  id                     integer PRIMARY KEY DEFAULT 1,
  event_name             text NOT NULL DEFAULT 'R.A.G.E LAN 2',
  registrations_open     boolean NOT NULL DEFAULT true,
  registrations_close_at timestamptz,
  venue_name             text NOT NULL DEFAULT '',
  venue_address          text NOT NULL DEFAULT '',
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_settings_singleton CHECK (id = 1)
);
INSERT INTO event_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ─────────────────────────── TEAMS ───────────────────────────

CREATE TABLE teams (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  captain_id    uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name          varchar(60) NOT NULL,
  tag           varchar(8),
  logo_url      text,
  seed          integer,
  checked_in    boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_team_name_per_tournament UNIQUE (tournament_id, name),
  CONSTRAINT uq_team_seed_per_tournament UNIQUE (tournament_id, seed),
  CONSTRAINT teams_seed_positive CHECK (seed IS NULL OR seed > 0)
);
CREATE INDEX idx_teams_captain ON teams(captain_id);
CREATE TRIGGER trg_teams_touch BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE team_members (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id       uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES users(id) ON DELETE SET NULL,
  first_name    varchar(80) NOT NULL,
  last_name     varchar(80) NOT NULL,
  pseudo        varchar(40) NOT NULL,
  email         citext NOT NULL,
  phone         varchar(30),
  birth_date    date,
  is_captain    boolean NOT NULL DEFAULT false,
  is_substitute boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_member_email_per_team UNIQUE (team_id, email)
);
CREATE INDEX idx_team_members_user ON team_members(user_id);
-- Un seul capitaine par équipe.
CREATE UNIQUE INDEX uq_single_captain_per_team ON team_members(team_id) WHERE is_captain;

-- Le roster ne doit pas dépasser team_size + 2 remplaçants.
CREATE OR REPLACE FUNCTION enforce_roster_size() RETURNS trigger AS $$
DECLARE
  limit_size integer;
  current_size integer;
BEGIN
  SELECT t.team_size + 2 INTO limit_size
  FROM teams tm JOIN tournaments t ON t.id = tm.tournament_id
  WHERE tm.id = NEW.team_id;

  SELECT count(*) INTO current_size FROM team_members WHERE team_id = NEW.team_id;

  IF current_size >= limit_size THEN
    RAISE EXCEPTION 'Roster complet : % joueurs maximum pour cette équipe', limit_size;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_roster_size BEFORE INSERT ON team_members
  FOR EACH ROW EXECUTE FUNCTION enforce_roster_size();

-- ────────────────────── REGISTRATIONS ────────────────────────

CREATE TABLE registrations (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tournament_id    uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id          uuid REFERENCES teams(id) ON DELETE SET NULL,

  type             registration_type NOT NULL DEFAULT 'SOLO',
  status           registration_status NOT NULL DEFAULT 'PENDING',
  payment_status   payment_status NOT NULL DEFAULT 'PENDING',

  ign              varchar(60),
  notes            text,

  checked_in_at    timestamptz,
  checked_in_by_id uuid REFERENCES users(id) ON DELETE SET NULL,

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_registration_user_tournament UNIQUE (user_id, tournament_id),
  -- Une inscription en équipe doit référencer une équipe.
  CONSTRAINT registrations_team_required CHECK (
    type = 'SOLO' OR team_id IS NOT NULL
  ),
  CONSTRAINT registrations_checkin_coherent CHECK (
    (status <> 'CHECKED_IN') OR checked_in_at IS NOT NULL
  )
);
CREATE INDEX idx_registrations_tournament_status ON registrations(tournament_id, status);
CREATE INDEX idx_registrations_team ON registrations(team_id);
CREATE INDEX idx_registrations_payment ON registrations(payment_status);
CREATE TRIGGER trg_registrations_touch BEFORE UPDATE ON registrations FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- L'équipe référencée doit appartenir au même tournoi que l'inscription.
CREATE OR REPLACE FUNCTION enforce_registration_team_tournament() RETURNS trigger AS $$
DECLARE
  team_tournament uuid;
BEGIN
  IF NEW.team_id IS NULL THEN RETURN NEW; END IF;
  SELECT tournament_id INTO team_tournament FROM teams WHERE id = NEW.team_id;
  IF team_tournament <> NEW.tournament_id THEN
    RAISE EXCEPTION 'L''équipe % n''appartient pas au tournoi %', NEW.team_id, NEW.tournament_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_registration_team_tournament
  BEFORE INSERT OR UPDATE OF team_id, tournament_id ON registrations
  FOR EACH ROW EXECUTE FUNCTION enforce_registration_team_tournament();

-- Bascule automatique en liste d'attente quand le tournoi est plein.
CREATE OR REPLACE FUNCTION enforce_tournament_capacity() RETURNS trigger AS $$
DECLARE
  capacity integer;
  taken integer;
BEGIN
  SELECT max_players INTO capacity FROM tournaments WHERE id = NEW.tournament_id;
  SELECT count(*) INTO taken FROM registrations
    WHERE tournament_id = NEW.tournament_id
      AND status IN ('PENDING','CONFIRMED','CHECKED_IN')
      AND id <> NEW.id;

  IF taken >= capacity AND NEW.status IN ('PENDING','CONFIRMED') THEN
    NEW.status := 'WAITLIST';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tournament_capacity
  BEFORE INSERT ON registrations
  FOR EACH ROW EXECUTE FUNCTION enforce_tournament_capacity();

-- ────────────────────────── PAYMENTS ─────────────────────────

CREATE TABLE payments (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  registration_id          uuid REFERENCES registrations(id) ON DELETE SET NULL,
  amount_cents             integer NOT NULL,
  currency                 char(3) NOT NULL DEFAULT 'EUR',
  status                   payment_status NOT NULL DEFAULT 'PENDING',
  method                   varchar(20) NOT NULL DEFAULT 'stripe',
  stripe_session_id        text UNIQUE,
  stripe_payment_intent_id text UNIQUE,
  collected_by_id          uuid REFERENCES users(id) ON DELETE SET NULL,
  paid_at                  timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT payments_amount_positive CHECK (amount_cents >= 0),
  CONSTRAINT payments_method_valid CHECK (method IN ('stripe','cash','card_on_site')),
  CONSTRAINT payments_paid_at_set CHECK (
    status NOT IN ('PAID_ONLINE','PAID_ON_SITE') OR paid_at IS NOT NULL
  )
);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE TRIGGER trg_payments_touch BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ─────────────────── BRACKETS & MATCHS ───────────────────────

CREATE TABLE brackets (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id     uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name              varchar(90) NOT NULL DEFAULT 'Arbre principal',
  type              bracket_type NOT NULL DEFAULT 'SINGLE_ELIMINATION',
  status            bracket_status NOT NULL DEFAULT 'DRAFT',
  rounds_count      integer NOT NULL DEFAULT 0,
  third_place_match boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_brackets_tournament ON brackets(tournament_id);
CREATE TRIGGER trg_brackets_touch BEFORE UPDATE ON brackets FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE matches (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bracket_id       uuid NOT NULL REFERENCES brackets(id) ON DELETE CASCADE,

  round            integer NOT NULL,
  position         integer NOT NULL,
  side             bracket_side NOT NULL DEFAULT 'WINNERS',
  group_label      varchar(20),
  best_of          integer NOT NULL DEFAULT 1,

  team_a_id        uuid REFERENCES teams(id) ON DELETE SET NULL,
  team_b_id        uuid REFERENCES teams(id) ON DELETE SET NULL,
  score_a          integer NOT NULL DEFAULT 0,
  score_b          integer NOT NULL DEFAULT 0,

  winner_id        uuid REFERENCES teams(id) ON DELETE SET NULL,
  status           match_status NOT NULL DEFAULT 'PENDING',

  next_match_id    uuid REFERENCES matches(id) ON DELETE SET NULL,
  next_match_slot  char(1),
  loser_match_id   uuid REFERENCES matches(id) ON DELETE SET NULL,
  loser_match_slot char(1),

  scheduled_at     timestamptz,
  station_label    varchar(40),
  reported_by_id   uuid REFERENCES users(id) ON DELETE SET NULL,

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_match_slot UNIQUE (bracket_id, side, round, position),
  CONSTRAINT matches_round_positive CHECK (round >= 1 AND position >= 0),
  CONSTRAINT matches_scores_positive CHECK (score_a >= 0 AND score_b >= 0),
  CONSTRAINT matches_best_of_odd CHECK (best_of % 2 = 1),
  CONSTRAINT matches_slot_letters CHECK (
    (next_match_slot IS NULL OR next_match_slot IN ('A','B'))
    AND (loser_match_slot IS NULL OR loser_match_slot IN ('A','B'))
  ),
  -- Deux équipes différentes, et un vainqueur qui joue bien le match.
  CONSTRAINT matches_distinct_teams CHECK (team_a_id IS NULL OR team_b_id IS NULL OR team_a_id <> team_b_id),
  CONSTRAINT matches_winner_is_participant CHECK (
    winner_id IS NULL OR winner_id = team_a_id OR winner_id = team_b_id
  ),
  CONSTRAINT matches_completed_needs_winner CHECK (
    status <> 'COMPLETED' OR winner_id IS NOT NULL
  ),
  CONSTRAINT matches_no_self_progression CHECK (next_match_id IS NULL OR next_match_id <> id)
);
CREATE INDEX idx_matches_bracket_round ON matches(bracket_id, round);
CREATE INDEX idx_matches_status ON matches(status);
CREATE TRIGGER trg_matches_touch BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Propagation automatique du vainqueur (et du perdant en double élim).
CREATE OR REPLACE FUNCTION propagate_match_result() RETURNS trigger AS $$
DECLARE
  loser uuid;
BEGIN
  IF NEW.status <> 'COMPLETED' OR NEW.winner_id IS NULL THEN RETURN NEW; END IF;
  IF OLD.status = 'COMPLETED' AND OLD.winner_id = NEW.winner_id THEN RETURN NEW; END IF;

  loser := CASE WHEN NEW.winner_id = NEW.team_a_id THEN NEW.team_b_id ELSE NEW.team_a_id END;

  IF NEW.next_match_id IS NOT NULL THEN
    IF NEW.next_match_slot = 'A' THEN
      UPDATE matches SET team_a_id = NEW.winner_id WHERE id = NEW.next_match_id;
    ELSE
      UPDATE matches SET team_b_id = NEW.winner_id WHERE id = NEW.next_match_id;
    END IF;
  END IF;

  IF NEW.loser_match_id IS NOT NULL AND loser IS NOT NULL THEN
    IF NEW.loser_match_slot = 'A' THEN
      UPDATE matches SET team_a_id = loser WHERE id = NEW.loser_match_id;
    ELSE
      UPDATE matches SET team_b_id = loser WHERE id = NEW.loser_match_id;
    END IF;
  END IF;

  -- Un match dont les deux slots sont remplis passe à READY.
  UPDATE matches SET status = 'READY'
  WHERE id IN (NEW.next_match_id, NEW.loser_match_id)
    AND team_a_id IS NOT NULL AND team_b_id IS NOT NULL
    AND status = 'PENDING';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_propagate_result AFTER UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION propagate_match_result();

-- ─────────────────── PLAN DE SALLE / SIÈGES ──────────────────

CREATE TABLE seats (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  zone          varchar(40) NOT NULL,
  table_label   varchar(20) NOT NULL,
  seat_label    varchar(20) NOT NULL,
  kind          seat_kind NOT NULL DEFAULT 'PC',
  x             real NOT NULL DEFAULT 0,
  y             real NOT NULL DEFAULT 0,
  rotation      real NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_seat_label UNIQUE (seat_label),
  CONSTRAINT seats_coords_in_plan CHECK (x >= 0 AND x <= 100 AND y >= 0 AND y <= 100)
);
CREATE INDEX idx_seats_tournament ON seats(tournament_id);
CREATE INDEX idx_seats_zone_table ON seats(zone, table_label);

CREATE TABLE seat_placements (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  seat_id         uuid NOT NULL UNIQUE REFERENCES seats(id) ON DELETE CASCADE,
  registration_id uuid UNIQUE REFERENCES registrations(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES users(id) ON DELETE SET NULL,
  team_id         uuid REFERENCES teams(id) ON DELETE SET NULL,
  assigned_by_id  uuid REFERENCES users(id) ON DELETE SET NULL,
  assigned_at     timestamptz NOT NULL DEFAULT now(),
  note            varchar(120),

  CONSTRAINT seat_placements_has_occupant CHECK (
    registration_id IS NOT NULL OR user_id IS NOT NULL OR team_id IS NOT NULL
  )
);
CREATE INDEX idx_seat_placements_team ON seat_placements(team_id);
CREATE INDEX idx_seat_placements_user ON seat_placements(user_id);

-- Le siège attribué doit relever du tournoi de l'inscription.
CREATE OR REPLACE FUNCTION enforce_seat_tournament_match() RETURNS trigger AS $$
DECLARE
  seat_tournament uuid;
  reg_tournament  uuid;
BEGIN
  IF NEW.registration_id IS NULL THEN RETURN NEW; END IF;
  SELECT tournament_id INTO seat_tournament FROM seats WHERE id = NEW.seat_id;
  SELECT tournament_id INTO reg_tournament FROM registrations WHERE id = NEW.registration_id;
  IF seat_tournament IS NOT NULL AND seat_tournament <> reg_tournament THEN
    RAISE EXCEPTION 'Siège réservé à un autre tournoi';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_seat_tournament_match
  BEFORE INSERT OR UPDATE ON seat_placements
  FOR EACH ROW EXECUTE FUNCTION enforce_seat_tournament_match();

-- ──────────────── STAFF / ORGANISATEURS / AUDIT ──────────────

CREATE TABLE organizer_assignments (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tournament_id       uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  can_manage_bracket  boolean NOT NULL DEFAULT true,
  can_check_in        boolean NOT NULL DEFAULT true,
  can_collect_payment boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_organizer_scope UNIQUE (user_id, tournament_id)
);

CREATE TABLE audit_logs (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  action      varchar(60) NOT NULL,
  entity_type varchar(40) NOT NULL,
  entity_id   text,
  payload     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- ───────────────────────── VUES UTILES ───────────────────────

-- Tableau de bord admin : remplissage par tournoi.
CREATE VIEW v_tournament_capacity AS
SELECT
  t.id,
  t.slug,
  t.name,
  t.max_players,
  t.table_count,
  t.chair_count,
  t.seat_format,
  count(r.id) FILTER (WHERE r.status IN ('PENDING','CONFIRMED','CHECKED_IN')) AS registered,
  count(r.id) FILTER (WHERE r.status = 'CHECKED_IN')                          AS checked_in,
  count(r.id) FILTER (WHERE r.status = 'WAITLIST')                            AS waitlisted,
  count(r.id) FILTER (WHERE r.payment_status IN ('PAID_ONLINE','PAID_ON_SITE')) AS paid,
  t.max_players - count(r.id) FILTER (WHERE r.status IN ('PENDING','CONFIRMED','CHECKED_IN')) AS slots_left
FROM tournaments t
LEFT JOIN registrations r ON r.tournament_id = t.id
GROUP BY t.id;

-- Source de la fiche de présence PDF.
CREATE VIEW v_attendance_sheet AS
SELECT
  t.slug          AS tournament_slug,
  t.name          AS tournament_name,
  tm.name         AS team_name,
  u.last_name,
  u.first_name,
  u.pseudo,
  r.ign,
  u.phone,
  r.status,
  r.payment_status,
  s.seat_label,
  s.table_label,
  s.zone
FROM registrations r
JOIN tournaments t ON t.id = r.tournament_id
JOIN users u       ON u.id = r.user_id
LEFT JOIN teams tm ON tm.id = r.team_id
LEFT JOIN seat_placements sp ON sp.registration_id = r.id
LEFT JOIN seats s  ON s.id = sp.seat_id
WHERE r.status <> 'CANCELLED'
ORDER BY t.name, tm.name NULLS LAST, u.last_name, u.first_name;

COMMIT;
