import pg from 'pg';

// One atomic JSONB checkpoint keeps evidence, decisions, counters and device
// sessions consistent. This is a single shared demonstration lab, not a SIEM index.
export class PostgresStore {
  constructor(connectionString, { labId = 'default' } = {}) {
    if (!connectionString) throw new Error('DATABASE_URL is required for PostgreSQL storage.');
    this.labId = labId;
    this.pool = new pg.Pool({ connectionString, max: 2, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000, statement_timeout: 10000 });
    // pg removes broken idle clients; the next query either reconnects or fails.
    this.pool.on('error', () => {});
  }

  async load(initial) {
    await this.pool.query(`CREATE TABLE IF NOT EXISTS soc_lab_snapshots (
      lab_id text PRIMARY KEY,
      revision bigint NOT NULL DEFAULT 0,
      payload jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await this.pool.query('INSERT INTO soc_lab_snapshots (lab_id, payload) VALUES ($1, $2::jsonb) ON CONFLICT (lab_id) DO NOTHING', [this.labId, JSON.stringify(initial)]);
    const { rows } = await this.pool.query('SELECT revision, payload FROM soc_lab_snapshots WHERE lab_id = $1', [this.labId]);
    this.revision = rows[0].revision;
    return rows[0].payload;
  }

  async save(snapshot) {
    // Compare-and-swap prevents a second server from silently overwriting this lab.
    const result = await this.pool.query(`UPDATE soc_lab_snapshots
      SET payload = $1::jsonb, revision = revision + 1, updated_at = now()
      WHERE lab_id = $2 AND revision = $3 RETURNING revision`, [JSON.stringify(snapshot), this.labId, this.revision]);
    if (result.rowCount !== 1) throw new Error('Another server changed this lab. Run one server per database lab.');
    this.revision = result.rows[0].revision;
  }

  async close() { await this.pool.end(); }
}
