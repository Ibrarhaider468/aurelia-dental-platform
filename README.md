# Aurelia Dental Platform

Premium dental clinic management platform — public website, REST API, and admin dashboard.

| Layer | Stack |
|-------|--------|
| Public website | Express + EJS + CSS3 + Vanilla JS |
| REST API | Node.js + Express + Prisma + PostgreSQL |
| Admin dashboard | React + TypeScript + Vite |
| Email | Nodemailer |
| Payments | Gateway-ready service layer (Stripe/PayPal structure) |

---

## Status

| Phase | Scope | Status |
|-------|--------|--------|
| 1 | Backend foundation | ✅ |
| 2 | Admin panel | ✅ |
| 3 | Public EJS website | ✅ |
| 4 | Booking hardening | ✅ |
| 5 | Payments, memberships, insurance, finance | ✅ |
| **6** | **Production audit, SEO, a11y, deploy prep** | **✅** |

---

## Quick start (development)

```bash
npm install
copy server\.env.example server\.env
npm run db:up                 # optional Docker Postgres
npm run db:push --workspace=server
npm run db:seed
npm run dev:server            # http://localhost:4000
npm run dev:admin             # http://localhost:5173
```

- Website + API: http://localhost:4000  
- Admin (dev): http://localhost:5173  
- Login: `admin@aureliadental.com` / `Admin123!`

---

## Phase 6 highlights

- SEO: meta titles/descriptions, Open Graph, Twitter cards, canonical URLs, `robots.txt`, `sitemap.xml`, Dentist JSON-LD
- Performance: gzip compression, static caching, image lazy-loading, short public page query cache
- Accessibility: skip link, focus styles, ARIA navigation, keyboard dropdown/menu, form alerts
- Security: production JWT enforcement, trust proxy, Helmet CSP, tighter rate limits, CORS allowlist
- Production: admin SPA can be served from `/admin`, deployment runbook below

---

## Production build & start

```bash
npm install
copy server\.env.example server\.env
# Edit server/.env for production values (see below)

npm run db:generate
npm run db:migrate:deploy
npm run db:seed                 # first deploy only

# Build admin with /admin base path and relative API
set NODE_ENV=production
echo VITE_API_URL=/api> admin\.env.production
npm run build

# Start API + website (+ admin at /admin)
set NODE_ENV=production
npm start
```

Production URLs (same host example):

- Website: `https://your-domain.com`
- Admin: `https://your-domain.com/admin/`
- API: `https://your-domain.com/api`
- Health: `https://your-domain.com/api/health`

---

## Production environment variables

Set these in `server/.env` (never commit secrets):

| Variable | Required | Notes |
|----------|----------|--------|
| `NODE_ENV` | Yes | `production` |
| `PORT` | Yes | e.g. `4000` |
| `DATABASE_URL` | Yes | Managed Postgres connection string |
| `JWT_SECRET` | Yes | ≥32 chars, unique, not a placeholder |
| `JWT_EXPIRES_IN` | Recommended | `1d` in production |
| `PUBLIC_SITE_URL` | Yes | Canonical public URL (SEO) |
| `CLIENT_URL` | Yes | Admin origin (same site or separate) |
| `SERVE_ADMIN` | Optional | `true` to serve `admin/dist` at `/admin` |
| `TRUST_PROXY` | Recommended | `true` behind Nginx/load balancer |
| `ADMIN_*` | Seed only | Change default password after first login |
| `SMTP_*` / `MAIL_FROM` | Email | Booking notifications |
| `CLOUDINARY_*` | Media | Image hosting |
| `STRIPE_*` / `PAYPAL_*` | Payments | Live keys + webhook secrets |
| `PAYMENT_SUCCESS_URL` / `PAYMENT_CANCEL_URL` | Payments | Public return URLs |

Admin build env (`admin/.env.production`):

```env
VITE_API_URL=/api
```

---

## Database migrations

Development:

```bash
npm run db:migrate
```

Production / CI:

```bash
npm run db:migrate:deploy
```

Schema push (dev convenience only — avoid in production):

```bash
npm run db:push --workspace=server
```

PostgreSQL options:

1. **Docker** (local/dev): `npm run db:up` using `docker-compose.yml`
2. **Managed** (production): Neon, Supabase, RDS, Railway, Render Postgres — paste `DATABASE_URL`

---

## Deployment guides

### Backend (API + public website)

Host Node 20+ on Railway, Render, Fly.io, DigitalOcean App Platform, or a VPS.

