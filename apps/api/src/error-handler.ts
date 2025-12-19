import { ErrorCodes, FsError } from "@blob-api/fs-core";
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";

export function errorHandler(
	error: FastifyError,
	_: FastifyRequest,
	reply: FastifyReply,
) {
	if (error instanceof FsError) {
		return reply.status(getStatusCode(error.code)).send({
			code: error.code,
			message: error.message,
		});
	}

	// Validation errors
	if (error.validation) {
		return reply.status(400).send({
			code: "VALIDATION_ERROR",
			message: "Validation failed",
			details: error.validation,
		});
	}

	// JWT errors
	if (error.statusCode === 401) {
		return reply.status(401).send({
			code: "UNAUTHORIZED",
			message: "Authentication required",
		});
	}

	// Default error
	return reply.status(error.statusCode || 500).send({
		code: "INTERNAL_ERROR",
		message: error.message || "Internal server error",
	});
}

function getStatusCode(code: string): number {
	switch (code) {
		case ErrorCodes.NOT_FOUND:
			return 404;
		case ErrorCodes.ALREADY_EXISTS:
			return 409;
		case ErrorCodes.INVALID_PATH:
			return 400;
		case ErrorCodes.FORBIDDEN:
			return 403;
		case ErrorCodes.CONFLICT:
			return 409;
		case ErrorCodes.NOT_A_DIRECTORY:
			return 400;
		case ErrorCodes.NOT_A_FILE:
			return 400;
		default:
			return 500;
	}
}
