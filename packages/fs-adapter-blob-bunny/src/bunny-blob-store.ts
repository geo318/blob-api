import type { BlobStore } from "@blob-api/fs-core";

export interface BunnyBlobStoreConfig {
	storageZone: string;
	accessKey: string;
	endpoint?: string;
}

export class BunnyBlobStore implements BlobStore {
	private storageZone: string;
	private accessKey: string;
	private baseUrl: string;

	constructor(config: BunnyBlobStoreConfig) {
		this.storageZone = config.storageZone;
		this.accessKey = config.accessKey;
		const endpoint = config.endpoint || "storage.bunnycdn.com";
		this.baseUrl = endpoint.startsWith("http")
			? endpoint.replace(/\/+$/, "")
			: `https://${endpoint.replace(/\/+$/, "")}`;
	}

	private deriveStorageKey(sha256: string): string {
		return `${sha256.slice(0, 2)}/${sha256}`;
	}

	private buildUrl(sha256: string): string {
		return `${this.baseUrl}/${this.storageZone}/${this.deriveStorageKey(sha256)}`;
	}

	private async request(sha256: string, init: RequestInit): Promise<Response> {
		return fetch(this.buildUrl(sha256), {
			...init,
			headers: {
				AccessKey: this.accessKey,
				...(init.headers || {}),
			},
		});
	}

	async put(sha256: string, content: Uint8Array): Promise<void> {
		const response = await this.request(sha256, {
			method: "PUT",
			body: content,
		});

		if (!response.ok) {
			throw new Error(
				`Failed to upload blob ${sha256}: ${response.status} ${response.statusText}`,
			);
		}
	}

	async get(sha256: string): Promise<Uint8Array> {
		const response = await this.request(sha256, { method: "GET" });

		if (response.status === 404) {
			throw new Error(`Blob not found: ${sha256}`);
		}
		if (!response.ok) {
			throw new Error(
				`Failed to download blob ${sha256}: ${response.status} ${response.statusText}`,
			);
		}

		const buffer = await response.arrayBuffer();
		return new Uint8Array(buffer);
	}

	async delete(sha256: string): Promise<void> {
		const response = await this.request(sha256, { method: "DELETE" });
		if (response.status === 404) {
			return;
		}
		if (!response.ok) {
			throw new Error(
				`Failed to delete blob ${sha256}: ${response.status} ${response.statusText}`,
			);
		}
	}
}
