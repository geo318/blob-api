import type { PostgresBlobRepo } from "@blob-api/fs-adapter-postgres";
import type { BlobStore } from "@blob-api/fs-core";
import type { FastifyBaseLogger } from "fastify";

export async function cleanupOrphanBlobs(
	deps: {
		blobRepo: PostgresBlobRepo;
		blobStore: BlobStore;
		logger?: FastifyBaseLogger;
	},
	limit: number,
): Promise<number> {
	const { blobRepo, blobStore, logger } = deps;
	const orphans = await blobRepo.findOrphans(limit);
	let deleted = 0;

	for (const orphan of orphans) {
		try {
			await blobStore.delete(orphan.sha256);
			await blobRepo.deleteBlob(orphan.id);
			deleted++;
		} catch (error) {
			logger?.error(
				{ err: error, orphanId: orphan.id },
				"Failed to delete orphan blob",
			);
		}
	}

	return deleted;
}
