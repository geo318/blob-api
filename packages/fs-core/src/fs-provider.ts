import { createHash } from "node:crypto";
import { ErrorCodes, FsError } from "./errors.js";
import {
	getName,
	getParentPath,
	normalizePath,
	resolvePath,
} from "./path-utils.js";
import type {
	BlobRepo,
	BlobStore,
	MetadataRepo,
	TransactionManager,
} from "./ports.js";
import type { FsNode, WorkingDirectoryContext } from "./types.js";

export interface FsProviderConfig {
	metadataRepo: MetadataRepo;
	blobRepo: BlobRepo;
	blobStore: BlobStore;
	transactionManager: TransactionManager;
}

export class FsProvider {
	private workingDirs: WorkingDirectoryContext = {};

	constructor(private readonly config: FsProviderConfig) {}

	forOwner(ownerId: string): ScopedFsProvider {
		return new ScopedFsProvider(this, ownerId);
	}

	getWorkingDirectory(ownerId: string): string {
		return this.workingDirs[ownerId] || "/";
	}

	async setWorkingDirectory(path: string, ownerId: string): Promise<void> {
		const resolved = await this.resolvePath(path, ownerId);
		const normalized = normalizePath(resolved);
		const entry = await this.config.metadataRepo.findByPath(
			ownerId,
			normalized,
		);
		if (!entry) {
			throw new FsError(ErrorCodes.NOT_FOUND, `Directory not found: ${path}`);
		}
		if (entry.type !== "dir") {
			throw new FsError(
				ErrorCodes.NOT_A_DIRECTORY,
				`Path is not a directory: ${path}`,
			);
		}
		this.workingDirs[ownerId] = normalized;
	}

	private async ensureRoot(ownerId: string): Promise<void> {
		const existing = await this.config.metadataRepo.findByPath(ownerId, "/");
		if (existing) {
			return;
		}
		try {
			await this.config.metadataRepo.createEntry({
				ownerId,
				type: "dir",
				path: "/",
				name: "/",
				parentPath: null,
				blobId: null,
				size: 0,
				mimeType: null,
			});
		} catch (error) {
			const created = await this.config.metadataRepo.findByPath(ownerId, "/");
			if (!created) {
				throw error;
			}
		}
	}

	private async resolvePath(path: string, ownerId: string): Promise<string> {
		await this.ensureRoot(ownerId);
		if (path.startsWith("/")) {
			return normalizePath(path);
		}
		const cwd = this.getWorkingDirectory(ownerId);
		return resolvePath(cwd, path);
	}

	private entryToNode(entry: {
		type: "file" | "dir";
		ownerId: string;
		path: string;
		name: string;
		parentPath: string | null;
		size: number;
		mimeType: string | null;
		createdAt: Date;
		updatedAt: Date;
		id: string;
	}): FsNode {
		return {
			id: entry.id,
			type: entry.type,
			ownerId: entry.ownerId,
			path: entry.path,
			name: entry.name,
			parentPath: entry.parentPath,
			size: entry.size,
			mimeType: entry.mimeType,
			createDate: entry.createdAt,
			updateDate: entry.updatedAt,
			createdAt: entry.createdAt,
			updatedAt: entry.updatedAt,
		};
	}

