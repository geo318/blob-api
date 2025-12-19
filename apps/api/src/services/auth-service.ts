import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { PostgresUserRepo } from "@blob-api/fs-adapter-postgres";

export class AuthService {
	constructor(
		private readonly userRepo: PostgresUserRepo,
		private readonly sign: (payload: {
			ownerId: string;
			email: string;
		}) => string,
	) {}

	private hashPassword(password: string): string {
		const salt = randomBytes(16).toString("hex");
		const derived = scryptSync(password, salt, 64).toString("hex");
		return `${salt}:${derived}`;
	}

	private verifyPassword(password: string, stored: string): boolean {
		const [salt, hash] = stored.split(":");
		if (!salt || !hash) return false;
		const derived = scryptSync(password, salt, 64).toString("hex");
		const a = Buffer.from(hash, "hex");
		const b = Buffer.from(derived, "hex");
		return a.length === b.length && timingSafeEqual(a, b);
	}

	async register(email: string, password: string): Promise<{ token: string }> {
		const existing = await this.userRepo.findByEmail(email);
		if (existing) {
			throw Object.assign(new Error("User already exists"), {
				statusCode: 409,
				code: "ALREADY_EXISTS",
			});
		}

		const passwordHash = this.hashPassword(password);
		const user = await this.userRepo.createUser(email, passwordHash);
		const token = this.sign({ ownerId: user.id, email: user.email });
		return { token };
	}

	async login(email: string, password: string): Promise<{ token: string }> {
		const user = await this.userRepo.findByEmail(email);
		if (!user || !this.verifyPassword(password, user.passwordHash)) {
			throw Object.assign(new Error("Invalid credentials"), {
				statusCode: 401,
				code: "UNAUTHORIZED",
			});
		}

		const token = this.sign({ ownerId: user.id, email: user.email });
		return { token };
	}
}
