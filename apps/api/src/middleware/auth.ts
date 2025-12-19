import type { FastifyReply, FastifyRequest } from "fastify";

export async function authenticate(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		await request.jwtVerify();
	} catch {
		reply.status(401).send({
			code: "UNAUTHORIZED",
			message: "Authentication required",
		});
	}
}

declare module "@fastify/jwt" {
	interface FastifyJWT {
		payload: {
			ownerId: string;
			email: string;
		};
		user: {
			ownerId: string;
			email: string;
		};
	}
}

declare module "fastify" {
	interface FastifyInstance {
		authenticate: typeof authenticate;
	}
}
