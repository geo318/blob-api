import type { PostgresBlobRepo } from "@blob-api/fs-adapter-postgres";
import type { BlobStore } from "@blob-api/fs-core";
import type { FastifyInstance } from "fastify";
import { hasKey } from "../utils/index.js";

export async function adminRoutes(
	fastify: FastifyInstance,
	blobRepo: PostgresBlobRepo,
	blobStore: BlobStore,
) {
	fastify.post("/admin/cleanup-orphan-blobs", {
		preHandler: [fastify.authenticate],
		handler: async (request) => {
			const limit = hasKey<string>(request.query, "limit")
				? parseInt(request.query.limit, 10)
				: 100;

			const orphans = await blobRepo.findOrphans(limit);
			let deleted = 0;

			for (const orphan of orphans) {
				try {
					await blobStore.delete(orphan.sha256);
					await blobRepo.deleteBlob(orphan.id);
					deleted++;
				} catch (error) {
					console.error(`Error deleting orphan blob ${orphan.id}:`, error);
				}
			}

			return { deleted };
		},
	});
}
