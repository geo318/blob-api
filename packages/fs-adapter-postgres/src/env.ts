import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
	DATABASE_URL: z
		.string()
		.url()
		.default("postgresql://postgres:postgres@localhost:5432/blob_api"),
});

export const env = envSchema.parse(process.env);
