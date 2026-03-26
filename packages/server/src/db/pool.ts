import pg from 'pg';

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgres://keygate:keygate_dev@localhost:5432/keygate';

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

export async function query<T extends pg.QueryResultRow = any>(
  sql: string,
  params?: any[],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(sql, params);
}

export async function getClient(): Promise<pg.PoolClient> {
  return pool.connect();
}

export async function shutdown(): Promise<void> {
  await pool.end();
}

export { pool };
