import type { PostgresBlobRepo } from "@blob-api/fs-adapter-postgres";
import type { BlobStore } from "@blob-api/fs-core";
import type { FastifyInstance } from "fastify";
import cron from "node-cron";
import { env } from "../env.js";
import { cleanupOrphanBlobs } from "../services/orphan-cleanup.js";

interface CronDeps {
	blobRepo: PostgresBlobRepo;
	blobStore: BlobStore;
}

export function registerCronJobs(
	fastify: FastifyInstance,
	{ blobRepo, blobStore }: CronDeps,
): void {
	if (!env.CLEANUP_ORPHANS_CRON) {
		return;
	}

	const task = cron.schedule(env.CLEANUP_ORPHANS_CRON, async () => {
		try {
			const deleted = await cleanupOrphanBlobs(
				{ blobRepo, blobStore, logger: fastify.log },
				env.CLEANUP_ORPHANS_LIMIT,
			);
			if (deleted > 0) {
				fastify.log.info(
					{ deleted, cron: env.CLEANUP_ORPHANS_CRON },
					"Orphan blob cleanup run complete",
				);
			}
		} catch (error) {
			fastify.log.error(
				{ err: error, cron: env.CLEANUP_ORPHANS_CRON },
				"Orphan blob cleanup failed",
			);
		}
	});

	fastify.addHook("onClose", async () => {
		task.stop();
	});
}
