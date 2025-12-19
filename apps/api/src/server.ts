import { BunnyBlobStore } from "@blob-api/fs-adapter-blob-bunny";
import { LocalBlobStore } from "@blob-api/fs-adapter-blob-local";
import { S3BlobStore } from "@blob-api/fs-adapter-blob-s3";
import {
	PostgresBlobRepo,
	PostgresMetadataRepo,
	PostgresTransactionManager,
} from "@blob-api/fs-adapter-postgres";
import { FsProvider } from "@blob-api/fs-core";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { env } from "./env.js";
import { errorHandler } from "./error-handler.js";
import { authenticate } from "./middleware/auth.js";
import { adminRoutes } from "./routes/admin.js";
import { authRoutes } from "./routes/auth.js";
import { fsRoutes } from "./routes/fs.js";

const fastify = Fastify({
	logger: true,
});

// Register JWT
fastify.register(jwt, {
	secret: env.JWT_SECRET,
});

// Register CORS for browser clients
fastify.register(cors, {
	origin: true,
	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	credentials: true,
});

// Register multipart
fastify.register(multipart);

// Add authenticate method
fastify.decorate("authenticate", authenticate);

// Initialize adapters
const metadataRepo = new PostgresMetadataRepo();
const blobRepo = new PostgresBlobRepo();
const blobStore =
	env.BLOB_STORE === "local"
		? new LocalBlobStore({
				basePath: env.BLOB_STORE_PATH,
			})
		: env.BLOB_STORE === "bunny"
			? new BunnyBlobStore({
					storageZone: env.BUNNY_STORAGE_ZONE || "",
					accessKey: env.BUNNY_ACCESS_KEY || "",
					endpoint: env.BUNNY_ENDPOINT,
				})
			: new S3BlobStore({
					endpoint: env.S3_ENDPOINT,
					region: env.S3_REGION,
					accessKeyId: env.S3_ACCESS_KEY_ID || "",
					secretAccessKey: env.S3_SECRET_ACCESS_KEY || "",
					bucket: env.S3_BUCKET || "",
					forcePathStyle: env.S3_FORCE_PATH_STYLE,
				});
const transactionManager = new PostgresTransactionManager();

// Initialize FsProvider
const fsProvider = new FsProvider({
	metadataRepo,
	blobRepo,
	blobStore,
	transactionManager,
});

// Register routes
fastify.register(authRoutes, { prefix: "/auth" });
fastify.register((f) => fsRoutes(f, fsProvider));
fastify.register((f) => adminRoutes(f, blobRepo, blobStore));

// Error handler
fastify.setErrorHandler(errorHandler);

// Start server
const start = async () => {
	try {
		await fastify.listen({ port: env.PORT, host: "0.0.0.0" });
		console.log(`Server listening on port ${env.PORT}`);
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
};

start();
