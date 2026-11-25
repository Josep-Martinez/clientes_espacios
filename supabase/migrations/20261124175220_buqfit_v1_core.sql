-- All marketplace data lives outside Supabase's exposed Data API schemas.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE SCHEMA IF NOT EXISTS bookfit;
REVOKE ALL ON SCHEMA bookfit FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON SCHEMA bookfit FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON SCHEMA bookfit FROM authenticated;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bookfit_runtime') THEN
    CREATE ROLE bookfit_runtime LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
  END IF;
END;
$$;

CREATE TABLE bookfit.actors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 120),
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE bookfit.actor_roles (
  actor_id uuid NOT NULL REFERENCES bookfit.actors(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('client', 'professional', 'space_manager')),
  PRIMARY KEY (actor_id, role)
);

CREATE TABLE bookfit.auth_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES bookfit.actors(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (length(provider) BETWEEN 1 AND 60),
  subject text NOT NULL CHECK (length(subject) BETWEEN 1 AND 255),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, subject)
);
CREATE INDEX auth_identities_actor_idx ON bookfit.auth_identities(actor_id);

CREATE TABLE bookfit.dev_sessions (
  token_hash text PRIMARY KEY CHECK (length(token_hash) = 64),
  actor_id uuid NOT NULL REFERENCES bookfit.actors(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dev_sessions_actor_expiry_idx ON bookfit.dev_sessions(actor_id, expires_at);

CREATE TABLE bookfit.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  x_km numeric(7,2) NOT NULL DEFAULT 0,
  y_km numeric(7,2) NOT NULL DEFAULT 0,
  is_online boolean NOT NULL DEFAULT false
);

CREATE TABLE bookfit.professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL UNIQUE REFERENCES bookfit.actors(id),
  slug text NOT NULL UNIQUE,
  headline text NOT NULL,
  bio text NOT NULL,
  public_zone text NOT NULL,
  public_location_id uuid NOT NULL REFERENCES bookfit.locations(id),
  rating numeric(2,1) NOT NULL CHECK (rating BETWEEN 0 AND 5),
  review_count integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  categories text[] NOT NULL DEFAULT '{}'
);

CREATE TABLE bookfit.professional_preferences (
  professional_id uuid PRIMARY KEY REFERENCES bookfit.professionals(id) ON DELETE CASCADE,
  base_location_id uuid NOT NULL REFERENCES bookfit.locations(id),
  max_radius_km numeric(6,2) NOT NULL DEFAULT 0 CHECK (max_radius_km BETWEEN 0 AND 200),
  max_travel_minutes integer NOT NULL DEFAULT 0 CHECK (max_travel_minutes BETWEEN 0 AND 360),
  buffer_minutes integer NOT NULL DEFAULT 0 CHECK (buffer_minutes BETWEEN 0 AND 180),
  modalities text[] NOT NULL DEFAULT '{}',
  CHECK (modalities <@ ARRAY['room','gym','home','online']::text[])
);

CREATE TABLE bookfit.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES bookfit.professionals(id),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  service_format text NOT NULL CHECK (service_format IN ('individual', 'group')),
  duration_minutes integer NOT NULL CHECK (duration_minutes BETWEEN 10 AND 480),
  price_cents integer NOT NULL CHECK (price_cents > 0),
  modalities text[] NOT NULL CHECK (cardinality(modalities) > 0 AND modalities <@ ARRAY['room','gym','home','online']::text[]),
  required_equipment text[] NOT NULL DEFAULT '{}',
  group_capacity integer CHECK (group_capacity IS NULL OR group_capacity > 0),
  class_activity text,
  CHECK ((service_format = 'group' AND group_capacity IS NOT NULL) OR service_format = 'individual')
);
CREATE INDEX services_professional_idx ON bookfit.services(professional_id);
CREATE INDEX services_category_idx ON bookfit.services(category);

