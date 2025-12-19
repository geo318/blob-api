import "dotenv/config";
import { z } from "zod";

const boolish = z
	.union([z.boolean(), z.string()])
	.transform((value) =>
		typeof value === "string" ? value.toLowerCase() === "true" : value,
	);

const envSchema = z
	.object({
		JWT_SECRET: z.string().min(1).default("change-me"),
		PORT: z.coerce.number().int().positive().default(3001),
		BLOB_STORE: z.enum(["local", "bunny", "s3"]).default("local"),
		BLOB_STORE_PATH: z.string().default("data/blobs"),
		S3_ENDPOINT: z.string().optional(),
		S3_REGION: z.string().default("us-east-1"),
		S3_ACCESS_KEY_ID: z.string().optional(),
		S3_SECRET_ACCESS_KEY: z.string().optional(),
		S3_BUCKET: z.string().optional(),
		S3_FORCE_PATH_STYLE: boolish.default(false),
		BUNNY_STORAGE_ZONE: z.string().optional(),
		BUNNY_ACCESS_KEY: z.string().optional(),
		BUNNY_ENDPOINT: z.string().default("storage.bunnycdn.com"),
	})
	.superRefine((val, ctx) => {
		if (val.BLOB_STORE === "s3") {
			if (!val.S3_ENDPOINT) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["S3_ENDPOINT"],
					message: "S3_ENDPOINT is required when BLOB_STORE=s3",
				});
			}
			if (!val.S3_ACCESS_KEY_ID) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["S3_ACCESS_KEY_ID"],
					message: "S3_ACCESS_KEY_ID is required when BLOB_STORE=s3",
				});
			}
			if (!val.S3_SECRET_ACCESS_KEY) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["S3_SECRET_ACCESS_KEY"],
					message: "S3_SECRET_ACCESS_KEY is required when BLOB_STORE=s3",
				});
			}
			if (!val.S3_BUCKET) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["S3_BUCKET"],
					message: "S3_BUCKET is required when BLOB_STORE=s3",
				});
			}
		}

		if (val.BLOB_STORE === "bunny") {
			if (!val.BUNNY_STORAGE_ZONE) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["BUNNY_STORAGE_ZONE"],
					message: "BUNNY_STORAGE_ZONE is required when BLOB_STORE=bunny",
				});
			}
			if (!val.BUNNY_ACCESS_KEY) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["BUNNY_ACCESS_KEY"],
					message: "BUNNY_ACCESS_KEY is required when BLOB_STORE=bunny",
				});
			}
		}
	});

export const env = envSchema.parse(process.env);
