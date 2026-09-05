-- Relax the role check constraint on users table to allow canonical roles from RBAC_ROLE_MATRIX

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.users'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%role%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.users DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;
