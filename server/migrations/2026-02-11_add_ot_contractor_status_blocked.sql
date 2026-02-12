DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ot_contractor_status_enum') THEN
    CREATE TYPE ot_contractor_status_enum AS ENUM (
      'admitted',
      'not_admitted',
      'temp_admitted',
      'blocked'
    );
  ELSE
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'ot_contractor_status_enum'
        AND e.enumlabel = 'blocked'
    ) THEN
      ALTER TYPE ot_contractor_status_enum ADD VALUE 'blocked';
    END IF;
  END IF;
END $$;
