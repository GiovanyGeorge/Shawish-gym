import type { ShawishDatabase } from "../database/init";
import { isInTransaction, runInTransaction } from "../database/transaction";
import type { Database } from "sql.js";

let databaseRef: ShawishDatabase | null = null;

export function setDatabase(store: ShawishDatabase): void {
  databaseRef = store;
}

export function getDatabase(): ShawishDatabase {
  if (!databaseRef) {
    throw new Error("Database is not initialized.");
  }
  return databaseRef;
}

export function withPersist<T>(fn: (db: Database) => T): T {
  const store = getDatabase();
  const result = fn(store.db);
  if (!isInTransaction()) {
    store.persist();
  }
  return result;
}

export function withPersistTransaction<T>(fn: (db: Database) => T): T {
  const store = getDatabase();
  const result = runInTransaction(store.db, () => fn(store.db));
  store.persist();
  return result;
}
