DELETE FROM public.document_types
WHERE code = 'visa';

-- Значение ENUM 'visa' в PostgreSQL не удаляется безопасно в rollback без пересоздания типа.
