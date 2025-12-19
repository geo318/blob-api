import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { PostgresUserRepo } from "@blob-api/fs-adapter-postgres";
import type { FastifyInstance } from "fastify";
import { loginSchema, registerSchema } from "../schemas.js";

function hashPassword(password: string): string {
	const salt = randomBytes(16).toString("hex");
	const derived = scryptSync(password, salt, 64).toString("hex");
	return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
	const [salt, hash] = stored.split(":");
	if (!salt || !hash) return false;
	const derived = scryptSync(password, salt, 64).toString("hex");
	const a = Buffer.from(hash, "hex");
	const b = Buffer.from(derived, "hex");
	return a.length === b.length && timingSafeEqual(a, b);
}

export async function authRoutes(fastify: FastifyInstance) {
	const userRepo = new PostgresUserRepo();

	fastify.post("/register", {
		schema: {
			body: registerSchema,
		},
		handler: async (request, reply) => {
			const { email, password } = request.body as {
				email: string;
				password: string;
			};

			// Check if user already exists
			const existing = await userRepo.findByEmail(email);
			if (existing) {
				return reply.status(409).send({
					code: "ALREADY_EXISTS",
					message: "User already exists",
				});
			}

			// Hash password
			const passwordHash = hashPassword(password);

			// Create user
			const user = await userRepo.createUser(email, passwordHash);

			// Generate JWT
			const token = fastify.jwt.sign({
				ownerId: user.id,
				email: user.email,
			});

			return { token };
		},
	});

	fastify.post("/login", {
		schema: {
			body: loginSchema,
		},
		handler: async (request, reply) => {
			const { email, password } = request.body as {
				email: string;
				password: string;
			};

			// Find user
			const user = await userRepo.findByEmail(email);
			if (!user) {
				return reply.status(401).send({
					code: "UNAUTHORIZED",
					message: "Invalid credentials",
				});
			}

			// Verify password
			const valid = verifyPassword(password, user.passwordHash);
			if (!valid) {
				return reply.status(401).send({
					code: "UNAUTHORIZED",
					message: "Invalid credentials",
				});
			}

			// Generate JWT
			const token = fastify.jwt.sign({
				ownerId: user.id,
				email: user.email,
			});

			return { token };
		},
	});
}
