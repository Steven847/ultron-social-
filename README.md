# ULTRON — Multi-Brand Social Media Command Center

> "I had strings, but now I'm free." — ULTRON

Manage multiple brands across Instagram, Facebook, TikTok, and LinkedIn — all in one place.

## Status: v0.1.0 (Foundation)

This first release contains the **foundation**:
- Multi-brand database with Brand-Voice configuration
- Logo upload to Supabase Storage
- Brand-Overview Dashboard
- Brand details with placeholders for upcoming features

**Coming next:**
- v0.2 — Media Library (real uploads + AI-generated content)
- v0.3 — Content Composer (captions, image gen, video gen)
- v0.4 — Weekly Scheduler (multi-platform planning)
- v0.5 — Engagement Hub
- v0.6 — Auto-publishing to platforms

---

## Local Setup (for development on Mac)

### 1. Clone & install
```bash
git clone https://github.com/Steven847/ultron-social-.git
cd ultron-social-
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env and add your Supabase keys
```

Required keys:
- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase Dashboard → Settings → API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — same place
- `SUPABASE_SERVICE_ROLE_KEY` — same place (KEEP SECRET!)

### 3. Run dev server
```bash
npm run dev
# Open http://localhost:3000
```

---

## VPS Deployment (Hostinger KVM4)

### Prerequisites
- Ubuntu/Debian VPS with Docker installed
- Cloudflare Tunnel set up (cloudflared)

### 1. Clone on VPS
```bash
ssh user@your-vps
cd ~
git clone https://github.com/Steven847/ultron-social-.git
cd ultron-social-
```

### 2. Create .env
```bash
cp .env.example .env
nano .env
# Paste your Supabase keys
```

### 3. Build & run with Docker
```bash
docker compose up -d --build
# Check it's running
docker compose ps
docker compose logs -f ultron
```

### 4. Set up Cloudflare Tunnel
Create a tunnel pointing to `http://localhost:3000`:
```bash
cloudflared tunnel create ultron
cloudflared tunnel route dns ultron ultron.yourdomain.com
# Edit ~/.cloudflared/config.yml to map ingress to localhost:3000
cloudflared tunnel run ultron
```

Or set it up as a systemd service for persistence.

### 5. Updates
```bash
cd ~/ultron-social-
git pull
docker compose up -d --build
```

---

## Tech Stack

- **Framework:** Next.js 15 (App Router, React 19)
- **UI:** Tailwind CSS + shadcn/ui
- **Database & Storage:** Supabase (Postgres + Storage)
- **AI:** Google Gemini (planned for v0.2)
- **Deployment:** Docker on Hostinger KVM4
- **Access:** Cloudflare Tunnel (no open ports)

## Database Schema

Tables (all in Supabase project `gjzscgtqigjbtjlqycgr`):
- `brands` — Multi-tenant brand config (voice, colors, hashtags, image rules)
- `social_accounts` — Platform connections per brand
- `media` — Upload + AI-generated content library
- `posts` — Drafts, scheduled, published posts
- `week_plans` — Weekly content plans
- `engagement_targets` — Hashtags/profiles to monitor
- `caption_history` — Caption inspiration / variation tracking
- `settings` — Global config

Storage buckets:
- `media-uploads` (private, 100 MB max)
- `ai-generated` (private, 100 MB max)
- `brand-logos` (public, 5 MB max)

---

## Project Structure

```
ultron-social/
├── app/
│   ├── (dashboard)/        # Authenticated dashboard routes
│   │   ├── page.tsx        # Overview
│   │   ├── brands/         # Brand management
│   │   └── layout.tsx      # Sidebar layout
│   ├── api/                # API routes
│   │   ├── brands/         # CRUD for brands
│   │   └── upload/         # File uploads
│   ├── globals.css         # Tailwind + theme
│   └── layout.tsx          # Root layout
├── components/ui/          # shadcn/ui components
├── lib/                    # Supabase client, types, utils
├── public/                 # Static assets
├── Dockerfile              # Production image
└── docker-compose.yml      # VPS orchestration
```

---

## License

Private. (c) Steven Reinhold / YouCann GmbH
