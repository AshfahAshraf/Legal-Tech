# LegalTech — Docker Setup & Deployment Guide

> Complete guide for running LegalTech locally with Docker and deploying it to the production server.

---

## Table of Contents

1. [Project Architecture](#project-architecture)
2. [Folder Structure](#folder-structure)
3. [Environment Variables](#environment-variables)
4. [Running Locally (Development)](#running-locally-development)
5. [Deploying to Production](#deploying-to-production)
6. [Updating After Code Changes](#updating-after-code-changes)
7. [Ports](#ports)
8. [Health Checks](#health-checks)
9. [Logs](#logs)
10. [Troubleshooting](#troubleshooting)

---

## Project Architecture

```
Docker Host (VPS)
│
├── legaltech_frontend  (Nginx:Alpine)  ── Port 7500
│   └── serves static Next.js build
│
├── legaltech_backend   (Python 3.11)   ── Port 7501
│   └── FastAPI + Uvicorn
│   └── connected to shared-db-network
│
└── shared-db-network (external)
    └── shared-mysql  (existing container — untouched)
```

- **Frontend**: Next.js 16 built as a static export, served by Nginx
- **Backend**: FastAPI with Uvicorn (2 workers), Alembic migrations
- **Database**: Uses the **existing** shared-mysql container — no new DB is created
- **Network**: Connects to the existing shared-db-network — no other containers are affected

---

## Folder Structure

```
LegalTech/
├── backend/
│   ├── app/                      # FastAPI application code
│   ├── alembic/                  # Database migration scripts
│   ├── Dockerfile                # Multi-stage production Dockerfile
│   ├── entrypoint.sh             # Startup: migrations → seed → server
│   ├── .dockerignore             # Excludes venv, .env, test files
│   └── requirements.txt
│
├── frontend/
│   ├── src/utils/api.js          # Central API URL config
│   ├── Dockerfile                # Multi-stage production Dockerfile
│   ├── nginx.conf                # Nginx SPA + gzip + security headers
│   └── .dockerignore             # Excludes node_modules, .next
│
├── docker-compose.yml            # Production compose file
├── docker-compose.dev.yml        # Development override (hot-reload)
├── .env.local                    # Local dev secrets (git-ignored)
├── .env.production               # Production secrets (git-ignored)
├── .env.example                  # Template (safe to commit)
├── update.sh                     # One-command deploy script
└── DOCKER.md                     # This file
```

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Full SQLAlchemy connection string | `mysql+pymysql://root:pass@shared-mysql:3306/legaltech_db` |
| `DB_NAME` | MySQL database name | `legaltech_db` |
| `DB_USER` | MySQL username | `root` |
| `DB_PASSWORD` | MySQL password | `your_password` |
| `DB_HOST` | MySQL host (always `shared-mysql` in Docker) | `shared-mysql` |
| `DB_PORT` | MySQL port | `3306` |
| `SECRET_KEY` | JWT signing key — must be strong in production | `openssl rand -hex 32` |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT token lifetime | `1440` (24h) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `https://your-domain.com` |
| `NEXT_PUBLIC_API_URL` | Backend URL seen by the browser | `http://SERVER_IP:7501` |
| `SMTP_*` | Email settings (optional) | — |
| `RAZORPAY_KEY_ID` | Razorpay public key | `rzp_live_...` |
| `RAZORPAY_SECRET` | Razorpay secret key | — |

> **Important**: `NEXT_PUBLIC_API_URL` is baked into the Next.js JavaScript bundle at **build time**.
> If you change it, you must **rebuild** the frontend Docker image.

---

## Running Locally (Development)

### Prerequisites
- Docker Desktop installed and running
- Git

### Steps

**1. Clone the repo and set up environment:**

```bash
git clone <repo-url>
cd LegalTech

# Create local env from template
cp .env.example .env.local
# Review .env.local — defaults work if you have access to shared-db-network
```

**2. Start the development stack:**

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

This starts:
- **Backend** at http://localhost:8000 with **hot-reload**
- **Frontend** at http://localhost:3000 with **hot-reload**

**3. Access the app:**

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

**4. Stop development stack:**

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml down
```

---

## Deploying to Production

### First-Time Setup (Run once on the server)

**1. SSH into your production server and clone the repo:**

```bash
ssh user@your-server-ip
git clone <repo-url> /opt/legaltech
cd /opt/legaltech
```

**2. Create the production environment file:**

```bash
cp .env.example .env.production
nano .env.production   # Fill in ALL values
```

Key values to fill in `.env.production`:

```env
DB_NAME=legaltech_db
DATABASE_URL=mysql+pymysql://root:marketbytesshared@9633@shared-mysql:3306/legaltech_db

# Generate a strong secret key:
# python3 -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=<your-generated-secret>

# Your server's public IP or domain
ALLOWED_ORIGINS=http://YOUR_SERVER_IP:7500
NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:7501
```

**3. Make the update script executable:**

```bash
chmod +x update.sh
```

**4. Deploy:**

```bash
./update.sh
```

**5. Verify:**

```bash
docker ps | grep legaltech
# Should show both legaltech_backend and legaltech_frontend as "Up (healthy)"
```

---

## Updating After Code Changes

After pushing new code to git, deploy with a single command:

```bash
# On the production server, in the /opt/legaltech directory:
./update.sh
```

This script automatically:
1. Pulls latest code (`git pull`)
2. Validates `.env.production` exists
3. Tears down old containers gracefully
4. Rebuilds Docker images with latest code
5. Starts new containers
6. Cleans up dangling images

**Expected downtime**: ~10–30 seconds.

---

## Ports

| Container | Host Port | Container Port | Purpose |
|---|---|---|---|
| `legaltech_frontend` | **7500** | 80 | Nginx serving Next.js static files |
| `legaltech_backend` | **7501** | 8000 | FastAPI / Uvicorn |

These ports are unique to this project and will not conflict with other containers on the server.

### Nginx Reverse Proxy (Optional — for custom domains)

```nginx
# /etc/nginx/sites-available/legaltech
server {
    listen 80;
    server_name legaltech.yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:7500;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name api.legaltech.yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:7501;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable HTTPS: `sudo certbot --nginx -d legaltech.yourdomain.com -d api.legaltech.yourdomain.com`

After enabling HTTPS, update `.env.production`:
```env
ALLOWED_ORIGINS=https://legaltech.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.legaltech.yourdomain.com
```
Then rebuild: `./update.sh`

---

## Health Checks

| Container | Health Check | Interval |
|---|---|---|
| `legaltech_backend` | `GET /health` returns `{"status": "ok"}` | 30s |
| `legaltech_frontend` | `GET /` returns HTTP 200 | 30s |

Check health status:
```bash
docker inspect legaltech_backend --format='{{.State.Health.Status}}'
docker inspect legaltech_frontend --format='{{.State.Health.Status}}'
```

---

## Logs

```bash
# Backend logs (live)
docker logs legaltech_backend -f

# Frontend logs (live)
docker logs legaltech_frontend -f

# Both services
docker compose -f docker-compose.yml logs -f

# Last 100 lines
docker logs legaltech_backend --tail 100
```

Logs are auto-rotated: max 10MB per file, 3 files maximum.

---

## Troubleshooting

### Container won't start — MySQL connection refused
```bash
docker logs legaltech_backend
# Look for: "MySQL is not ready yet"
```
Ensure `shared-mysql` is running and on `shared-db-network`:
```bash
docker inspect shared-mysql --format='{{json .NetworkSettings.Networks}}' | python3 -m json.tool
```

### Frontend shows "Cannot connect to API"
`NEXT_PUBLIC_API_URL` is baked in at build time. After changing it, rebuild:
```bash
docker compose -f docker-compose.yml build frontend
docker compose -f docker-compose.yml up -d frontend
```

### Migration errors on startup
```bash
docker logs legaltech_backend | grep -i "alembic\|error"
# Run manually:
docker exec -it legaltech_backend alembic upgrade head
```

### Reset and start fresh
```bash
docker compose -f docker-compose.yml down -v
docker image rm legaltech_backend legaltech_frontend 2>/dev/null || true
./update.sh
```
