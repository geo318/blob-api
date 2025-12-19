import type { BlobStore } from "../ports.js";

export class InMemoryBlobStore implements BlobStore {
	private store = new Map<string, Uint8Array>();

	async put(sha256: string, content: Uint8Array): Promise<void> {
		// Idempotent - if exists, treat as success
		this.store.set(sha256, content);
	}

	async get(sha256: string): Promise<Uint8Array> {
		const content = this.store.get(sha256);
		if (!content) {
			throw new Error(`Blob not found: ${sha256}`);
		}
		return content;
	}

	async delete(sha256: string): Promise<void> {
		// Ignore if not found (idempotent)
		this.store.delete(sha256);
	}
}
