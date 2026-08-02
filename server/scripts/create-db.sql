-- Run as a PostgreSQL superuser (example):
-- psql -U postgres -f server/scripts/create-db.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'aurelia') THEN
    CREATE ROLE aurelia LOGIN PASSWORD 'aurelia_dev_password';
  END IF;
END
$$;

SELECT 'CREATE DATABASE aurelia_dental OWNER aurelia'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'aurelia_dental')\gexec

GRANT ALL PRIVILEGES ON DATABASE aurelia_dental TO aurelia;
