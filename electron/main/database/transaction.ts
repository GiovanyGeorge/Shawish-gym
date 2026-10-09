import type { Database } from "sql.js";

let transactionDepth = 0;

export function isInTransaction(): boolean {
  return transactionDepth > 0;
}

export function runInTransaction<T>(db: Database, fn: () => T): T {
  const nested = transactionDepth > 0;
  transactionDepth += 1;
  try {
    if (!nested) {
      db.run("BEGIN;");
    }
    try {
      const result = fn();
      if (!nested) {
        db.run("COMMIT;");
      }
      return result;
    } catch (error) {
      if (!nested) {
        try {
          db.run("ROLLBACK;");
        } catch {
          // sql.js aborts the transaction on the original SQL error.
        }
      }
      throw error;
    }
  } finally {
    transactionDepth -= 1;
  }
}