	async createDirectory(path: string, ownerId: string): Promise<FsNode> {
		const resolved = await this.resolvePath(path, ownerId);
		const normalized = normalizePath(resolved);

		await this.ensureRoot(ownerId);

		if (normalized === "/") {
			const root = await this.config.metadataRepo.findByPath(ownerId, "/");
			if (!root) {
				const created = await this.config.metadataRepo.createEntry({
					ownerId,
					type: "dir",
					path: "/",
					name: "/",
					parentPath: null,
					blobId: null,
					size: 0,
					mimeType: null,
				});
				return this.entryToNode(created);
			}
			return this.entryToNode(root);
		}

		// Check if already exists
		const existing = await this.config.metadataRepo.findByPath(
			ownerId,
			normalized,
		);
		if (existing) {
			throw new FsError(
				ErrorCodes.ALREADY_EXISTS,
				`Path already exists: ${path}`,
			);
		}

		const segments = normalized.split("/").filter(Boolean);
		let currentPath = "/";
		let created: FsNode | null = null;

		return await this.config.transactionManager.transaction(async () => {
			for (const segment of segments) {
				const nextPath =
					currentPath === "/" ? `/${segment}` : `${currentPath}/${segment}`;
				const entry = await this.config.metadataRepo.findByPath(
					ownerId,
					nextPath,
				);
				if (entry) {
					if (entry.type !== "dir") {
						throw new FsError(
							ErrorCodes.NOT_A_DIRECTORY,
							`Parent is not a directory: ${nextPath}`,
						);
					}
					currentPath = nextPath;
					created = this.entryToNode(entry);
					continue;
				}

				const parentPath = getParentPath(nextPath);
				const newEntry = await this.config.metadataRepo.createEntry({
					ownerId,
					type: "dir",
					path: nextPath,
					name: getName(nextPath),
					parentPath,
					blobId: null,
					size: 0,
					mimeType: null,
				});
				currentPath = nextPath;
				created = this.entryToNode(newEntry);
			}

			if (!created) {
				throw new FsError(
					ErrorCodes.CONFLICT,
					`Failed to create directory: ${path}`,
				);
			}

			return created;
		});
	}

	async deleteDirectory(
		path: string,
		ownerId: string,
		recursive: boolean = true,
	): Promise<void> {
		const resolved = await this.resolvePath(path, ownerId);
		const normalized = normalizePath(resolved);

		const entry = await this.config.metadataRepo.findByPath(
			ownerId,
			normalized,
		);
		if (!entry) {
			throw new FsError(ErrorCodes.NOT_FOUND, `Directory not found: ${path}`);
		}
		if (entry.type !== "dir") {
			throw new FsError(
				ErrorCodes.NOT_A_DIRECTORY,
				`Path is not a directory: ${path}`,
			);
		}

		// Check if directory has children
		const children = await this.config.metadataRepo.findByParentPath(
			ownerId,
			normalized,
			1,
		);
		if (children.length > 0 && !recursive) {
			throw new FsError(ErrorCodes.CONFLICT, `Directory is not empty: ${path}`);
		}

		// Delete recursively if needed
		if (recursive) {
			while (true) {
				const batch = await this.config.metadataRepo.findByParentPath(
					ownerId,
					normalized,
					100,
				);
				if (batch.length === 0) {
					break;
				}
				for (const child of batch) {
					if (child.type === "dir") {
						await this.deleteDirectory(child.path, ownerId, true);
					} else {
						await this.deleteFile(child.path, ownerId);
					}
				}
			}
		}

		await this.config.metadataRepo.deleteEntry(entry.id);
	}

	async copyDirectory(
		path: string,
		newPath: string,
		ownerId: string,
	): Promise<FsNode> {
		const resolved = await this.resolvePath(path, ownerId);
		const normalized = normalizePath(resolved);
		const newResolved = await this.resolvePath(newPath, ownerId);
		const newNormalized = normalizePath(newResolved);

		const source = await this.config.metadataRepo.findByPath(
			ownerId,
			normalized,
		);
		if (!source) {
			throw new FsError(ErrorCodes.NOT_FOUND, `Directory not found: ${path}`);
		}
		if (source.type !== "dir") {
			throw new FsError(
				ErrorCodes.NOT_A_DIRECTORY,
				`Path is not a directory: ${path}`,
			);
		}

		// Check if destination exists
		const existing = await this.config.metadataRepo.findByPath(
			ownerId,
			newNormalized,
		);
		if (existing) {
			throw new FsError(
				ErrorCodes.ALREADY_EXISTS,
				`Destination already exists: ${newPath}`,
			);
		}

		// Ensure parent exists
		const parentPath = getParentPath(newNormalized);
		if (parentPath !== null) {
			const parent = await this.config.metadataRepo.findByPath(
				ownerId,
				parentPath,
			);
			if (!parent) {
				throw new FsError(
					ErrorCodes.NOT_FOUND,
					`Parent directory not found: ${parentPath}`,
				);
			}
		}

		return await this.config.transactionManager.transaction(async () => {
			// Create new directory
			const newEntry = await this.config.metadataRepo.createEntry({
				ownerId,
				type: "dir",
				path: newNormalized,
				name: getName(newNormalized),
				parentPath,
				blobId: null,
				size: 0,
				mimeType: null,
			});

			// Copy all children recursively
			const children = await this.config.metadataRepo.findByParentPath(
				ownerId,
				normalized,
			);
			for (const child of children) {
				const relativePath = child.path.slice(normalized.length);
				const childNewPath = newNormalized + relativePath;
				if (child.type === "dir") {
					await this.copyDirectory(child.path, childNewPath, ownerId);
				} else {
					await this.copyFile(child.path, childNewPath, ownerId);
				}
			}

			return this.entryToNode(newEntry);
		});
	}

