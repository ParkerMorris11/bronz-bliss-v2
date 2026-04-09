# Bronz Bliss — Tanning Studio CRM

A full-stack business management platform built for **Bronz Bliss**, a spray tan studio in Cedar City, Utah. Built from scratch as a vertical SaaS for tanning business owners.

> First design partner: Izzy ([@bronz.bliss](https://www.instagram.com/bronz.bliss)) — her feedback shapes everything.

---

## What It Does

Replaces 7+ disconnected tools (GlossGenius, Fillout, DMs, manual texts) with one app:

| Feature | What it solves |
|---|---|
| **Calendar** (Day/Week/Month) | Visual schedule with appointment blocks, time grid, drag-to-reschedule |
| **Public Booking Link** | Clients self-book in 30 seconds — no more DM back-and-forth |
| **Client Onboarding Wizard** | Intake quiz + waiver signing in one shareable link |
| **Session Check-In** | Records formula, shade, rinse time — every client's history in one place |
| **Package Auto-Deduction** | Session credits deduct on check-in, no spreadsheet needed |
| **Quick Messages** | One-tap copy to paste in iMessage: Confirmation, Prep, Rinse, Aftercare, Rebooking |
| **Reports** | Revenue trends, no-show rate, client lifetime value, churn risk |
| **Inventory Tracking** | Solution stock levels, usage per session, low-stock alerts |
| **Gift Cards** | Issue, track balance, and redeem |
| **Promo Codes** | Percent or fixed discounts with usage limits and expiry |
| **Waitlist** | Capture overflow demand when slots are full |
| **Marketing Landing Page** | Public page with services, real reviews, hours, Instagram carousel |

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS v3, shadcn/ui |
| Backend | Express 5, Node 20 |
| Database | SQLite (better-sqlite3), Drizzle ORM |
| Routing | Wouter (hash-based) |
| Data Fetching | TanStack Query v5 |
| Charts | Recharts |
| Fonts | Cabinet Grotesk + Satoshi via Fontshare |
| Deploy | Railway (backend + SQLite), static assets via Perplexity |

---

## Pages

```
/ (login)          — Password-protected admin gate
/#/                — Dashboard: KPIs, quick actions, birthday alerts, today's checklist
/#/calendar        — Day/Week/Month calendar with appointment detail panel
/#/clients         — Client list with intake/waiver status indicators
/#/clients/:id     — Client profile: history, intake responses, message log, loyalty
/#/packages        — Package plans + active client packages
/#/services        — Service management
/#/messages        — Copy-paste SMS hub for iMessage
/#/intake          — Form builder + waiver template editor
/#/inventory       — Stock tracking with low-stock alerts
/#/gift-cards      — Gift card issuance and redemption
/#/promo-codes     — Discount code management
/#/waitlist        — Overflow demand capture
/#/reports         — Revenue, no-show rate, CLV, churn risk, forecast
/#/settings        — Business info, hours, deposit rules, notification templates

/#/book            — Public client booking (no login)
/#/onboard/:id     — Public client onboarding wizard (no login)
/#/landing         — Public marketing page (no login)
```

---

## Getting Started

```bash
# Install
npm install

# Dev server (port 5000)
npm run dev

# Build for production
npm run build

# Start production server
NODE_ENV=production node dist/index.cjs
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `ADMIN_PASSWORD` | Login password for Izzy | `bronzbliss` |
| `PORT` | Server port | `5000` |
| `TWILIO_ACCOUNT_SID` | For real SMS delivery (optional) | — |
| `TWILIO_AUTH_TOKEN` | For real SMS delivery (optional) | — |
| `TWILIO_PHONE_NUMBER` | Twilio sending number (optional) | — |

Set these in Railway under your service → **Variables** tab.

---

## Railway Deployment

1. Connect this repo in [Railway](https://railway.app)
2. Build command: `npm install && npm run build`
3. Start command: `NODE_ENV=production node dist/index.cjs`
4. Add environment variables (at minimum `ADMIN_PASSWORD`)
5. Optionally add a custom domain under Settings → Custom Domain

---

## Roadmap

- [ ] Stripe deposits at booking
- [ ] Session-persisting auth (replace React state with express-session)
- [ ] Real Twilio SMS delivery
- [ ] Multi-tenant SaaS (sell to other tanning studios)
- [ ] Mobile app (PWA or React Native)
- [ ] Google Calendar sync
- [ ] Loyalty rewards redemption UI

---

## Built by

Parker Morris — [momentum-ai-six.vercel.app](https://momentum-ai-six.vercel.app)

For Izzy's tanning studio, Bronz Bliss — Cedar City, Utah.