1. Set production env vars  
2. Build admin (`NODE_ENV=production npm run build`)  
3. Run `npm run db:migrate:deploy`  
4. Start with `npm start`  
5. Point reverse proxy (Nginx/Caddy) to `PORT` with HTTPS  

Example Nginx:

```nginx
server {
  listen 443 ssl http2;
  server_name your-domain.com;

  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Set `TRUST_PROXY=true` when using a reverse proxy.

### Frontend (admin)

**Option A — same origin (recommended)**  
Build with `base=/admin/` (automatic when `NODE_ENV=production`) and `VITE_API_URL=/api`. Express serves `admin/dist` at `/admin` when `SERVE_ADMIN=true`.

**Option B — separate host**  
Deploy `admin/dist` to Netlify/Vercel/Cloudflare Pages. Set:

- Vite `base: '/'`
- `VITE_API_URL=https://api.your-domain.com/api`
- `CLIENT_URL=https://admin.your-domain.com` on the API

### PostgreSQL

- Use managed Postgres with automated backups  
- Restrict network access to the app  
- Run `db:migrate:deploy` before/with each release  

### Cloudinary

1. Create a Cloudinary account  
2. Copy cloud name, API key, API secret into env  
3. Use folder `aurelia-dental` (or custom `CLOUDINARY_FOLDER`)  
4. Store resulting HTTPS image URLs in gallery/services/doctors  

### Email (SMTP)

Configure any SMTP provider (Resend SMTP, SendGrid, Amazon SES, clinic host):

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
MAIL_FROM="Aurelia Dental <noreply@your-domain.com>"
```

Without SMTP, development logs email content instead of sending.

### Payment gateways

1. Create Stripe and/or PayPal apps  
2. Set secret/publishable keys in env (never hardcode)  
3. Point webhooks to:
   - `https://your-domain.com/api/webhooks/stripe`
   - `https://your-domain.com/api/webhooks/paypal`
4. Set `PAYMENT_SUCCESS_URL` / `PAYMENT_CANCEL_URL` to your public domain  
5. Replace structural SDK stubs with official Stripe/PayPal SDK calls before going live  

---

## SEO endpoints

| Path | Purpose |
|------|---------|
| `/robots.txt` | Crawl rules + sitemap link |
| `/sitemap.xml` | Public page sitemap |
| Page `<head>` | Title, description, OG, Twitter, canonical, JSON-LD |

---

## Key Phase 5–6 APIs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | DB health check |
| GET | `/api/admin/payments` | Filtered payment list |
| GET | `/api/admin/finance` | Financial analytics |
| POST | `/api/admin/payments/:id/checkout` | Prepare gateway checkout |
| POST | `/api/webhooks/stripe` | Stripe webhook receiver |
| POST | `/api/webhooks/paypal` | PayPal webhook receiver |
| CRUD | `/api/admin/membership-plans` | Membership plans |
| POST | `/api/public/memberships/subscribe` | Public subscribe |
| CRUD | `/api/admin/insurance` | Insurance providers |
| CRUD | `/api/admin/patient-insurance` | Patient policy verification |
| GET | `/api/public/payment-options` | Public gateway/method options |

Public pages: `/`, `/treatments`, `/dentists`, `/book`, `/payments`, `/membership`, `/insurance`

---

## Public website design

Premium international clinic frontend (EJS + CSS + Vanilla JS):

- Mist-stone palette with brass accent; Cormorant Garamond + Figtree
- Full-bleed hero, trust metrics, DB-driven treatments/doctors/gallery/testimonials/memberships/insurance/FAQ
- Patient journey, technology, contact/map, and premium footer
- Booking wizard with elevated step UI, selection cards, date shell, and confirmation
- Lazy-loaded images, reveal animations, responsive navigation

Refresh demo content anytime with `npm run db:seed`.

---

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev:server` | API + website (watch) |
| `npm run dev:admin` | Admin Vite dev |
| `npm run build` | Production admin build |
| `npm start` | Production server |
| `npm run lint` | Admin oxlint |
| `npm run typecheck` | Admin TypeScript build |
| `npm run db:migrate:deploy` | Apply migrations |

---

## Security notes

- Change the seeded admin password immediately in production  
- Use a unique `JWT_SECRET` (≥32 characters)  
- Keep payment and SMTP secrets in the host secret store  
- Admin and `/api` are disallowed in `robots.txt`  
- Login and booking endpoints are rate-limited  

---

## License

Private clinic project — all rights reserved.
