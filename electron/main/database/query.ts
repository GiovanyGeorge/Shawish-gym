import type { Database, SqlValue } from "sql.js";

export type Row = Record<string, SqlValue>;

export function queryAll(db: Database, sql: string, params: SqlValue[] = []): Row[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: Row[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

export function queryOne(db: Database, sql: string, params: SqlValue[] = []): Row | null {
  const rows = queryAll(db, sql, params);
  return rows[0] ?? null;
}

export function runStatement(
  db: Database,
  sql: string,
  params: SqlValue[] = [],
): number {
  db.run(sql, params);
  const row = queryOne(db, "SELECT last_insert_rowid() AS id;");
  return Number(row?.id ?? 0);
}

export function runExecute(db: Database, sql: string, params: SqlValue[] = []): void {
  db.run(sql, params);
}
