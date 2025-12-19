import type { PostgresBlobRepo } from "@blob-api/fs-adapter-postgres";
import type { BlobStore } from "@blob-api/fs-core";
import type { FastifyInstance } from "fastify";
import { cleanupOrphanBlobs } from "../services/orphan-cleanup.js";
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

			const deleted = await cleanupOrphanBlobs(
				{ blobRepo, blobStore, logger: fastify.log },
				limit,
			);

			return { deleted };
		},
	});
}
