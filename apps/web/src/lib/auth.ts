"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function useAuth() {
	const router = useRouter();

	useEffect(() => {
		const token =
			typeof window !== "undefined" ? localStorage.getItem("token") : null;
		if (!token) {
			router.push("/login");
		}
	}, [router]);
}

export function requireAuth() {
	if (typeof window === "undefined") return;
	const token = localStorage.getItem("token");
	if (!token) {
		window.location.href = "/login";
	}
}