	async moveDirectory(
		path: string,
		newPath: string,
		ownerId: string,
	): Promise<FsNode> {
		const resolved = await this.resolvePath(path, ownerId);
		const normalized = normalizePath(resolved);
		const newResolved = await this.resolvePath(newPath, ownerId);
		const newNormalized = normalizePath(newResolved);

		const source = await this.config.metadataRepo.findByPath(
			ownerId,
			normalized,
		);
		if (!source) {
			throw new FsError(ErrorCodes.NOT_FOUND, `Directory not found: ${path}`);
		}
		if (source.type !== "dir") {
			throw new FsError(
				ErrorCodes.NOT_A_DIRECTORY,
				`Path is not a directory: ${path}`,
			);
		}

		// Check if destination exists
		const existing = await this.config.metadataRepo.findByPath(
			ownerId,
			newNormalized,
		);
		if (existing) {
			throw new FsError(
				ErrorCodes.ALREADY_EXISTS,
				`Destination already exists: ${newPath}`,
			);
		}

		// Ensure parent exists
		const parentPath = getParentPath(newNormalized);
		if (parentPath !== null) {
			const parent = await this.config.metadataRepo.findByPath(
				ownerId,
				parentPath,
			);
			if (!parent) {
				throw new FsError(
					ErrorCodes.NOT_FOUND,
					`Parent directory not found: ${parentPath}`,
				);
			}
		}

		// Prevent moving into itself
		if (newNormalized.startsWith(`${normalized}/`)) {
			throw new FsError(
				ErrorCodes.CONFLICT,
				`Cannot move directory into itself`,
			);
		}

		const updateDescendants = async (
			oldParentPath: string,
			newParentPath: string,
		): Promise<void> => {
			while (true) {
				const children = await this.config.metadataRepo.findByParentPath(
					ownerId,
					oldParentPath,
					100,
				);
				if (children.length === 0) {
					break;
				}
				for (const child of children) {
					const newChildPath =
						newParentPath + child.path.slice(oldParentPath.length);
					await this.config.metadataRepo.updateEntry(child.id, {
						path: newChildPath,
						name: getName(newChildPath),
						parentPath: getParentPath(newChildPath),
					});

					if (child.type === "dir") {
						await updateDescendants(child.path, newChildPath);
					}
				}
			}
		};

		return await this.config.transactionManager.transaction(async () => {
			// Update the directory entry
			const updated = await this.config.metadataRepo.updateEntry(source.id, {
				path: newNormalized,
				name: getName(newNormalized),
				parentPath,
			});

			// Update all children paths
			await updateDescendants(normalized, newNormalized);

			return this.entryToNode(updated);
		});
	}

