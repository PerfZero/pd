#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/../migrations"

CONTAINER_NAME="${PG_CONTAINER_NAME:-passdesk_postgres}"
DB_USER="${DB_USER:-admin}"
DB_NAME="${DB_NAME:-passdesk}"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "No migrations directory found at $MIGRATIONS_DIR"
  exit 0
fi

shopt -s nullglob
files=("$MIGRATIONS_DIR"/*.sql)
if [ ${#files[@]} -eq 0 ]; then
  echo "No SQL migrations found in $MIGRATIONS_DIR"
  exit 0
fi

for file in "${files[@]}"; do
  echo "Applying migration: $(basename "$file")"
  docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < "$file"
done
