DROP INDEX IF EXISTS idx_files_ocr_verified;

ALTER TABLE files
  DROP COLUMN IF EXISTS ocr_result_json,
  DROP COLUMN IF EXISTS ocr_provider,
  DROP COLUMN IF EXISTS ocr_verified_at,
  DROP COLUMN IF EXISTS ocr_verified;
