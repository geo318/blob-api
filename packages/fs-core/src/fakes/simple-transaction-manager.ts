import type { TransactionManager } from "../ports.js";

export class SimpleTransactionManager implements TransactionManager {
	async transaction<T>(fn: () => Promise<T>): Promise<T> {
		// Simple synchronous execution (no actual transaction)
		return await fn();
	}
}
