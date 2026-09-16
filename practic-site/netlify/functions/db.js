const { Pool } = require('pg');

// Reuse the pool across warm serverless invocations. Keep max connections low —
// serverless functions can spin up many concurrent instances, and most hosted
// free-tier Postgres plans (Neon, Supabase, Railway) cap total connections.
let pool;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

module.exports = { getPool };
