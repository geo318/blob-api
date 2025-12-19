import { AsyncLocalStorage } from "node:async_hooks";
import type { PostgresJsTransaction } from "drizzle-orm/postgres-js";
import type { ExtractTablesWithRelations } from "drizzle-orm/relations";
import { type Db, db } from "./db.js";
import type * as schema from "./schema.js";

type FullSchema = typeof schema;
type RelationalSchema = ExtractTablesWithRelations<FullSchema>;

export type DbOrTx = Db | PostgresJsTransaction<FullSchema, RelationalSchema>;

const storage = new AsyncLocalStorage<DbOrTx>();

export const getDb = (): DbOrTx => storage.getStore() ?? db;

export const getTransaction = (): DbOrTx | undefined => storage.getStore();

export const runInTransaction = async <T>(
	tx: DbOrTx,
	fn: () => Promise<T>,
): Promise<T> => storage.run(tx, fn);
