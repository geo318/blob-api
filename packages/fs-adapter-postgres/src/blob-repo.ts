import type { BlobRecord, BlobRepo } from "@blob-api/fs-core";
import { eq, sql } from "drizzle-orm";
import { blobs } from "./schema.js";
import { getDb } from "./transaction-context.js";

export class PostgresBlobRepo implements BlobRepo {
	async upsertBlob(
		blob: Omit<BlobRecord, "id" | "createdAt">,
	): Promise<BlobRecord> {
		const db = getDb();
		const [existing] = await db
			.select()
			.from(blobs)
			.where(eq(blobs.sha256, blob.sha256))
			.limit(1);

		if (existing) {
			return {
				id: existing.id,
				sha256: existing.sha256,
				size: Number(existing.size),
				storageKey: existing.storageKey,
				refCount: existing.refCount,
				createdAt: existing.createdAt,
			};
		}

		const [result] = await db
			.insert(blobs)
			.values({
				sha256: blob.sha256,
				size: blob.size,
				storageKey: blob.storageKey,
				refCount: blob.refCount,
			})
			.returning();

		return {
			id: result.id,
			sha256: result.sha256,
			size: Number(result.size),
			storageKey: result.storageKey,
			refCount: result.refCount,
			createdAt: result.createdAt,
		};
	}

	async findById(id: string): Promise<BlobRecord | null> {
		const db = getDb();
		const [result] = await db
			.select()
			.from(blobs)
			.where(eq(blobs.id, id))
			.limit(1);

		if (!result) {
			return null;
		}

		return {
			id: result.id,
			sha256: result.sha256,
			size: Number(result.size),
			storageKey: result.storageKey,
			refCount: result.refCount,
			createdAt: result.createdAt,
		};
	}

	async findBySha256(sha256: string): Promise<BlobRecord | null> {
		const db = getDb();
		const [result] = await db
			.select()
			.from(blobs)
			.where(eq(blobs.sha256, sha256))
			.limit(1);

		if (!result) {
			return null;
		}

		return {
			id: result.id,
			sha256: result.sha256,
			size: Number(result.size),
			storageKey: result.storageKey,
			refCount: result.refCount,
			createdAt: result.createdAt,
		};
	}

	async incrementRefCount(id: string): Promise<void> {
		const db = getDb();
		await db
			.update(blobs)
			.set({ refCount: sql`${blobs.refCount} + 1` })
			.where(eq(blobs.id, id));
	}

	async decrementRefCount(id: string): Promise<void> {
		const db = getDb();
		await db
			.update(blobs)
			.set({ refCount: sql`${blobs.refCount} - 1` })
			.where(eq(blobs.id, id));
	}

	async findOrphans(limit: number): Promise<BlobRecord[]> {
		const db = getDb();
		const results = await db
			.select()
			.from(blobs)
			.where(eq(blobs.refCount, 0))
			.limit(limit);

		return results.map((result) => ({
			id: result.id,
			sha256: result.sha256,
			size: Number(result.size),
			storageKey: result.storageKey,
			refCount: result.refCount,
			createdAt: result.createdAt,
		}));
	}

	async deleteBlob(id: string): Promise<void> {
		const db = getDb();
		await db.delete(blobs).where(eq(blobs.id, id));
	}
}
