export const registerSchema = {
	type: "object",
	required: ["email", "password"],
	properties: {
		email: { type: "string", format: "email" },
		password: { type: "string", minLength: 6 },
	},
} as const;

export const loginSchema = {
	type: "object",
	required: ["email", "password"],
	properties: {
		email: { type: "string", format: "email" },
		password: { type: "string", minLength: 6 },
	},
} as const;

export const createDirSchema = {
	type: "object",
	required: ["path"],
	properties: {
		path: { type: "string" },
	},
} as const;

export const deleteDirSchema = {
	type: "object",
	required: ["path"],
	properties: {
		path: { type: "string" },
	},
} as const;

export const copyDirSchema = {
	type: "object",
	required: ["path", "newPath"],
	properties: {
		path: { type: "string" },
		newPath: { type: "string" },
	},
} as const;

export const moveDirSchema = {
	type: "object",
	required: ["path", "newPath"],
	properties: {
		path: { type: "string" },
		newPath: { type: "string" },
	},
} as const;

export const listDirQuerySchema = {
	type: "object",
	properties: {
		path: { type: "string", default: "/" },
		limit: { type: "integer", minimum: 1, maximum: 1000, default: 100 },
		cursor: { type: "string" },
	},
} as const;

export const writeFileTextSchema = {
	type: "object",
	required: ["path", "content"],
	properties: {
		path: { type: "string" },
		content: { type: "string" },
		mimeType: { type: "string" },
	},
} as const;

export const getFileQuerySchema = {
	type: "object",
	required: ["path"],
	properties: {
		path: { type: "string" },
	},
} as const;

export const deleteFileSchema = {
	type: "object",
	required: ["path"],
	properties: {
		path: { type: "string" },
	},
} as const;

export const copyFileSchema = {
	type: "object",
	required: ["path", "newPath"],
	properties: {
		path: { type: "string" },
		newPath: { type: "string" },
	},
} as const;

export const moveFileSchema = {
	type: "object",
	required: ["path", "newPath"],
	properties: {
		path: { type: "string" },
		newPath: { type: "string" },
	},
} as const;

export const getInfoQuerySchema = {
	type: "object",
	required: ["path"],
	properties: {
		path: { type: "string" },
	},
} as const;

export const setWorkingDirSchema = {
	type: "object",
	required: ["path"],
	properties: {
		path: { type: "string" },
	},
} as const;
