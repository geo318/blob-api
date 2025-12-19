import "dotenv/config";
import { defineConfig } from "drizzle-kit";
export default defineConfig({
	schema: "./src/schema.ts",
	out: "./src/migrations",
	driver: "pg",
	dbCredentials: {
		connectionString:
			process.env.DATABASE_URL ||
			"postgresql://postgres:postgres@localhost:5432/blob_api",
	},
});
//# sourceMappingURL=drizzle.config.js.map
