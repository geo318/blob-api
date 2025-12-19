import type {
	BlobRecord,
	MetadataEntry,
	MetadataRepo,
} from "@blob-api/fs-core";
import { and, eq } from "drizzle-orm";
import { entries } from "./schema.js";
import { getDb } from "./transaction-context.js";

export class PostgresMetadataRepo implements MetadataRepo {
	async createEntry(
		entry: Omit<MetadataEntry, "id" | "createdAt" | "updatedAt">,
	): Promise<MetadataEntry> {
		const db = getDb();
		const [result] = await db
			.insert(entries)
			.values({
				ownerId: entry.ownerId,
				type: entry.type,
				path: entry.path,
				name: entry.name,
				parentPath: entry.parentPath,
				blobId: entry.blobId,
				size: entry.size,
				mimeType: entry.mimeType,
			})
			.returning();

		return {
			id: result.id,
			ownerId: result.ownerId,
			type: result.type as "file" | "dir",
			path: result.path,
			name: result.name,
			parentPath: result.parentPath,
			blobId: result.blobId,
			size: Number(result.size),
			mimeType: result.mimeType,
			createdAt: result.createdAt,
			updatedAt: result.updatedAt,
		};
	}

	async findByPath(
		ownerId: string,
		path: string,
	): Promise<MetadataEntry | null> {
		const db = getDb();
		const [result] = await db
			.select()
			.from(entries)
			.where(and(eq(entries.ownerId, ownerId), eq(entries.path, path)))
			.limit(1);

		if (!result) {
			return null;
		}

		return {
			id: result.id,
			ownerId: result.ownerId,
			type: result.type as "file" | "dir",
			path: result.path,
			name: result.name,
			parentPath: result.parentPath,
			blobId: result.blobId,
			size: Number(result.size),
			mimeType: result.mimeType,
			createdAt: result.createdAt,
			updatedAt: result.updatedAt,
		};
	}

	async findByParentPath(
		ownerId: string,
		parentPath: string | null,
		limit: number = 100,
		offset: number = 0,
	): Promise<MetadataEntry[]> {
		const db = getDb();
		const conditions = [eq(entries.ownerId, ownerId)];
		if (parentPath === null) {
			conditions.push(eq(entries.parentPath, ""));
		} else {
			conditions.push(eq(entries.parentPath, parentPath));
		}

		const results = await db
			.select()
			.from(entries)
			.where(and(...conditions))
			.orderBy(entries.name)
			.limit(limit)
			.offset(offset);

		return results.map((result) => ({
			id: result.id,
			ownerId: result.ownerId,
			type: result.type as "file" | "dir",
			path: result.path,
			name: result.name,
			parentPath: result.parentPath,
			blobId: result.blobId,
			size: Number(result.size),
			mimeType: result.mimeType,
			createdAt: result.createdAt,
			updatedAt: result.updatedAt,
		}));
	}

	async updateEntry(
		id: string,
		updates: Partial<MetadataEntry>,
	): Promise<MetadataEntry> {
		const db = getDb();
		const updateData: Record<string, unknown> = {};
		if (updates.path !== undefined) updateData.path = updates.path;
		if (updates.name !== undefined) updateData.name = updates.name;
		if (updates.parentPath !== undefined)
			updateData.parentPath = updates.parentPath;
		if (updates.blobId !== undefined) updateData.blobId = updates.blobId;
		if (updates.size !== undefined) updateData.size = updates.size;
		if (updates.mimeType !== undefined) updateData.mimeType = updates.mimeType;
		updateData.updatedAt = new Date();

		const [result] = await db
			.update(entries)
			.set(updateData)
			.where(eq(entries.id, id))
			.returning();

		if (!result) {
			throw new Error(`Entry not found: ${id}`);
		}

		return {
			id: result.id,
			ownerId: result.ownerId,
			type: result.type as "file" | "dir",
			path: result.path,
			name: result.name,
			parentPath: result.parentPath,
			blobId: result.blobId,
			size: Number(result.size),
			mimeType: result.mimeType,
			createdAt: result.createdAt,
			updatedAt: result.updatedAt,
		};
	}

	async deleteEntry(id: string): Promise<void> {
		const db = getDb();
		await db.delete(entries).where(eq(entries.id, id));
	}

	async findBlobBySha256(_sha256: string): Promise<BlobRecord | null> {
		// not implemented currently
		return null;
	}
}
