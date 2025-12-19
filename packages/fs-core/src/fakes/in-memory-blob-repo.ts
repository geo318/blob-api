import type { BlobRecord, BlobRepo } from "../ports.js";

export class InMemoryBlobRepo implements BlobRepo {
	private blobs = new Map<string, BlobRecord>();
	private bySha256 = new Map<string, BlobRecord>();

	async upsertBlob(
		blob: Omit<BlobRecord, "id" | "createdAt">,
	): Promise<BlobRecord> {
		const existing = this.bySha256.get(blob.sha256);
		if (existing) {
			return existing;
		}

		const now = new Date();
		const fullBlob: BlobRecord = {
			id: crypto.randomUUID(),
			...blob,
			createdAt: now,
		};

		this.blobs.set(fullBlob.id, fullBlob);
		this.bySha256.set(fullBlob.sha256, fullBlob);
		return fullBlob;
	}

	async findById(id: string): Promise<BlobRecord | null> {
		return this.blobs.get(id) || null;
	}

	async findBySha256(sha256: string): Promise<BlobRecord | null> {
		return this.bySha256.get(sha256) || null;
	}

	async incrementRefCount(id: string): Promise<void> {
		const blob = this.blobs.get(id);
		if (!blob) {
			throw new Error(`Blob not found: ${id}`);
		}
		blob.refCount++;
	}

	async decrementRefCount(id: string): Promise<void> {
		const blob = this.blobs.get(id);
		if (!blob) {
			throw new Error(`Blob not found: ${id}`);
		}
		blob.refCount = Math.max(0, blob.refCount - 1);
	}

	async findOrphans(limit: number): Promise<BlobRecord[]> {
		const orphans: BlobRecord[] = [];
		for (const blob of this.blobs.values()) {
			if (blob.refCount === 0) {
				orphans.push(blob);
				if (orphans.length >= limit) {
					break;
				}
			}
		}
		return orphans;
	}

	async deleteBlob(id: string): Promise<void> {
		const blob = this.blobs.get(id);
		if (!blob) {
			throw new Error(`Blob not found: ${id}`);
		}
		this.blobs.delete(id);
		this.bySha256.delete(blob.sha256);
	}
}
