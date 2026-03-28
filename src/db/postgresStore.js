import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const DEFAULT_CONNECTION = 'postgres://postgres:postgres@localhost:5432/ludox';

const schemaSql = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_events (
  id BIGSERIAL PRIMARY KEY,
  room_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL,
  player_id TEXT,
  action_id TEXT,
  payload JSONB,
  UNIQUE(room_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_room_events_room_id ON room_events(room_id);
`;

function toPublicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name
  };
}

export class PostgresStore {
  constructor({ connectionString = process.env.DATABASE_URL ?? DEFAULT_CONNECTION } = {}) {
    this.connectionString = connectionString;
    this.pool = new Pool({ connectionString });
  }

  async init() {
    await this.pool.query(schemaSql);
  }

  async close() {
    await this.pool.end();
  }

  async registerUser({ username, displayName, password }) {
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedDisplayName = displayName.trim();
    const hash = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users (username, display_name, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, username, display_name;
    `;

    const result = await this.pool.query(query, [normalizedUsername, normalizedDisplayName, hash]);
    return toPublicUser(result.rows[0]);
  }

  async verifyUser({ username, password }) {
    const normalizedUsername = username.trim().toLowerCase();
    const result = await this.pool.query(
      'SELECT id, username, display_name, password_hash FROM users WHERE username = $1',
      [normalizedUsername]
    );

    const row = result.rows[0];
    if (!row) return null;

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) return null;

    return toPublicUser(row);
  }

  async getUserById(userId) {
    const result = await this.pool.query('SELECT id, username, display_name FROM users WHERE id = $1', [userId]);
    return toPublicUser(result.rows[0]);
  }

  async appendRoomEvent(roomId, event) {
    const sequence = Number(event.sequence);
    const timestamp = event.timestamp ?? new Date().toISOString();

    await this.pool.query(
      `
      INSERT INTO room_events (room_id, sequence, timestamp, type, player_id, action_id, payload)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (room_id, sequence) DO NOTHING
      `,
      [
        roomId,
        sequence,
        timestamp,
        event.type,
        event.playerId ?? null,
        event.actionId ?? null,
        event.payload ?? null
      ]
    );
  }

  async getReplayEvents(roomId) {
    const result = await this.pool.query(
      `
      SELECT sequence, timestamp, type, player_id AS "playerId", action_id AS "actionId", payload
      FROM room_events
      WHERE room_id = $1
      ORDER BY sequence ASC
      `,
      [roomId]
    );

    return result.rows.map((row) => ({
      sequence: Number(row.sequence),
      timestamp: new Date(row.timestamp).toISOString(),
      type: row.type,
      playerId: row.playerId ?? undefined,
      actionId: row.actionId ?? undefined,
      payload: row.payload ?? undefined
    }));
  }
}

export async function createPostgresStore(options) {
  const store = new PostgresStore(options);
  await store.init();
  return store;
}