	async listDirectory(
		path: string,
		ownerId: string,
		limit: number = 100,
		cursor?: string,
	): Promise<{ items: FsNode[]; nextCursor?: string }> {
		const resolved = await this.resolvePath(path, ownerId);
		const normalized = normalizePath(resolved);

		const entry = await this.config.metadataRepo.findByPath(
			ownerId,
			normalized,
		);
		if (!entry) {
			throw new FsError(ErrorCodes.NOT_FOUND, `Directory not found: ${path}`);
		}
		if (entry.type !== "dir") {
			throw new FsError(
				ErrorCodes.NOT_A_DIRECTORY,
				`Path is not a directory: ${path}`,
			);
		}

		let offset = 0;
		if (cursor) {
			try {
				const decoded = JSON.parse(
					Buffer.from(cursor, "base64").toString("utf-8"),
				);
				offset = decoded.offset || 0;
			} catch {
				// Invalid cursor, start from beginning
			}
		}

		const entries = await this.config.metadataRepo.findByParentPath(
			ownerId,
			normalized,
			limit + 1,
			offset,
		);
		const hasMore = entries.length > limit;
		const items = (hasMore ? entries.slice(0, limit) : entries).map((e) =>
			this.entryToNode(e),
		);

		let nextCursor: string | undefined;
		if (hasMore) {
			nextCursor = Buffer.from(
				JSON.stringify({ offset: offset + limit, path: normalized }),
			).toString("base64");
		}

		return { items, nextCursor };
	}

	private computeSha256(content: Uint8Array): string {
		return createHash("sha256").update(content).digest("hex");
	}

	private deriveStorageKey(sha256: string): string {
		return `${sha256.slice(0, 2)}/${sha256}`;
	}

	private normalizeContent(content: Uint8Array | string): Uint8Array {
		if (typeof content === "string") {
			return new TextEncoder().encode(content);
		}
		return content;
	}

	async writeFile(
		path: string,
		content: Uint8Array | string,
		ownerId: string,
		mimeType?: string,
	): Promise<FsNode> {
		const resolved = await this.resolvePath(path, ownerId);
		const normalized = normalizePath(resolved);

		const normalizedContent = this.normalizeContent(content);
		const sha256 = this.computeSha256(normalizedContent);
		const size = normalizedContent.length;
		const storageKey = this.deriveStorageKey(sha256);

		// Upload to blob store (idempotent)
		await this.config.blobStore.put(sha256, normalizedContent);

		return await this.config.transactionManager.transaction(async () => {
			// Upsert blob
			const blob = await this.config.blobRepo.upsertBlob({
				sha256,
				size,
				storageKey,
				refCount: 0,
			});

			// Check if file already exists
			const existing = await this.config.metadataRepo.findByPath(
				ownerId,
				normalized,
			);
			let oldBlobId: string | null = null;
			if (existing) {
				if (existing.type !== "file") {
					throw new FsError(
						ErrorCodes.CONFLICT,
						`Path exists but is not a file: ${path}`,
					);
				}
				oldBlobId = existing.blobId;
				// Update existing entry
				const updated = await this.config.metadataRepo.updateEntry(
					existing.id,
					{
						blobId: blob.id,
						size,
						mimeType: mimeType || null,
					},
				);
				// Decrement old blob ref_count
				if (oldBlobId) {
					await this.config.blobRepo.decrementRefCount(oldBlobId);
				}
				// Increment new blob ref_count
				await this.config.blobRepo.incrementRefCount(blob.id);
				return this.entryToNode(updated);
			} else {
				// Create new entry
				const parentPath = getParentPath(normalized);
				if (parentPath !== null) {
					const parent = await this.config.metadataRepo.findByPath(
						ownerId,
						parentPath,
					);
					if (!parent) {
						throw new FsError(
							ErrorCodes.NOT_FOUND,
							`Parent directory not found: ${parentPath}`,
						);
					}
				}

				const entry = await this.config.metadataRepo.createEntry({
					ownerId,
					type: "file",
					path: normalized,
					name: getName(normalized),
					parentPath,
					blobId: blob.id,
					size,
					mimeType: mimeType || null,
				});

				// Increment blob ref_count
				await this.config.blobRepo.incrementRefCount(blob.id);
				return this.entryToNode(entry);
			}
		});
	}

