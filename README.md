# Practic Concerns Ltd — site + work-order API

Static multi-page site (blueprint/work-order aesthetic) with a real backend:
a Node.js/Express REST API running as a Netlify Function, backed by PostgreSQL.

## Pages
`index.html · services.html · process.html · stack.html · work.html · contact.html · admin.html`

## API
| Method | Path                | Auth              | Purpose                        |
|--------|---------------------|-------------------|---------------------------------|
| POST   | `/api/contact`      | none              | Create a work-order enquiry     |
| GET    | `/api/enquiries`    | `x-admin-token`   | List enquiries (newest first)   |
| PATCH  | `/api/enquiries/:id`| `x-admin-token`   | Update status: `new`/`handled`  |

Code lives in `netlify/functions/api.js` (Express + `serverless-http`) and `netlify/functions/db.js` (pg Pool).

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

4. **Set environment variables in Netlify**: Site settings → Environment variables:
   - `DATABASE_URL` — your connection string from step 1
   - `ADMIN_TOKEN` — the token from step 3

5. **Install dependencies and deploy**:
   ```bash
   npm install
   netlify deploy --prod
   ```
   (Or connect the repo in the Netlify UI — it'll pick up `netlify.toml` automatically.)

## Local development

```bash
cp .env.example .env   # fill in DATABASE_URL and ADMIN_TOKEN
npm install
netlify dev             # serves the site + functions together at localhost:8888
```

## Using the admin log

Visit `/admin.html`, paste the `ADMIN_TOKEN` in, and it'll load the enquiry list
from `GET /api/enquiries`. The token is kept in `sessionStorage` only (cleared
when the tab closes) — nothing is stored client-side long-term.
