"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";

export default function RegisterPage() {
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
			await apiClient.register(email, password);
			router.push("/files");
		} catch (err: any) {
			setError(err.message || "Registration failed");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="container">
			<div className="card" style={{ maxWidth: "400px", margin: "100px auto" }}>
				<h1 style={{ marginBottom: "20px" }}>Register</h1>
				<form onSubmit={handleSubmit}>
					<label className="label" htmlFor="email">
						Email
					</label>
					<input
						id="email"
						type="email"
						className="input"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
					/>
					<label htmlFor="password" className="label">
						Password
					</label>
					<input
						id="password"
						type="password"
						className="input"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
						minLength={6}
					/>
					{error && <div className="error">{error}</div>}
					<button
						type="submit"
						className="button"
						disabled={loading}
						style={{ width: "100%" }}
					>
						{loading ? "Registering..." : "Register"}
					</button>
				</form>
				<p style={{ marginTop: "20px", textAlign: "center" }}>
					Already have an account? <Link href="/login">Login</Link>
				</p>
			</div>
		</div>
	);
}