	async readFile(path: string, ownerId: string): Promise<Uint8Array>;
	async readFile(
		path: string,
		ownerId: string,
		mode: "text" | "binary",
	): Promise<string>;
	async readFile(
		path: string,
		ownerId: string,
		mode: "binary" | "text" = "binary",
	): Promise<Uint8Array | string> {
		const resolved = await this.resolvePath(path, ownerId);
		const normalized = normalizePath(resolved);

		const entry = await this.config.metadataRepo.findByPath(
			ownerId,
			normalized,
		);
		if (!entry) {
			throw new FsError(ErrorCodes.NOT_FOUND, `File not found: ${path}`);
		}
		if (entry.type !== "file") {
			throw new FsError(ErrorCodes.NOT_A_FILE, `Path is not a file: ${path}`);
		}
		if (!entry.blobId) {
			throw new FsError(
				ErrorCodes.CONFLICT,
				`File has no blob reference: ${path}`,
			);
		}

		const blob = await this.config.blobRepo.findById(entry.blobId);
		if (!blob) {
			throw new FsError(
				ErrorCodes.NOT_FOUND,
				`Blob not found for file: ${path}`,
			);
		}

		const content = await this.config.blobStore.get(blob.sha256);
		if (mode === "text") {
			return new TextDecoder().decode(content);
		}
		return content;
	}

	async deleteFile(path: string, ownerId: string): Promise<void> {
		const resolved = await this.resolvePath(path, ownerId);
		const normalized = normalizePath(resolved);

		const entry = await this.config.metadataRepo.findByPath(
			ownerId,
			normalized,
		);
		if (!entry) {
			throw new FsError(ErrorCodes.NOT_FOUND, `File not found: ${path}`);
		}
		if (entry.type !== "file") {
			throw new FsError(ErrorCodes.NOT_A_FILE, `Path is not a file: ${path}`);
		}

		await this.config.transactionManager.transaction(async () => {
			if (entry.blobId) {
				await this.config.blobRepo.decrementRefCount(entry.blobId);
			}
			await this.config.metadataRepo.deleteEntry(entry.id);
		});
	}

	async copyFile(
		path: string,
		newPath: string,
		ownerId: string,
	): Promise<FsNode> {
		const resolved = await this.resolvePath(path, ownerId);
		const normalized = normalizePath(resolved);
		const newResolved = await this.resolvePath(newPath, ownerId);
		const newNormalized = normalizePath(newResolved);

		const source = await this.config.metadataRepo.findByPath(
			ownerId,
			normalized,
		);
		if (!source) {
			throw new FsError(ErrorCodes.NOT_FOUND, `File not found: ${path}`);
		}
		if (source.type !== "file") {
			throw new FsError(ErrorCodes.NOT_A_FILE, `Path is not a file: ${path}`);
		}

		// Check if destination exists
		const existing = await this.config.metadataRepo.findByPath(
			ownerId,
			newNormalized,
		);
		if (existing) {
			throw new FsError(
				ErrorCodes.ALREADY_EXISTS,
				`Destination already exists: ${newPath}`,
			);
		}

		// Ensure parent exists
		const parentPath = getParentPath(newNormalized);
		if (parentPath !== null) {
			const parent = await this.config.metadataRepo.findByPath(
				ownerId,
				parentPath,
			);
			if (!parent) {
				throw new FsError(
					ErrorCodes.NOT_FOUND,
					`Parent directory not found: ${parentPath}`,
				);
			}
		}

		return await this.config.transactionManager.transaction(async () => {
			// Create new entry pointing to same blob
			const newEntry = await this.config.metadataRepo.createEntry({
				ownerId,
				type: "file",
				path: newNormalized,
				name: getName(newNormalized),
				parentPath,
				blobId: source.blobId,
				size: source.size,
				mimeType: source.mimeType,
			});

			// Increment blob ref_count
			if (source.blobId) {
				await this.config.blobRepo.incrementRefCount(source.blobId);
			}

			return this.entryToNode(newEntry);
		});
	}

