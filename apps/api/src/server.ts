import "dotenv/config";
import { BunnyBlobStore } from "@blob-api/fs-adapter-blob-bunny";
import { LocalBlobStore } from "@blob-api/fs-adapter-blob-local";
import { S3BlobStore } from "@blob-api/fs-adapter-blob-s3";
import {
	PostgresBlobRepo,
	PostgresMetadataRepo,
	PostgresTransactionManager,
} from "@blob-api/fs-adapter-postgres";
import { FsProvider } from "@blob-api/fs-core";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import cors from "@fastify/cors";
import Fastify from "fastify";
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
	secret: process.env.JWT_SECRET || "your-secret-key-change-in-production",
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
	process.env.BLOB_STORE === "local"
		? new LocalBlobStore({
				basePath: process.env.BLOB_STORE_PATH || "data/blobs",
			})
		: process.env.BLOB_STORE === "bunny"
			? new BunnyBlobStore({
					storageZone: process.env.BUNNY_STORAGE_ZONE || "",
					accessKey: process.env.BUNNY_ACCESS_KEY || "",
					endpoint: process.env.BUNNY_ENDPOINT,
				})
			: new S3BlobStore({
					endpoint: process.env.S3_ENDPOINT,
					region: process.env.S3_REGION || "us-east-1",
					accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
					secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
					bucket: process.env.S3_BUCKET || "",
					forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
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
		const port = parseInt(process.env.PORT || "3001", 10);
		await fastify.listen({ port, host: "0.0.0.0" });
		console.log(`Server listening on port ${port}`);
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
};

start();
