import { PostgresUserRepo } from "@blob-api/fs-adapter-postgres";
import type { FastifyInstance } from "fastify";
import { loginSchema, registerSchema } from "../schemas.js";
import { AuthService } from "../services/auth-service.js";

export async function authRoutes(fastify: FastifyInstance) {
	const authService = new AuthService(new PostgresUserRepo(), (payload) =>
		fastify.jwt.sign(payload),
	);

	fastify.post("/register", {
		schema: {
			body: registerSchema,
		},
		handler: async (request) => {
			const { email, password } = request.body as {
				email: string;
				password: string;
			};

			const result = await authService.register(email, password);
			return result;
		},
	});

	fastify.post("/login", {
		schema: {
			body: loginSchema,
		},
		handler: async (request) => {
			const { email, password } = request.body as {
				email: string;
				password: string;
			};

			const result = await authService.login(email, password);
			return result;
		},
	});
}
