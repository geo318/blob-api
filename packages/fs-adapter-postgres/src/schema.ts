import {
	bigint,
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

export const entryTypeEnum = pgEnum("entry_type", ["file", "dir"]);

export const entries = pgTable(
	"entries",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		ownerId: text("owner_id").notNull(),
		type: entryTypeEnum("type").notNull(),
		path: text("path").notNull(),
		name: text("name").notNull(),
		parentPath: text("parent_path"),
		blobId: uuid("blob_id"),
		size: bigint("size", { mode: "number" }).notNull().default(0),
		mimeType: text("mime_type"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		ownerPathUnique: uniqueIndex("entries_owner_path_unique").on(
			table.ownerId,
			table.path,
		),
		ownerParentIdx: index("entries_owner_parent_idx").on(
			table.ownerId,
			table.parentPath,
		),
	}),
);

export const blobs = pgTable(
	"blobs",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		sha256: text("sha256").notNull().unique(),
		size: bigint("size", { mode: "number" }).notNull(),
		storageKey: text("storage_key").notNull().unique(),
		refCount: integer("ref_count").notNull().default(0),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		sha256Unique: uniqueIndex("blobs_sha256_unique").on(table.sha256),
	}),
);

export const users = pgTable("users", {
	id: uuid("id").defaultRandom().primaryKey(),
	email: text("email").notNull().unique(),
	passwordHash: text("password_hash").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});