CREATE TABLE bookfit.spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('room', 'gym')),
  location_id uuid NOT NULL REFERENCES bookfit.locations(id),
  capacity integer NOT NULL CHECK (capacity > 0),
  equipment text[] NOT NULL DEFAULT '{}',
  amenities text[] NOT NULL DEFAULT '{}',
  description text NOT NULL,
  price_per_occurrence_cents integer NOT NULL CHECK (price_per_occurrence_cents >= 0),
  access_instructions text NOT NULL
);

CREATE TABLE bookfit.space_memberships (
  space_id uuid NOT NULL REFERENCES bookfit.spaces(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES bookfit.actors(id) ON DELETE CASCADE,
  membership_role text NOT NULL DEFAULT 'manager' CHECK (membership_role IN ('owner', 'manager')),
  PRIMARY KEY (space_id, actor_id)
);
CREATE INDEX space_memberships_actor_idx ON bookfit.space_memberships(actor_id, space_id);

CREATE TABLE bookfit.space_opening_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES bookfit.spaces(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  opens_at time NOT NULL,
  closes_at time NOT NULL,
  CHECK (opens_at < closes_at),
  UNIQUE (space_id, weekday)
);

CREATE TABLE bookfit.space_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES bookfit.spaces(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reason text,
  CHECK (starts_at < ends_at)
);
CREATE INDEX space_blocks_period_idx ON bookfit.space_blocks(space_id, starts_at, ends_at);

CREATE TABLE bookfit.professional_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES bookfit.professionals(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  opens_at time NOT NULL,
  closes_at time NOT NULL,
  CHECK (opens_at < closes_at),
  UNIQUE (professional_id, weekday)
);

CREATE TABLE bookfit.professional_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES bookfit.professionals(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reason text,
  CHECK (starts_at < ends_at)
);
CREATE INDEX professional_blocks_period_idx ON bookfit.professional_blocks(professional_id, starts_at, ends_at);

CREATE TABLE bookfit.class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES bookfit.services(id),
  professional_id uuid NOT NULL REFERENCES bookfit.professionals(id),
  space_id uuid NOT NULL REFERENCES bookfit.spaces(id),
  service_date date NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  capacity integer NOT NULL CHECK (capacity > 0),
  CHECK (starts_at < ends_at),
  UNIQUE (service_id, service_date, starts_at)
);
CREATE INDEX class_sessions_date_idx ON bookfit.class_sessions(service_date, starts_at);

CREATE TABLE bookfit.resource_day_locks (
  resource_kind text NOT NULL CHECK (resource_kind IN ('professional', 'space')),
  resource_id uuid NOT NULL,
  service_date date NOT NULL,
  PRIMARY KEY (resource_kind, resource_id, service_date)
);

CREATE TABLE bookfit.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_actor_id uuid NOT NULL REFERENCES bookfit.actors(id),
  professional_id uuid NOT NULL REFERENCES bookfit.professionals(id),
  service_id uuid NOT NULL REFERENCES bookfit.services(id),
  space_id uuid REFERENCES bookfit.spaces(id),
  mode text NOT NULL CHECK (mode IN ('room', 'gym', 'home', 'online')),
  seats integer NOT NULL CHECK (seats > 0),
  currency char(3) NOT NULL DEFAULT 'EUR' CHECK (currency = 'EUR'),
  status text NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'cancelled')),
  subtotal_service_cents integer NOT NULL DEFAULT 0 CHECK (subtotal_service_cents >= 0),
  service_commission_cents integer NOT NULL DEFAULT 0 CHECK (service_commission_cents >= 0),
  subtotal_space_cents integer NOT NULL DEFAULT 0 CHECK (subtotal_space_cents >= 0),
  space_commission_cents integer NOT NULL DEFAULT 0 CHECK (space_commission_cents >= 0),
  total_cents integer NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_client_status_idx ON bookfit.orders(client_actor_id, status, created_at DESC);
