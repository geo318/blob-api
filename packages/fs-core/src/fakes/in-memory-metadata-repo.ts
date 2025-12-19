import type { MetadataEntry, MetadataRepo } from "../ports.js";

export class InMemoryMetadataRepo implements MetadataRepo {
	private entries = new Map<string, MetadataEntry>();

	private key(ownerId: string, path: string): string {
		return `${ownerId}:${path}`;
	}

	async createEntry(
		entry: Omit<MetadataEntry, "id" | "createdAt" | "updatedAt">,
	): Promise<MetadataEntry> {
		const key = this.key(entry.ownerId, entry.path);
		if (this.entries.has(key)) {
			throw new Error(`Entry already exists: ${entry.path}`);
		}

		const now = new Date();
		const fullEntry: MetadataEntry = {
			id: crypto.randomUUID(),
			...entry,
			createdAt: now,
			updatedAt: now,
		};

		this.entries.set(key, fullEntry);
		return fullEntry;
	}

	async findByPath(
		ownerId: string,
		path: string,
	): Promise<MetadataEntry | null> {
		const key = this.key(ownerId, path);
		return this.entries.get(key) || null;
	}

	async findByParentPath(
		ownerId: string,
		parentPath: string | null,
		limit: number = 100,
		offset: number = 0,
	): Promise<MetadataEntry[]> {
		const results: MetadataEntry[] = [];
		for (const entry of this.entries.values()) {
			if (entry.ownerId === ownerId && entry.parentPath === parentPath) {
				results.push(entry);
			}
		}
		// Sort by name for consistency
		results.sort((a, b) => a.name.localeCompare(b.name));
		return results.slice(offset, offset + limit);
	}

	async updateEntry(
		id: string,
		updates: Partial<MetadataEntry>,
	): Promise<MetadataEntry> {
		let found: MetadataEntry | undefined;
		for (const entry of this.entries.values()) {
			if (entry.id === id) {
				found = entry;
				break;
			}
		}

		if (!found) {
			throw new Error(`Entry not found: ${id}`);
		}

		// If path changed, update the key
		if (updates.path && updates.path !== found.path) {
			const oldKey = this.key(found.ownerId, found.path);
			const newKey = this.key(found.ownerId, updates.path);
			this.entries.delete(oldKey);
			found = { ...found, ...updates, updatedAt: new Date() };
			this.entries.set(newKey, found);
		} else {
			found = { ...found, ...updates, updatedAt: new Date() };
			const key = this.key(found.ownerId, found.path);
			this.entries.set(key, found);
		}

		return found;
	}

	async deleteEntry(id: string): Promise<void> {
		for (const [key, entry] of this.entries.entries()) {
			if (entry.id === id) {
				this.entries.delete(key);
				return;
			}
		}
		throw new Error(`Entry not found: ${id}`);
	}

	async findBlobBySha256(
		sha256: string,
	): Promise<import("../ports.js").BlobRecord | null> {
		// This is not implemented in the in-memory version
		// It's only used by the Postgres adapter
		return null;
	}
}
