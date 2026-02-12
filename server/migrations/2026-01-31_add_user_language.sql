ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS user_language varchar(5) DEFAULT 'ru';

UPDATE public.users
  SET user_language = 'ru'
  WHERE user_language IS NULL;

ALTER TABLE public.users
  ALTER COLUMN user_language SET NOT NULL;