CREATE INDEX orders_professional_idx ON bookfit.orders(professional_id, status);
CREATE INDEX orders_space_idx ON bookfit.orders(space_id, status) WHERE space_id IS NOT NULL;

CREATE TABLE bookfit.booking_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES bookfit.orders(id) ON DELETE CASCADE,
  class_session_id uuid REFERENCES bookfit.class_sessions(id),
  service_date date NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  location_id uuid NOT NULL REFERENCES bookfit.locations(id),
  x_service_cents integer NOT NULL CHECK (x_service_cents >= 0),
  z_service_commission_cents integer NOT NULL CHECK (z_service_commission_cents >= 0),
  y_space_cents integer NOT NULL CHECK (y_space_cents >= 0),
  w_space_commission_cents integer NOT NULL CHECK (w_space_commission_cents >= 0),
  CHECK (starts_at < ends_at),
  UNIQUE (order_id, service_date, starts_at)
);
CREATE INDEX booking_occurrences_period_idx ON bookfit.booking_occurrences(service_date, starts_at, status);
CREATE INDEX booking_occurrences_order_idx ON bookfit.booking_occurrences(order_id, service_date);

CREATE TABLE bookfit.order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id uuid NOT NULL REFERENCES bookfit.booking_occurrences(id) ON DELETE CASCADE,
  line_type text NOT NULL CHECK (line_type IN ('service', 'service_commission', 'space', 'space_commission')),
  description text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency char(3) NOT NULL DEFAULT 'EUR',
  UNIQUE (occurrence_id, line_type)
);

CREATE TABLE bookfit.checkout_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES bookfit.orders(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('active', 'confirmed', 'released', 'expired')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX checkout_holds_expiry_idx ON bookfit.checkout_holds(status, expires_at);

CREATE TABLE bookfit.resource_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_kind text NOT NULL CHECK (resource_kind IN ('professional', 'space')),
  resource_id uuid NOT NULL,
  location_id uuid NOT NULL REFERENCES bookfit.locations(id),
  service_date date NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  order_id uuid REFERENCES bookfit.orders(id) ON DELETE CASCADE,
  class_session_id uuid REFERENCES bookfit.class_sessions(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('held', 'confirmed', 'released', 'expired')),
  CHECK (starts_at < ends_at),
  CHECK (num_nonnulls(order_id, class_session_id) = 1)
);
ALTER TABLE bookfit.resource_allocations ADD CONSTRAINT resource_allocations_no_overlap
  EXCLUDE USING gist (
    resource_kind WITH =,
    resource_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status IN ('held', 'confirmed'));
CREATE INDEX resource_allocations_day_idx ON bookfit.resource_allocations(resource_kind, resource_id, service_date, status);
CREATE INDEX resource_allocations_order_idx ON bookfit.resource_allocations(order_id) WHERE order_id IS NOT NULL;

CREATE TABLE bookfit.seat_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES bookfit.orders(id) ON DELETE CASCADE,
  class_session_id uuid NOT NULL REFERENCES bookfit.class_sessions(id),
  client_actor_id uuid NOT NULL REFERENCES bookfit.actors(id),
  seats integer NOT NULL CHECK (seats > 0),
  status text NOT NULL CHECK (status IN ('held', 'confirmed', 'released', 'expired')),
  UNIQUE (order_id, class_session_id)
);
CREATE INDEX seat_allocations_session_status_idx ON bookfit.seat_allocations(class_session_id, status);

