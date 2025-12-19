import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { BlobStore } from "@blob-api/fs-core";

export interface LocalBlobStoreConfig {
	basePath: string;
}

export class LocalBlobStore implements BlobStore {
	private basePath: string;

	constructor(config: LocalBlobStoreConfig) {
		this.basePath = resolve(config.basePath);
	}

	private deriveStorageKey(sha256: string): string {
		return `${sha256.slice(0, 2)}/${sha256}`;
	}

	private resolvePath(sha256: string): string {
		return join(this.basePath, this.deriveStorageKey(sha256));
	}

	async put(sha256: string, content: Uint8Array): Promise<void> {
		const filePath = this.resolvePath(sha256);
		await mkdir(dirname(filePath), { recursive: true });

		try {
			await writeFile(filePath, content, { flag: "wx" });
		} catch (error: any) {
			if (error?.code === "EEXIST") {
				return;
			}
			throw error;
		}
	}

	async get(sha256: string): Promise<Uint8Array> {
		const filePath = this.resolvePath(sha256);
		try {
			const data = await readFile(filePath);
			return new Uint8Array(data);
		} catch (error: any) {
			if (error?.code === "ENOENT") {
				throw new Error(`Blob not found: ${sha256}`);
			}
			throw error;
		}
	}

	async delete(sha256: string): Promise<void> {
		const filePath = this.resolvePath(sha256);
		try {
			await unlink(filePath);
		} catch (error: any) {
			if (error?.code === "ENOENT") {
				return;
			}
			throw error;
		}
	}
}
