import { env } from "../env";

const API_URL = env.NEXT_PUBLIC_API_URL;

export interface ApiError {
	code: string;
	message: string;
}

export class ApiClient {
	private getToken(): string | null {
		if (typeof window === "undefined") return null;
		return localStorage.getItem("token");
	}

	private setToken(token: string): void {
		if (typeof window === "undefined") return;
		localStorage.setItem("token", token);
	}

	clearToken(): void {
		if (typeof window === "undefined") return;
		localStorage.removeItem("token");
	}

	async fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
		const token = this.getToken();
		const headers = new Headers(options.headers || {});
		headers.set("Content-Type", "application/json");
		if (token) {
			headers.set("Authorization", `Bearer ${token}`);
		}

		const response = await fetch(`${API_URL}${url}`, {
			...options,
			headers,
		});

		if (!response.ok) {
			const error: ApiError = await response.json().catch(() => ({
				code: "UNKNOWN_ERROR",
				message: "An error occurred",
			}));
			throw error;
		}

		return response.json();
	}

	async fetchBlob(url: string, options: RequestInit = {}): Promise<Blob> {
		const token = this.getToken();
		const headers = new Headers(options.headers || {});
		if (token) {
			headers.set("Authorization", `Bearer ${token}`);
		}

		const response = await fetch(`${API_URL}${url}`, {
			...options,
			headers,
		});

		if (!response.ok) {
			const error: ApiError = await response.json().catch(() => ({
				code: "UNKNOWN_ERROR",
				message: "An error occurred",
			}));
			throw error;
		}

		return response.blob();
	}

	async login(email: string, password: string): Promise<{ token: string }> {
		const result = await this.fetchJson<{ token: string }>("/auth/login", {
			method: "POST",
			body: JSON.stringify({ email, password }),
		});
		this.setToken(result.token);
		return result;
	}

	async register(email: string, password: string): Promise<{ token: string }> {
		const result = await this.fetchJson<{ token: string }>("/auth/register", {
			method: "POST",
			body: JSON.stringify({ email, password }),
		});
		this.setToken(result.token);
		return result;
	}
}

export const apiClient = new ApiClient();
