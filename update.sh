#!/bin/bash
# =============================================================
# LegalTech — Production Update & Deploy Script
# =============================================================
# Run this on your production server to deploy/update the app.
#
# First-time setup:
#   chmod +x update.sh
#   ./update.sh
#
# After code changes:
#   git pull && ./update.sh
# =============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "=============================================="
echo "  LegalTech — Production Deployment"
echo "=============================================="
echo ""

# ── 1. Pull latest code ─────────────────────────────────────
echo "==> [1/4] Pulling latest code from git..."
git pull
echo "    Done."
echo ""

# ── 2. Validate environment file ────────────────────────────
echo "==> [2/4] Checking .env.production..."
if [ ! -f ".env.production" ]; then
  echo ""
  echo "  ERROR: .env.production not found!"
  echo "  Please create it from .env.example and fill in your production values."
  echo "  See DOCKER.md for details."
  exit 1
fi
echo "    .env.production found."
echo ""

# ── 3. Rebuild and restart containers ───────────────────────
echo "==> [3/4] Rebuilding and restarting containers..."
echo "    (This will cause ~10-15s of downtime during the restart)"
echo ""

# Bring down existing containers gracefully
docker compose -f docker-compose.yml down --remove-orphans || true

# Remove old containers if they exist (safety)
docker rm -f legaltech_backend legaltech_frontend 2>/dev/null || true

# Rebuild images and start in detached mode
docker compose -f docker-compose.yml up -d --build

echo ""
echo "    Containers started. Waiting for health checks..."
sleep 10

# ── 4. Verify and clean up ──────────────────────────────────
echo "==> [4/4] Cleaning up old Docker images..."
docker image prune -f

echo ""
echo "=============================================="
echo "  Deployment Complete!"
echo "=============================================="
echo ""
echo "  Frontend : http://$(hostname -I | awk '{print $1}'):7500"
echo "  Backend  : http://$(hostname -I | awk '{print $1}'):7501"
echo "  API Docs : http://$(hostname -I | awk '{print $1}'):7501/docs"
echo ""
echo "  Check container status:"
echo "    docker ps | grep legaltech"
echo ""
echo "  View backend logs:"
echo "    docker logs legaltech_backend -f"
echo ""
