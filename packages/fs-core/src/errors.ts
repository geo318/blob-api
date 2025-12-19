export class FsError extends Error {
	constructor(
		public readonly code: string,
		message: string,
		public readonly cause?: Error,
	) {
		super(message);
		this.name = "FsError";
	}
}

export const ErrorCodes = {
	NOT_FOUND: "NOT_FOUND",
	ALREADY_EXISTS: "ALREADY_EXISTS",
	INVALID_PATH: "INVALID_PATH",
	FORBIDDEN: "FORBIDDEN",
	CONFLICT: "CONFLICT",
	NOT_A_DIRECTORY: "NOT_A_DIRECTORY",
	NOT_A_FILE: "NOT_A_FILE",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
