import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import type { BlobStore } from "@blob-api/fs-core";

export interface S3BlobStoreConfig {
	endpoint?: string;
	region: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucket: string;
	forcePathStyle?: boolean;
}

const isAsyncIterable = (
	value: unknown,
): value is AsyncIterable<Uint8Array> =>
	typeof (value as { [Symbol.asyncIterator]?: unknown })?.[
		Symbol.asyncIterator
	] === "function";

const hasTransformToByteArray = (
	value: unknown,
): value is { transformToByteArray: () => Promise<Uint8Array> } =>
	typeof (value as { transformToByteArray?: unknown })?.transformToByteArray ===
	"function";

const hasArrayBuffer = (
	value: unknown,
): value is { arrayBuffer: () => Promise<ArrayBuffer> } =>
	typeof (value as { arrayBuffer?: unknown })?.arrayBuffer === "function";

export class S3BlobStore implements BlobStore {
	private client: S3Client;
	private bucket: string;

	constructor(config: S3BlobStoreConfig) {
		this.bucket = config.bucket;
		this.client = new S3Client({
			endpoint: config.endpoint,
			region: config.region,
			credentials: {
				accessKeyId: config.accessKeyId,
				secretAccessKey: config.secretAccessKey,
			},
			forcePathStyle: config.forcePathStyle ?? false,
		});
	}

	private deriveStorageKey(sha256: string): string {
		return `${sha256.slice(0, 2)}/${sha256}`;
	}

	async put(sha256: string, content: Uint8Array): Promise<void> {
		const storageKey = this.deriveStorageKey(sha256);

		try {
			await this.client.send(
				new PutObjectCommand({
					Bucket: this.bucket,
					Key: storageKey,
					Body: Buffer.from(content),
				}),
			);
		} catch (error: any) {
			if (
				error.name === "BucketAlreadyOwnedByYou" ||
				error.code === "BucketAlreadyOwnedByYou"
			) {
				return;
			}
			throw error;
		}
	}

	async get(sha256: string): Promise<Uint8Array> {
		const storageKey = this.deriveStorageKey(sha256);

		try {
			const response = await this.client.send(
				new GetObjectCommand({
					Bucket: this.bucket,
					Key: storageKey,
				}),
			);

			if (!response.Body) {
				throw new Error(`Blob not found: ${sha256}`);
			}

			const body = response.Body as unknown;

			if (hasTransformToByteArray(body)) {
				return new Uint8Array(await body.transformToByteArray());
			}

			if (hasArrayBuffer(body)) {
				return new Uint8Array(await body.arrayBuffer());
			}

			if (!isAsyncIterable(body)) {
				throw new Error("Unsupported S3 response body type");
			}

			const chunks: Uint8Array[] = [];
			for await (const chunk of body as AsyncIterable<Uint8Array>) {
				chunks.push(chunk);
			}

			// Concatenate all chunks
			const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
			const result = new Uint8Array(totalLength);
			let offset = 0;
			for (const chunk of chunks) {
				result.set(chunk, offset);
				offset += chunk.length;
			}

			return result;
		} catch (error: any) {
			if (error.name === "NoSuchKey" || error.code === "NoSuchKey") {
				throw new Error(`Blob not found: ${sha256}`);
			}
			throw error;
		}
	}

	async delete(sha256: string): Promise<void> {
		const storageKey = this.deriveStorageKey(sha256);

		try {
			await this.client.send(
				new DeleteObjectCommand({
					Bucket: this.bucket,
					Key: storageKey,
				}),
			);
		} catch (error: any) {
			// Ignore if not found (idempotent)
			if (error.name === "NoSuchKey" || error.code === "NoSuchKey") {
				return;
			}
			throw error;
		}
	}
}
