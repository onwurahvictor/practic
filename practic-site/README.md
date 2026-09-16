# Practic Concerns Ltd — site + work-order API

Static multi-page site (blueprint/work-order aesthetic) with a real backend:
a Node.js/Express REST API running as a Netlify Function, backed by PostgreSQL.

## Pages
`index.html · services.html · process.html · work.html · contact.html · admin.html`

## API
| Method | Path                | Auth              | Purpose                        |
|--------|---------------------|-------------------|---------------------------------|
| POST   | `/api/contact`      | none              | Create a work-order enquiry     |
| GET    | `/api/enquiries`    | `x-admin-token`   | List enquiries (newest first)   |
| PATCH  | `/api/enquiries/:id`| `x-admin-token`   | Update status: `new`/`handled`  |

Every `POST /api/contact` does two things: saves the enquiry to Postgres, then
sends a notification email via Resend. The email is best-effort — if it fails,
the enquiry is still saved and the form still shows success to the visitor.

Code lives in `netlify/functions/api.js` (Express + `serverless-http`) and
`netlify/functions/db.js` (pg Pool). `email.js` (Resend) sits in the project
root alongside the site pages.

## One-time setup

1. **Create a free Postgres database** — any of these work fine:
   - [Neon](https://neon.tech) (recommended — serverless-friendly, generous free tier)
   - [Supabase](https://supabase.com)
   - [Railway](https://railway.app)

   Copy the connection string it gives you (starts with `postgres://`).

2. **Run the schema** against that database — either paste `db/schema.sql` into
   your host's SQL editor (Neon/Supabase both have one), or from a machine with `psql`:
   ```bash
   psql "$DATABASE_URL" -f db/schema.sql
   ```

3. **Generate an admin token** (protects the enquiry log):
   ```bash
   openssl rand -hex 24
   ```

4. **Create a free Resend account** at [resend.com](https://resend.com) and grab
   an API key from the dashboard (API Keys → Create API Key). Until you verify
   your own domain there, Resend only lets you send *from* their shared
   `onboarding@resend.dev` address *to* the email you signed up with — which
   is exactly what's needed here, since notifications just need to land in
   your own inbox.

5. **Set environment variables in Netlify**: Site settings → Environment variables:
   - `DATABASE_URL` — your connection string from step 1
   - `ADMIN_TOKEN` — the token from step 3
   - `RESEND_API_KEY` — the key from step 4
   - `NOTIFY_EMAIL` — the address that should receive new enquiries (must be
     the same address your Resend account is signed up with, until a domain
     is verified)

6. **Install dependencies and deploy**:
   ```bash
   npm install
   netlify deploy --prod
   ```
   (Or connect the repo in the Netlify UI — it'll pick up `netlify.toml` automatically.)

## Local development

```bash
cp .env.example .env   # fill in DATABASE_URL, ADMIN_TOKEN, RESEND_API_KEY, NOTIFY_EMAIL
npm install
netlify dev             # serves the site + functions together at localhost:8888
```

## Using the admin log

Visit `/admin.html`, paste the `ADMIN_TOKEN` in, and it'll load the enquiry list
from `GET /api/enquiries`. The token is kept in `sessionStorage` only (cleared
when the tab closes) — nothing is stored client-side long-term.
