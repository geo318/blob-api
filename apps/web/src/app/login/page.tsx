"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";

export default function LoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			await apiClient.login(email, password);
			router.push("/files");
		} catch (err: any) {
			setError(err.message || "Login failed");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="container">
			<div className="card" style={{ maxWidth: "400px", margin: "100px auto" }}>
				<h1 style={{ marginBottom: "20px" }}>Login</h1>
				<form onSubmit={handleSubmit}>
					<label className="label" htmlFor="email-input">
						Email
					</label>
					<input
						id="email-input"
						type="email"
						className="input"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
					/>
					<label htmlFor="password-input" className="label">
						Password
					</label>
					<input
						id="password-input"
						type="password"
						className="input"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					/>
					{error && <div className="error">{error}</div>}
					<button
						type="submit"
						className="button"
						disabled={loading}
						style={{ width: "100%" }}
					>
						{loading ? "Logging in..." : "Login"}
					</button>
				</form>
				<p style={{ marginTop: "20px", textAlign: "center" }}>
					Don't have an account? <Link href="/register">Register</Link>
				</p>
			</div>
		</div>
	);
}
