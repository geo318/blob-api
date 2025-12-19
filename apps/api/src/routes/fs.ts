import type { FsProvider } from "@blob-api/fs-core";
import type { FastifyInstance } from "fastify";
import {
	copyDirSchema,
	copyFileSchema,
	createDirSchema,
	deleteDirSchema,
	deleteFileSchema,
	getFileQuerySchema,
	getInfoQuerySchema,
	listDirQuerySchema,
	moveDirSchema,
	moveFileSchema,
	setWorkingDirSchema,
	writeFileTextSchema,
} from "../schemas.js";
import { hasKey } from "../utils/index.js";

export async function fsRoutes(
	fastify: FastifyInstance,
	fsProvider: FsProvider,
) {
	// Directory operations
	fastify.post("/fs/dir", {
		preHandler: [fastify.authenticate],
		schema: {
			body: createDirSchema,
		},
		handler: async (request) => {
			const { path } = request.body as { path: string };
			const scoped = fsProvider.forOwner(request.user.ownerId);
			const dir = await scoped.createDirectory(path);
			return dir;
		},
	});

	fastify.delete("/fs/dir", {
		preHandler: [fastify.authenticate],
		schema: {
			body: deleteDirSchema,
		},
		handler: async (request) => {
			const { path } = request.body as { path: string };
			const scoped = fsProvider.forOwner(request.user.ownerId);
			const recursive =
				!hasKey(request.query, "recursive") ||
				request.query?.recursive === "true";
			await scoped.deleteDirectory(path, recursive);
			return { success: true };
		},
	});

	fastify.post("/fs/dir/copy", {
		preHandler: [fastify.authenticate],
		schema: {
			body: copyDirSchema,
		},
		handler: async (request) => {
			const { path, newPath } = request.body as {
				path: string;
				newPath: string;
			};
			const scoped = fsProvider.forOwner(request.user.ownerId);
			const dir = await scoped.copyDirectory(path, newPath);
			return dir;
		},
	});

	fastify.post("/fs/dir/move", {
		preHandler: [fastify.authenticate],
		schema: {
			body: moveDirSchema,
		},
		handler: async (request) => {
			const { path, newPath } = request.body as {
				path: string;
				newPath: string;
			};
			const scoped = fsProvider.forOwner(request.user.ownerId);
			const dir = await scoped.moveDirectory(path, newPath);
			return dir;
		},
	});

	fastify.get("/fs/dir", {
		preHandler: [fastify.authenticate],
		schema: {
			querystring: listDirQuerySchema,
		},
		handler: async (request) => {
			const { path, limit, cursor } = request.query as {
				path: string;
				limit: number;
				cursor?: string;
			};
			const scoped = fsProvider.forOwner(request.user.ownerId);
			const result = await scoped.listDirectory(path, limit, cursor);
			return result;
		},
	});

	// File operations
	fastify.put("/fs/file", {
		preHandler: [fastify.authenticate],
		handler: async (request, reply) => {
			const scoped = fsProvider.forOwner(request.user.ownerId);
			const parts = request.parts();

			let path: string | undefined;
			let fileData: { buffer: Buffer; mimeType?: string } | undefined;

			for await (const part of parts) {
				if (part.type === "file") {
					const buffer = await part.toBuffer();
					fileData = {
						buffer,
						mimeType: part.mimetype || undefined,
					};
				} else if (part.fieldname === "path") {
					path = part.value as string;
				}
			}

			if (!path) {
				return reply.status(400).send({
					code: "VALIDATION_ERROR",
					message: "Path is required",
				});
			}

			if (!fileData) {
				return reply.status(400).send({
					code: "VALIDATION_ERROR",
					message: "No file provided",
				});
			}

			const content = new Uint8Array(fileData.buffer);
			const file = await scoped.writeFile(path, content, fileData.mimeType);
			return file;
		},
	});

	fastify.put("/fs/file/text", {
		preHandler: [fastify.authenticate],
		schema: {
			body: writeFileTextSchema,
		},
		handler: async (request) => {
			const { path, content, mimeType } = request.body as {
				path: string;
				content: string;
				mimeType?: string;
			};
			const scoped = fsProvider.forOwner(request.user.ownerId);
			const file = await scoped.writeFile(path, content, mimeType);
			return file;
		},
	});

	fastify.get("/fs/file", {
		preHandler: [fastify.authenticate],
		schema: {
			querystring: getFileQuerySchema,
		},
		handler: async (request, reply) => {
			const { path } = request.query as { path: string };
			const scoped = fsProvider.forOwner(request.user.ownerId);

			const info = await scoped.getInfo(path);
			if (info.type !== "file") {
				return reply.status(400).send({
					code: "NOT_A_FILE",
					message: "Path is not a file",
				});
			}

			const content = await scoped.readFile(path);

			if (info.mimeType) {
				reply.type(info.mimeType);
			}

			return reply.send(Buffer.from(content));
		},
	});

	fastify.delete("/fs/file", {
		preHandler: [fastify.authenticate],
		schema: {
			body: deleteFileSchema,
		},
		handler: async (request) => {
			const { path } = request.body as { path: string };
			const scoped = fsProvider.forOwner(request.user.ownerId);
			await scoped.deleteFile(path);
			return { success: true };
		},
	});

	fastify.post("/fs/file/copy", {
		preHandler: [fastify.authenticate],
		schema: {
			body: copyFileSchema,
		},
		handler: async (request) => {
			const { path, newPath } = request.body as {
				path: string;
				newPath: string;
			};
			const scoped = fsProvider.forOwner(request.user.ownerId);
			const file = await scoped.copyFile(path, newPath);
			return file;
		},
	});

	fastify.post("/fs/file/move", {
		preHandler: [fastify.authenticate],
		schema: {
			body: moveFileSchema,
		},
		handler: async (request) => {
			const { path, newPath } = request.body as {
				path: string;
				newPath: string;
			};
			const scoped = fsProvider.forOwner(request.user.ownerId);
			const file = await scoped.moveFile(path, newPath);
			return file;
		},
	});

	fastify.get("/fs/info", {
		preHandler: [fastify.authenticate],
		schema: {
			querystring: getInfoQuerySchema,
		},
		handler: async (request) => {
			const { path } = request.query as { path: string };
			const scoped = fsProvider.forOwner(request.user.ownerId);
			const info = await scoped.getInfo(path);
			return info;
		},
	});

	fastify.get("/fs/cwd", {
		preHandler: [fastify.authenticate],
		handler: async (request) => {
			const scoped = fsProvider.forOwner(request.user.ownerId);
			return { path: scoped.getWorkingDirectory() };
		},
	});

	fastify.post("/fs/cwd", {
		preHandler: [fastify.authenticate],
		schema: {
			body: setWorkingDirSchema,
		},
		handler: async (request) => {
			const { path } = request.body as { path: string };
			const scoped = fsProvider.forOwner(request.user.ownerId);
			await scoped.setWorkingDirectory(path);
			return { path: scoped.getWorkingDirectory() };
		},
	});
}
