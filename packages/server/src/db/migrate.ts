import pg from 'pg';

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgres://keygate:keygate_dev@localhost:5432/keygate';

const MIGRATIONS = [
  {
    name: '001_initial',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT,
        team_id TEXT,
        role TEXT NOT NULL DEFAULT 'owner',
        salt TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS connections (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        team_id TEXT,
        provider TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        scopes TEXT[] NOT NULL DEFAULT '{}',
        encrypted_credentials BYTEA,
        connection_key_id TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        last_used_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS scoped_tokens (
        id TEXT PRIMARY KEY,
        connection_id TEXT NOT NULL REFERENCES connections(id),
        reference TEXT UNIQUE NOT NULL,
        agent_id TEXT NOT NULL,
        scopes JSONB NOT NULL,
        access_token_hash TEXT NOT NULL,
        encrypted_access_token BYTEA NOT NULL,
        issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ,
        usage_count INT NOT NULL DEFAULT 0,
        max_usage INT
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        connection_id TEXT NOT NULL,
        token_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        action TEXT NOT NULL,
        resource TEXT,
        provider TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        ip TEXT,
        success BOOLEAN NOT NULL DEFAULT true,
        error TEXT
      );

      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        team_id TEXT,
        name TEXT NOT NULL,
        key_hash TEXT UNIQUE NOT NULL,
        prefix TEXT NOT NULL,
        scopes TEXT[] NOT NULL DEFAULT '{*}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_used_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ
      );

      CREATE INDEX idx_connections_user_id ON connections(user_id);
      CREATE INDEX idx_connections_provider ON connections(provider);
      CREATE INDEX idx_scoped_tokens_connection ON scoped_tokens(connection_id);
      CREATE INDEX idx_scoped_tokens_reference ON scoped_tokens(reference);
      CREATE INDEX idx_scoped_tokens_agent ON scoped_tokens(agent_id);
      CREATE INDEX idx_audit_log_connection ON audit_log(connection_id);
      CREATE INDEX idx_audit_log_agent ON audit_log(agent_id);
      CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);
      CREATE INDEX idx_api_keys_user ON api_keys(user_id);
      CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

      CREATE TABLE IF NOT EXISTS migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
  },
];

async function migrate() {
  const client = new pg.Client(DATABASE_URL);
  await client.connect();

  try {
    await client.query(
      'CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())',
    );

    for (const migration of MIGRATIONS) {
      const { rows } = await client.query(
        'SELECT name FROM migrations WHERE name = $1',
        [migration.name],
      );
      if (rows.length > 0) {
        console.log(`Migration ${migration.name} already applied, skipping`);
        continue;
      }

      console.log(`Applying migration: ${migration.name}`);
      await client.query(migration.sql);
      await client.query('INSERT INTO migrations (name) VALUES ($1)', [
        migration.name,
      ]);
      console.log(`Migration ${migration.name} applied successfully`);
    }

    console.log('All migrations complete');
  } finally {
    await client.end();
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
