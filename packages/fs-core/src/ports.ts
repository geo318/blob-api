export interface MetadataEntry {
	id: string;
	ownerId: string;
	type: "file" | "dir";
	path: string;
	name: string;
	parentPath: string | null;
	blobId: string | null;
	size: number;
	mimeType: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface BlobRecord {
	id: string;
	sha256: string;
	size: number;
	storageKey: string;
	refCount: number;
	createdAt: Date;
}

export interface MetadataRepo {
	createEntry(
		entry: Omit<MetadataEntry, "id" | "createdAt" | "updatedAt">,
	): Promise<MetadataEntry>;
	findByPath(ownerId: string, path: string): Promise<MetadataEntry | null>;
	findByParentPath(
		ownerId: string,
		parentPath: string | null,
		limit?: number,
		offset?: number,
	): Promise<MetadataEntry[]>;
	updateEntry(
		id: string,
		updates: Partial<MetadataEntry>,
	): Promise<MetadataEntry>;
	deleteEntry(id: string): Promise<void>;
	findBlobBySha256(sha256: string): Promise<BlobRecord | null>;
}

export interface BlobRepo {
	upsertBlob(blob: Omit<BlobRecord, "id" | "createdAt">): Promise<BlobRecord>;
	findById(id: string): Promise<BlobRecord | null>;
	findBySha256(sha256: string): Promise<BlobRecord | null>;
	incrementRefCount(id: string): Promise<void>;
	decrementRefCount(id: string): Promise<void>;
	findOrphans(limit: number): Promise<BlobRecord[]>;
	deleteBlob(id: string): Promise<void>;
}

export interface BlobStore {
	put(sha256: string, content: Uint8Array): Promise<void>;
	get(sha256: string): Promise<Uint8Array>;
	delete(sha256: string): Promise<void>;
}

export interface TransactionManager {
	transaction<T>(fn: () => Promise<T>): Promise<T>;
}