	async moveFile(
		path: string,
		newPath: string,
		ownerId: string,
	): Promise<FsNode> {
		const resolved = await this.resolvePath(path, ownerId);
		const normalized = normalizePath(resolved);
		const newResolved = await this.resolvePath(newPath, ownerId);
		const newNormalized = normalizePath(newResolved);

		const source = await this.config.metadataRepo.findByPath(
			ownerId,
			normalized,
		);
		if (!source) {
			throw new FsError(ErrorCodes.NOT_FOUND, `File not found: ${path}`);
		}
		if (source.type !== "file") {
			throw new FsError(ErrorCodes.NOT_A_FILE, `Path is not a file: ${path}`);
		}

		// Check if destination exists
		const existing = await this.config.metadataRepo.findByPath(
			ownerId,
			newNormalized,
		);
		if (existing) {
			throw new FsError(
				ErrorCodes.ALREADY_EXISTS,
				`Destination already exists: ${newPath}`,
			);
		}

		// Ensure parent exists
		const parentPath = getParentPath(newNormalized);
		if (parentPath !== null) {
			const parent = await this.config.metadataRepo.findByPath(
				ownerId,
				parentPath,
			);
			if (!parent) {
				throw new FsError(
					ErrorCodes.NOT_FOUND,
					`Parent directory not found: ${parentPath}`,
				);
			}
		}

		const updated = await this.config.metadataRepo.updateEntry(source.id, {
			path: newNormalized,
			name: getName(newNormalized),
			parentPath,
		});

		return this.entryToNode(updated);
	}

	async getInfo(path: string, ownerId: string): Promise<FsNode> {
		const resolved = await this.resolvePath(path, ownerId);
		const normalized = normalizePath(resolved);

		const entry = await this.config.metadataRepo.findByPath(
			ownerId,
			normalized,
		);
		if (!entry) {
			throw new FsError(ErrorCodes.NOT_FOUND, `Path not found: ${path}`);
		}

		return this.entryToNode(entry);
	}
}

export class ScopedFsProvider {
	constructor(
		private readonly provider: FsProvider,
		private readonly ownerId: string,
	) {}

	getWorkingDirectory(): string {
		return this.provider.getWorkingDirectory(this.ownerId);
	}

	async setWorkingDirectory(path: string): Promise<void> {
		return this.provider.setWorkingDirectory(path, this.ownerId);
	}

	async createDirectory(path: string): Promise<FsNode> {
		return this.provider.createDirectory(path, this.ownerId);
	}

	async deleteDirectory(
		path: string,
		recursive: boolean = true,
	): Promise<void> {
		return this.provider.deleteDirectory(path, this.ownerId, recursive);
	}

	async copyDirectory(path: string, newPath: string): Promise<FsNode> {
		return this.provider.copyDirectory(path, newPath, this.ownerId);
	}

	async moveDirectory(path: string, newPath: string): Promise<FsNode> {
		return this.provider.moveDirectory(path, newPath, this.ownerId);
	}

	async listDirectory(
		path: string,
		limit?: number,
		cursor?: string,
	): Promise<{ items: FsNode[]; nextCursor?: string }> {
		return this.provider.listDirectory(path, this.ownerId, limit, cursor);
	}

	async writeFile(
		path: string,
		content: Uint8Array | string,
		mimeType?: string,
	): Promise<FsNode> {
		return this.provider.writeFile(path, content, this.ownerId, mimeType);
	}

	async readFile(path: string): Promise<Uint8Array>;
	async readFile(path: string, mode: "text"): Promise<string>;
	async readFile(
		path: string,
		mode: "binary" | "text" = "binary",
	): Promise<Uint8Array | string> {
		return this.provider.readFile(path, this.ownerId, mode);
	}

	async deleteFile(path: string): Promise<void> {
		return this.provider.deleteFile(path, this.ownerId);
	}

	async copyFile(path: string, newPath: string): Promise<FsNode> {
		return this.provider.copyFile(path, newPath, this.ownerId);
	}

	async moveFile(path: string, newPath: string): Promise<FsNode> {
		return this.provider.moveFile(path, newPath, this.ownerId);
	}

	async getInfo(path: string): Promise<FsNode> {
		return this.provider.getInfo(path, this.ownerId);
	}
}
