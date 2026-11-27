-- BookFit business data is accessed only by the private Fastify database role.
-- The Supabase Data API exposes public/graphql_public, never the bookfit schema.
REVOKE ALL PRIVILEGES ON SCHEMA bookfit FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA bookfit FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA bookfit FROM PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA bookfit
  REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA bookfit
  REVOKE ALL ON SEQUENCES FROM PUBLIC;

DO $$
DECLARE
  grantee text;
BEGIN
  FOREACH grantee IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = grantee) THEN
      EXECUTE format('REVOKE ALL PRIVILEGES ON SCHEMA bookfit FROM %I', grantee);
      EXECUTE format('REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA bookfit FROM %I', grantee);
      EXECUTE format('REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA bookfit FROM %I', grantee);
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA bookfit REVOKE ALL ON TABLES FROM %I',
        grantee
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA bookfit REVOKE ALL ON SEQUENCES FROM %I',
        grantee
      );
    END IF;
  END LOOP;
END;
$$;
