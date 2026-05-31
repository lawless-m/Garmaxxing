import type { LngLat } from '../gps/geo';
import { normalisePostcode, type PostcodeLookup } from './postcode';

/**
 * Postcode lookup backed by the read-only postcodes.sqlite built on the Xeon
 * (data/build-postcodes.sh). Uses sql.js (SQLite compiled to WASM) so the
 * single file is queried directly in the browser — no server, fully offline.
 *
 * The WASM and the .sqlite are loaded lazily on first lookup, keeping startup
 * (and the moving map) snappy.
 */
export class SqlitePostcodeLookup implements PostcodeLookup {
  private readonly dbUrl: string;
  private readonly wasmUrl: string | undefined;
  private dbPromise: Promise<QueryableDb> | null = null;

  constructor(options: { dbUrl?: string; wasmUrl?: string } = {}) {
    this.dbUrl = options.dbUrl ?? '/postcodes.sqlite';
    this.wasmUrl = options.wasmUrl;
  }

  async resolve(postcode: string): Promise<LngLat | null> {
    const db = await this.load();
    const rows = db.exec(
      'SELECT lat, lon FROM postcode WHERE pc = ? LIMIT 1',
      [normalisePostcode(postcode)],
    );
    if (rows.length === 0) return null;
    const [lat, lon] = rows[0]!;
    return { lat: lat as number, lng: lon as number };
  }

  private load(): Promise<QueryableDb> {
    if (this.dbPromise === null) {
      this.dbPromise = this.openDb();
    }
    return this.dbPromise;
  }

  private async openDb(): Promise<QueryableDb> {
    // Dynamic import so sql.js (and its WASM) is only fetched when a postcode
    // is actually entered — favourites-only journeys never pay for it.
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs(
      this.wasmUrl ? { locateFile: () => this.wasmUrl! } : undefined,
    );
    const buf = await fetch(this.dbUrl).then((r) => {
      if (!r.ok) throw new Error(`Failed to load ${this.dbUrl}: HTTP ${r.status}`);
      return r.arrayBuffer();
    });
    const db = new SQL.Database(new Uint8Array(buf));
    return {
      exec: (sql, params) => {
        const stmt = db.prepare(sql);
        try {
          stmt.bind(params as (string | number | null)[]);
          const out: unknown[][] = [];
          while (stmt.step()) out.push(stmt.get());
          return out;
        } finally {
          stmt.free();
        }
      },
    };
  }
}

/** The slice of sql.js we use, so the rest stays decoupled from its types. */
interface QueryableDb {
  exec(sql: string, params: unknown[]): unknown[][];
}
