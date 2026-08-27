# ResolveAI — Intelligent Complaint Management & SLA Escalation Platform

Built for the **Smart Complaint Management & SLA Escalation System** hackathon
problem statement.

## Problem

Organizations receive hundreds of complaints daily across payments, products,
deliveries, refunds, technical issues, and accounts. Handling them purely
first-come-first-served delays serious issues. ResolveAI auto-categorizes,
scores, routes, and escalates complaints — treating **priority** and
**SLA escalation** as two separate decisions, so a low-priority ticket close
to breaching its deadline gets attention before a fresh high-priority one
with hours to spare.

## Solution / Features

- **AI Classification** — rule-based classifier (category, severity,
  customer impact, confidence, plain-English explanation). Runs entirely
  client-side, so it never fails if an external AI API would be down.
- **Transparent Priority Engine** — 0–100 score built from severity (30pts),
  customer impact (25pts), SLA urgency (25pts), complaint age (10pts), and
  escalation/reopen history (10pts). Every point is labeled — never a
  black box.
- **SLA Engine** — real deadlines stored in Postgres, live countdown
  computed client-side, states: SAFE / APPROACHING / BREACHED / RESOLVED.
- **Independent Escalation Engine** — escalation level is derived purely
  from SLA state + severity/history, **not** from the priority score, so
  the two decisions can genuinely diverge (the hackathon's core challenge).
- **Four roles** — Customer, Support Agent, Department Manager, Admin —
  enforced with Postgres Row-Level Security, not just UI hiding.
- **Reopening** — resolved complaints can be reopened by the customer;
  priority and SLA are recalculated.
- **Real analytics** — resolution rate, SLA compliance, breach rate,
  escalation rate, reopen rate, department performance — computed live
  from the database on every dashboard load.
- **Full audit trail** — every status change, classification, assignment,
  and escalation is logged to `complaint_history`.

## Architecture

```
React + Vite + Tailwind + Recharts  ─── REST/Realtime ───  Supabase (Postgres + Auth + RLS)
```

See `src/` for the frontend and `supabase/schema.sql` for the full database
schema, RLS policies, and reference data.

## Technology Stack

- Frontend: React 18, Vite, Tailwind CSS, Lucide icons, Recharts
- Backend/DB: Supabase (Postgres, Auth, Row-Level Security)
- Classification: custom rule-based engine (`src/lib/classifier.js`) — no
  external API dependency, so it can't crash the app if one is unavailable
- Deployment: Vercel (frontend) + Supabase (hosted backend)

## Database Design

11 tables: `departments`, `categories`, `profiles`, `complaints`,
`complaint_comments`, `complaint_history`, `escalations`, `notifications`
— plus indexes on `status`, `sla_deadline`, `priority_score`,
`customer_id`, and `assigned_department_id` for fast dashboard queries.
Full DDL, RLS policies, and seed reference data: `supabase/schema.sql`.

## Installation

```bash
npm install
```

## Environment Variables

```bash
cp .env.example .env.local
```
Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase
project (Settings → API). Never commit `.env.local`.

## Setting up Supabase (one-time)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the entire contents of
   `supabase/schema.sql`, and run it. This creates every table, the
   auto-profile trigger, all RLS policies, the `complaint-proofs`
   storage bucket, and reference data (departments + categories).
   *(If your database predates a feature, the same additions are also
   available as standalone files: `supabase/migration_proof_images.sql`
   and `supabase/migration_rls_hardening.sql`.)*
3. Copy your project URL and anon key into `.env.local` (see
   `.env.example`).

## Running the app

```bash
npm run dev
```
Open the printed local URL (usually `http://localhost:5173`).

## Demo credentials / roles

New sign-ups default to the `customer` role automatically. To create staff
accounts:

1. Sign up normally through the app (or Supabase Dashboard → Authentication
   → Add user) for each of: an agent, a manager, and an admin.
2. In Supabase → Table Editor → `profiles`, find each user's row and set
   `role` to `agent`, `manager`, or `admin` respectively (and optionally
   `department_id` for agents).
3. Log back in through the app — the nav bar and available routes update
   based on role automatically.

## Generating demo data

See `supabase/seed_demo_complaints.md` for 30 ready-to-paste complaint
descriptions covering every required edge case (SLA breach, reopened,
duplicate, missing category, department unavailable, etc.), plus a
one-minute trick for fast-forwarding SLA timers so you don't have to wait
real hours for a breach during your demo.

## The 3-minute demo script

1. Log in as a **customer**, submit: *"My ₹5,000 payment was deducted but
   the transaction failed and I haven't received my refund."*
2. Point out the **live AI Analysis preview** appearing as you type —
   Payment / High severity / High impact.
3. Submit → land on the complaint detail page → show the **Priority
   Explanation** breakdown (every point sourced) and the **live SLA
   countdown ring**.
4. Switch to a pre-seeded low-priority complaint that's minutes from
   breaching (see the seed doc's fast-forward trick) — show it flip to
   **BREACHED** and get flagged for escalation in real time, ahead of a
   fresh high-priority ticket with hours left. This is the core "challenge"
   the problem statement asks you to prove.
5. Log in as **manager** → show **Urgent Action Required**, sorted by SLA
   risk (not priority) — the same divergence, from the manager's view.
6. Log in as **admin** → show the analytics charts are computed live, not
   hard-coded.
7. Back as customer, resolve the loop by reopening a resolved ticket to
   show the reopen → priority recalculation flow.

## Deployment (Vercel)

The repo has a `vercel.json` (Vite preset + SPA fallback rewrite), so the
only manual steps are:

1. **Init git in this folder** and push to GitHub:
   ```bash
   cd resolveai        # this folder, the one with package.json
   git init && git add -A && git commit -m "initial"
   git branch -M main
   git remote add origin <your-repo-url> && git push -u origin main
   ```
2. **Import the repo in Vercel.** If you pushed *this* folder, leave
   **Root Directory** as `./`; if you pushed the outer wrapper folder,
   set Root Directory to `resolveai`.
3. **Add environment variables** (Vercel → Settings → Environment Variables):
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. **Point Supabase Auth at the deployed domain** — Supabase → Authentication
   → URL Configuration → set **Site URL** and add the Vercel URL to
   **Redirect URLs**, otherwise sign-up confirmation emails link to
   `localhost`.
5. Deploy. Build command `npm run build`, output `dist` (both auto-detected).

**Backend:** nothing to deploy — Supabase is already hosted. Make sure
`supabase/schema.sql` has been run against your project.

**First admin:** sign up through the deployed app, then in Supabase SQL Editor:
```sql
update profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```
Log out and back in.

## Known simplifications (documented, not hidden)

Given hackathon time constraints, these were intentionally scoped down from
the original full spec — all are straightforward to add if you have time
left:
- A notification bell UI is not wired up (the `notifications` table and
  history logging exist and are ready for it).
- Customers can attach up to 2 JPEG/PNG proof images per complaint
  (Supabase Storage bucket `complaint-proofs`). Run
  `supabase/migration_proof_images.sql` once if your database predates this.
- SLA breach detection runs client-side on page view/interval rather than
  as a server-side scheduled Supabase Edge Function — fine for a live demo,
  but a real deployment would want the Edge Function for accuracy when no
  one has the app open.
- No automated test suite — given the time budget, effort went into the
  priority/SLA/escalation logic being correct and demonstrable instead.

## Future Improvements

- Supabase Edge Function on a cron schedule for server-side SLA sweeping
  and escalation, independent of anyone having the app open
- In-app notification bell with real-time badge updates
- Configurable SLA rules and priority weights from the Admin dashboard
  (schema already supports this — `sla_rules` style config table)
- Agent reassignment UI (service function `reassignComplaint` already exists)
