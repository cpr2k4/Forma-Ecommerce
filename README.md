# FORMA — Ecommerce App (Local MVP)

A practical PERN ecommerce starter (PostgreSQL + Express + React + Node) for local development. Architecture docs for scale (`Architecture.md`, `Requirements.md`, `DB_Schema.md`) stay as the longer-term plan — this app skips Redis, Kafka, and load balancing for now.

## Stack

- **Client:** React + Vite + React Router
- **Server:** Express (modular routes: auth, catalog, cart, orders)
- **DB:** PostgreSQL via Prisma
- **Payments:** Razorpay test mode (UPI / cards / wallets)

## Prerequisites

- Node.js 20+
- Docker Desktop (for Postgres)

## Quick start

```bash
# 1. Start Postgres (maps to localhost:5433 to avoid clashing with a local Postgres)
docker compose up -d

# 2. Install dependencies
npm install
npm install --prefix server
npm install --prefix client

# 3. Create tables + seed demo data
cd server
npx prisma migrate dev --name init
npm run db:seed
cd ..

# 4. Run API + frontend
npm run dev
```

- Frontend: http://localhost:5173  
- API: http://localhost:5050/api/health  

> Note: the API uses port **5050** (macOS often occupies 5000). Postgres runs on **5433** so it doesn’t clash with a local Postgres on 5432.

## Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Customer | demo@shop.com | password123 |
| Admin | admin@gmail.com | Password |

## Razorpay (test mode)

1. Sign up at [Razorpay](https://razorpay.com) → Dashboard → **Test Mode** → [API Keys](https://dashboard.razorpay.com/app/keys)
2. Put keys in `server/.env`:

```env
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."
```

3. Restart the API, then checkout. In test mode you can use Razorpay’s test UPI/cards from their docs.

## Google sign-in

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials), create an **OAuth client ID** of type **Web application**.
2. Add authorized JavaScript origins: `http://localhost:5173` (and your prod origin later).
3. Put the client ID in **both**:

```env
# server/.env
GOOGLE_CLIENT_ID="xxxxx.apps.googleusercontent.com"

# client/.env
VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

4. Restart both dev servers. The "Continue with Google" button appears on Login/Register once configured (it shows a note instead if the env var is missing).

Signing up with the same email as an existing password account automatically links the Google identity to that account — no duplicate users.

## What works today

- Register / login (JWT) + **Google sign-in**
- Browse, search, filter products
- Product detail with variants
- Cart (add / update / remove)
- Checkout with shipping address + **Razorpay Checkout**
- Order history (PAID after signature verification)
- Stock decremented after payment confirms

## Project layout

```
client/          React storefront (FORMA)
server/
  src/modules/   auth, catalog, cart, order, payment
  prisma/        schema + seed
docker-compose.yml
```

## Next (later)

- Redis caching
- Razorpay webhooks (for unpaid / failed cleanup)
- Admin product CRUD UI
- Message queue / AI hooks from the architecture docs
