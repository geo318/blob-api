import type { TransactionManager } from "@blob-api/fs-core";
import { db } from "./db.js";
import { getTransaction, runInTransaction } from "./transaction-context.js";

export class PostgresTransactionManager implements TransactionManager {
	async transaction<T>(fn: () => Promise<T>): Promise<T> {
		const existing = getTransaction();
		if (existing) {
			return await fn();
		}
		return await db.transaction(async (tx) => runInTransaction(tx, fn));
	}
}
