#!/bin/sh
# Runs once, on first initialization of an empty Postgres data directory
# (docker-entrypoint-initdb.d). Creates the read-only role the Vaidya MCP server
# connects as. Tables are created later by the backend's migrations, so we use
# ALTER DEFAULT PRIVILEGES to auto-grant SELECT on tables `fitvibe` creates
# afterwards — fail-closed (no write grants, ever).
#
# The password comes from VAIDYA_RO_PASSWORD (set in the root .env). The backend
# owns the schema as POSTGRES_USER, so default privileges it sets apply to the
# tables it migrates in.
set -e

: "${VAIDYA_RO_PASSWORD:=vaidya_ro}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vaidya_ro') THEN
    CREATE ROLE vaidya_ro LOGIN PASSWORD '${VAIDYA_RO_PASSWORD}';
  END IF;
END
\$\$;

GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO vaidya_ro;
GRANT USAGE ON SCHEMA public TO vaidya_ro;

-- SELECT on anything already present (none yet on first init, but idempotent).
GRANT SELECT ON ALL TABLES IN SCHEMA public TO vaidya_ro;

-- Auto-grant SELECT on tables the schema owner (${POSTGRES_USER}) creates later
-- — i.e. when the backend runs its migrations. Read-only by construction.
ALTER DEFAULT PRIVILEGES FOR ROLE ${POSTGRES_USER} IN SCHEMA public
  GRANT SELECT ON TABLES TO vaidya_ro;

-- Defense in depth: never any write, even if a grant slips in later.
ALTER DEFAULT PRIVILEGES FOR ROLE ${POSTGRES_USER} IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM vaidya_ro;
SQL

echo "vaidya_ro role provisioned (read-only)."