CREATE TABLE bookfit.gym_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_actor_id uuid NOT NULL REFERENCES bookfit.actors(id),
  space_id uuid NOT NULL REFERENCES bookfit.spaces(id),
  order_id uuid NOT NULL REFERENCES bookfit.orders(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('reserved', 'consumed', 'released')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX gym_entitlements_one_first_visit_idx
  ON bookfit.gym_entitlements(client_actor_id, space_id) WHERE status IN ('reserved', 'consumed');

CREATE TABLE bookfit.waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_actor_id uuid NOT NULL REFERENCES bookfit.actors(id),
  class_session_id uuid NOT NULL REFERENCES bookfit.class_sessions(id),
  seats integer NOT NULL DEFAULT 1 CHECK (seats > 0),
  status text NOT NULL CHECK (status IN ('waiting', 'withdrawn', 'notified')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX waitlist_one_active_entry_idx
  ON bookfit.waitlist_entries(client_actor_id, class_session_id) WHERE status = 'waiting';

CREATE TABLE bookfit.payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES bookfit.orders(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('fake', 'stripe')),
  provider_reference text UNIQUE,
  status text NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'expired')),
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency char(3) NOT NULL DEFAULT 'EUR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE bookfit.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('fake', 'stripe')),
  provider_event_id text NOT NULL,
  payment_attempt_id uuid NOT NULL REFERENCES bookfit.payment_attempts(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id)
);

CREATE TABLE bookfit.idempotency_keys (
  actor_id uuid NOT NULL REFERENCES bookfit.actors(id) ON DELETE CASCADE,
  operation text NOT NULL,
  key text NOT NULL CHECK (length(key) BETWEEN 8 AND 160),
  request_hash text NOT NULL CHECK (length(request_hash) = 64),
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, operation, key)
);

CREATE TABLE bookfit.information_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_occurrence_id uuid NOT NULL REFERENCES bookfit.booking_occurrences(id) ON DELETE CASCADE,
  sender_actor_id uuid NOT NULL REFERENCES bookfit.actors(id),
  recipient_actor_id uuid NOT NULL REFERENCES bookfit.actors(id),
  recipient_kind text NOT NULL CHECK (recipient_kind IN ('client', 'space_manager')),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 1200),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX information_requests_recipient_idx ON bookfit.information_requests(recipient_actor_id, created_at DESC);
CREATE INDEX information_requests_sender_idx ON bookfit.information_requests(sender_actor_id, created_at DESC);

CREATE TABLE bookfit.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES bookfit.actors(id),
  action text NOT NULL,
  entity_kind text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_entity_idx ON bookfit.audit_events(entity_kind, entity_id, created_at DESC);

GRANT CONNECT ON DATABASE postgres TO bookfit_runtime;
GRANT USAGE ON SCHEMA bookfit TO bookfit_runtime;
GRANT SELECT ON
  bookfit.actors, bookfit.actor_roles, bookfit.dev_sessions,
  bookfit.locations, bookfit.professionals, bookfit.professional_preferences, bookfit.services,
  bookfit.spaces, bookfit.space_memberships, bookfit.space_opening_hours, bookfit.space_blocks,
  bookfit.professional_hours, bookfit.professional_blocks, bookfit.class_sessions,
  bookfit.resource_day_locks, bookfit.orders, bookfit.booking_occurrences, bookfit.order_lines,
  bookfit.checkout_holds, bookfit.resource_allocations, bookfit.seat_allocations,
  bookfit.gym_entitlements, bookfit.waitlist_entries, bookfit.payment_attempts,
  bookfit.payment_events, bookfit.idempotency_keys, bookfit.information_requests, bookfit.audit_events
TO bookfit_runtime;
GRANT INSERT, UPDATE ON bookfit.dev_sessions TO bookfit_runtime;
GRANT INSERT ON bookfit.resource_day_locks TO bookfit_runtime;
GRANT INSERT, UPDATE ON
  bookfit.orders, bookfit.booking_occurrences, bookfit.checkout_holds, bookfit.resource_allocations,
  bookfit.seat_allocations, bookfit.gym_entitlements, bookfit.waitlist_entries, bookfit.payment_attempts,
  bookfit.idempotency_keys, bookfit.information_requests
TO bookfit_runtime;
GRANT INSERT ON bookfit.order_lines, bookfit.payment_events, bookfit.audit_events TO bookfit_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA bookfit
  GRANT SELECT ON TABLES TO bookfit_runtime;
