-- Run after the local migration and seed reset; all fixture writes are rolled back.
BEGIN;

SELECT plan(25);

SELECT ok(to_regnamespace('buqfit') IS NOT NULL, 'BuqFit schema exists');
SELECT ok(
  EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'buqfit_runtime'),
  'BuqFit runtime role exists'
);
SELECT ok(to_regclass('buqfit.actors') IS NOT NULL, 'actors table exists');
SELECT ok(to_regclass('buqfit.resource_allocations') IS NOT NULL, 'resource allocations table exists');
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'buqfit.resource_allocations'::regclass
      AND conname = 'resource_allocations_no_overlap'
      AND contype = 'x'
  ),
  'resource allocation overlap exclusion constraint exists'
);
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'buqfit.booking_occurrences'::regclass
      AND confrelid = 'buqfit.orders'::regclass
      AND contype = 'f'
  ),
  'booking occurrences reference orders with a foreign key'
);
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'buqfit.resource_allocations'::regclass
      AND confrelid = 'buqfit.locations'::regclass
      AND contype = 'f'
  ),
  'resource allocations reference locations with a foreign key'
);

SELECT ok((SELECT count(*) FROM buqfit.actors) >= 10, 'seed includes all demo actors');
SELECT ok((SELECT count(*) FROM buqfit.services) >= 9, 'seed includes demo services');
SELECT ok((SELECT count(*) FROM buqfit.class_sessions) >= 8, 'seed includes conflict-test classes');
SELECT ok(
  EXISTS (
    SELECT 1
    FROM buqfit.actor_roles
    WHERE actor_id = '10000000-0000-4000-8000-000000000005'
      AND role = 'professional'
  )
  AND EXISTS (
    SELECT 1
    FROM buqfit.actor_roles
    WHERE actor_id = '10000000-0000-4000-8000-000000000005'
      AND role = 'space_manager'
  ),
  'seed includes an actor with both professional and space manager roles'
);

SELECT ok(has_database_privilege('buqfit_runtime', 'postgres', 'CONNECT'), 'runtime can connect to the application database');
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'buqfit_runtime'
      AND NOT rolsuper
      AND NOT rolcreatedb
      AND NOT rolcreaterole
      AND NOT rolreplication
  ),
  'runtime role has no administrative database privileges'
);
SELECT ok(has_schema_privilege('buqfit_runtime', 'buqfit', 'USAGE'), 'runtime can use the BuqFit schema');
SELECT ok(has_table_privilege('buqfit_runtime', 'buqfit.actors', 'SELECT'), 'runtime can read actors');
SELECT ok(NOT has_table_privilege('buqfit_runtime', 'buqfit.actors', 'UPDATE'), 'runtime cannot edit actor records');
SELECT ok(has_table_privilege('buqfit_runtime', 'buqfit.orders', 'INSERT'), 'runtime can create orders');
SELECT ok(has_table_privilege('buqfit_runtime', 'buqfit.orders', 'UPDATE'), 'runtime can update order state');
SELECT ok(NOT has_table_privilege('buqfit_runtime', 'buqfit.orders', 'DELETE'), 'runtime cannot delete orders');
SELECT ok(
  has_table_privilege('buqfit_runtime', 'buqfit.professional_preferences', 'UPDATE'),
  'runtime can save professional preferences'
);

SELECT throws_ok(
  $$INSERT INTO buqfit.actor_roles (actor_id, role)
    VALUES ('10000000-0000-4000-8000-000000000001', 'owner')$$,
  '23514', NULL,
  'actor role check rejects unsupported roles'
);
SELECT throws_ok(
  $$INSERT INTO buqfit.actor_roles (actor_id, role)
    VALUES ('91000000-0000-4000-8000-000000000099', 'client')$$,
  '23503', NULL,
  'actor role foreign key rejects missing actors'
);

INSERT INTO buqfit.orders (
  id, client_actor_id, professional_id, service_id, mode, seats, status
) VALUES (
  '91000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  'online', 1, 'pending'
);

SELECT throws_ok(
  $$INSERT INTO buqfit.seat_allocations (
      order_id, class_session_id, client_actor_id, seats, status
    ) VALUES (
      '91000000-0000-4000-8000-000000000001',
      '60000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001',
      0,
      'held'
    )$$,
  '23514', NULL,
  'seat allocation check rejects zero seats'
);

INSERT INTO buqfit.resource_allocations (
  resource_kind, resource_id, location_id, service_date, starts_at, ends_at, order_id, status
) VALUES (
  'professional',
  '30000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000008',
  current_date + 30,
  ((current_date + 30) + time '10:00') AT TIME ZONE 'Europe/Madrid',
  ((current_date + 30) + time '11:00') AT TIME ZONE 'Europe/Madrid',
  '91000000-0000-4000-8000-000000000001',
  'confirmed'
);
SELECT throws_ok(
  $$INSERT INTO buqfit.resource_allocations (
      resource_kind, resource_id, location_id, service_date, starts_at, ends_at, order_id, status
    ) VALUES (
      'professional',
      '30000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000008',
      current_date + 30,
      ((current_date + 30) + time '10:00') AT TIME ZONE 'Europe/Madrid',
      ((current_date + 30) + time '11:00') AT TIME ZONE 'Europe/Madrid',
      '91000000-0000-4000-8000-000000000001',
      'confirmed'
    )$$,
  '23P01', NULL,
  'active allocation cannot overlap an existing professional allocation'
);
SELECT lives_ok(
  $$INSERT INTO buqfit.resource_allocations (
      resource_kind, resource_id, location_id, service_date, starts_at, ends_at, order_id, status
    ) VALUES (
      'professional',
      '30000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000008',
      current_date + 30,
      ((current_date + 30) + time '10:30') AT TIME ZONE 'Europe/Madrid',
      ((current_date + 30) + time '10:45') AT TIME ZONE 'Europe/Madrid',
      '91000000-0000-4000-8000-000000000001',
      'released'
    )$$,
  'released allocations do not block a resource time range'
);

SELECT * FROM finish();
ROLLBACK;
