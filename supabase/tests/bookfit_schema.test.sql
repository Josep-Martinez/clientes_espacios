-- Run after the local migration and seed reset; all fixture writes are rolled back.
BEGIN;

SELECT plan(28);

SELECT ok(to_regnamespace('bookfit') IS NOT NULL, 'BookFit schema exists');
SELECT ok(to_regclass('bookfit.actors') IS NOT NULL, 'actors table exists');
SELECT ok(to_regclass('bookfit.resource_allocations') IS NOT NULL, 'resource allocations table exists');
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'bookfit.resource_allocations'::regclass
      AND conname = 'resource_allocations_no_overlap'
      AND contype = 'x'
  ),
  'resource allocation overlap exclusion constraint exists'
);
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'bookfit.booking_occurrences'::regclass
      AND confrelid = 'bookfit.orders'::regclass
      AND contype = 'f'
  ),
  'booking occurrences reference orders with a foreign key'
);
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'bookfit.resource_allocations'::regclass
      AND confrelid = 'bookfit.locations'::regclass
      AND contype = 'f'
  ),
  'resource allocations reference locations with a foreign key'
);

SELECT ok((SELECT count(*) FROM bookfit.actors) >= 10, 'seed includes all demo actors');
SELECT ok((SELECT count(*) FROM bookfit.services) >= 9, 'seed includes demo services');
SELECT ok((SELECT count(*) FROM bookfit.class_sessions) >= 8, 'seed includes conflict-test classes');
SELECT ok(
  EXISTS (
    SELECT 1
    FROM bookfit.actor_roles
    WHERE actor_id = '10000000-0000-4000-8000-000000000005'
      AND role = 'professional'
  )
  AND EXISTS (
    SELECT 1
    FROM bookfit.actor_roles
    WHERE actor_id = '10000000-0000-4000-8000-000000000005'
      AND role = 'space_manager'
  ),
  'seed includes an actor with both professional and space manager roles'
);

SELECT ok(has_database_privilege('bookfit_runtime', 'postgres', 'CONNECT'), 'runtime can connect to the application database');
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'bookfit_runtime'
      AND NOT rolsuper
      AND NOT rolcreatedb
      AND NOT rolcreaterole
      AND NOT rolreplication
  ),
  'runtime role has no administrative database privileges'
);
SELECT ok(has_schema_privilege('bookfit_runtime', 'bookfit', 'USAGE'), 'runtime can use the BookFit schema');
SELECT ok(NOT has_schema_privilege('anon', 'bookfit', 'USAGE'), 'anonymous API role cannot use the BookFit schema');
SELECT ok(NOT has_schema_privilege('authenticated', 'bookfit', 'USAGE'), 'authenticated API role cannot use the BookFit schema');
SELECT ok(NOT has_table_privilege('anon', 'bookfit.actors', 'SELECT'), 'anonymous API role cannot read BookFit actors');
SELECT ok(NOT has_table_privilege('authenticated', 'bookfit.actors', 'SELECT'), 'authenticated API role cannot read BookFit actors');
SELECT ok(has_table_privilege('bookfit_runtime', 'bookfit.actors', 'SELECT'), 'runtime can read actors');
SELECT ok(NOT has_table_privilege('bookfit_runtime', 'bookfit.actors', 'UPDATE'), 'runtime cannot edit actor records');
SELECT ok(has_table_privilege('bookfit_runtime', 'bookfit.orders', 'INSERT'), 'runtime can create orders');
SELECT ok(has_table_privilege('bookfit_runtime', 'bookfit.orders', 'UPDATE'), 'runtime can update order state');
SELECT ok(NOT has_table_privilege('bookfit_runtime', 'bookfit.orders', 'DELETE'), 'runtime cannot delete orders');
SELECT ok(
  has_table_privilege('bookfit_runtime', 'bookfit.professional_preferences', 'UPDATE'),
  'runtime can save professional preferences'
);

SELECT throws_ok(
  $$INSERT INTO bookfit.actor_roles (actor_id, role)
    VALUES ('10000000-0000-4000-8000-000000000001', 'owner')$$,
  '23514', NULL,
  'actor role check rejects unsupported roles'
);
SELECT throws_ok(
  $$INSERT INTO bookfit.actor_roles (actor_id, role)
    VALUES ('91000000-0000-4000-8000-000000000099', 'client')$$,
  '23503', NULL,
  'actor role foreign key rejects missing actors'
);

INSERT INTO bookfit.orders (
  id, client_actor_id, professional_id, service_id, mode, seats, status
) VALUES (
  '91000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  'online', 1, 'pending'
);

SELECT throws_ok(
  $$INSERT INTO bookfit.seat_allocations (
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

INSERT INTO bookfit.resource_allocations (
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
  $$INSERT INTO bookfit.resource_allocations (
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
  $$INSERT INTO bookfit.resource_allocations (
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
