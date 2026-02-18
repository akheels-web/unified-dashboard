-- RUN THIS ON YOUR SERVER: sudo -u postgres psql -f setup_fresh.sql

-- 1. Terminate existing connections to prevent "database is being accessed" errors
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
WHERE datname = 'unified_lifecycle_db' AND pid <> pg_backend_pid();

-- 2. Drop legacy objects if they exist (Clean Slate)
DROP DATABASE IF EXISTS unified_lifecycle_db;
DROP DATABASE IF EXISTS unified_dashboard; -- Dropping the old one too
DROP USER IF EXISTS unified_admin;
DROP USER IF EXISTS dashboard_user; -- Dropping the old one too

-- 3. Create NEW User and Database
CREATE USER unified_admin WITH PASSWORD 'FreshStart_2024!';
CREATE DATABASE unified_lifecycle_db OWNER unified_admin;

-- 4. Grant Permissions
GRANT ALL PRIVILEGES ON DATABASE unified_lifecycle_db TO unified_admin;
ALTER USER unified_admin CREATEDB; -- Optional: allows this user to create more dbs if needed

-- 5. Connect to the new DB and grant schema permissions (Postgres 15+ fix)
\c unified_lifecycle_db
GRANT ALL ON SCHEMA public TO unified_admin;
