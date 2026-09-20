#!/bin/bash
# =============================================================
# LegalTech Backend — Docker Entrypoint
# =============================================================
# Runs on every container start:
#   1. Waits for MySQL to be ready
#   2. Applies Alembic database migrations
#   3. Seeds the admin user & default roles (idempotent)
#   4. Starts the Uvicorn application server
# =============================================================

set -e

# ── 1. Wait for MySQL ────────────────────────────────────────
DB_HOST="${DB_HOST:-shared-mysql}"
DB_PORT="${DB_PORT:-3306}"

if [ -n "$DB_HOST" ]; then
  echo "[entrypoint] Waiting for MySQL at ${DB_HOST}:${DB_PORT}..."
  MAX_TRIES=30
  count=0
  until nc -z "$DB_HOST" "$DB_PORT"; do
    count=$((count + 1))
    if [ "$count" -ge "$MAX_TRIES" ]; then
      echo "[entrypoint] ERROR: MySQL did not become available after ${MAX_TRIES} attempts. Exiting."
      exit 1
    fi
    echo "[entrypoint] MySQL is not ready yet (attempt ${count}/${MAX_TRIES}). Retrying in 2s..."
    sleep 2
  done
  echo "[entrypoint] MySQL is ready!"
fi

# ── 2. Run Alembic migrations ────────────────────────────────
echo "[entrypoint] Applying database migrations..."
alembic upgrade head
echo "[entrypoint] Migrations complete."

# ── 3. Seed admin user & default roles (idempotent) ─────────
echo "[entrypoint] Seeding admin user and default roles..."
python seed_admin.py
echo "[entrypoint] Seeding complete."

# ── 4. Start Uvicorn ─────────────────────────────────────────
echo "[entrypoint] Starting FastAPI application server..."
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 2 \
  --proxy-headers \
  --forwarded-allow-ips="*" \
  --log-level info
