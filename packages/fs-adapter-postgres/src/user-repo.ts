import { eq } from "drizzle-orm";
import { users } from "./schema.js";
import { getDb } from "./transaction-context.js";

export interface User {
	id: string;
	email: string;
	passwordHash: string;
	createdAt: Date;
}

export class PostgresUserRepo {
	async createUser(email: string, passwordHash: string): Promise<User> {
		const db = getDb();
		const [result] = await db
			.insert(users)
			.values({
				email,
				passwordHash,
			})
			.returning();

		return {
			id: result.id,
			email: result.email,
			passwordHash: result.passwordHash,
			createdAt: result.createdAt,
		};
	}

	async findByEmail(email: string): Promise<User | null> {
		const db = getDb();
		const [result] = await db
			.select()
			.from(users)
			.where(eq(users.email, email))
			.limit(1);

		if (!result) {
			return null;
		}

		return {
			id: result.id,
			email: result.email,
			passwordHash: result.passwordHash,
			createdAt: result.createdAt,
		};
	}

	async findById(id: string): Promise<User | null> {
		const db = getDb();
		const [result] = await db
			.select()
			.from(users)
			.where(eq(users.id, id))
			.limit(1);

		if (!result) {
			return null;
		}

		return {
			id: result.id,
			email: result.email,
			passwordHash: result.passwordHash,
			createdAt: result.createdAt,
		};
	}
}
