import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const path = searchParams.get("path");

	if (!path) {
		return NextResponse.json(
			{ code: "INVALID_PATH", message: "Path is required" },
			{ status: 400 },
		);
	}

	const token =
		searchParams.get("token") ||
		request.headers.get("authorization")?.replace("Bearer ", "");

	if (!token) {
		return NextResponse.json(
			{ code: "UNAUTHORIZED", message: "Authentication required" },
			{ status: 401 },
		);
	}

	const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

	try {
		const response = await fetch(
			`${apiUrl}/fs/file?path=${encodeURIComponent(path)}`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		);

		if (!response.ok) {
			const error = await response.json();
			return NextResponse.json(error, { status: response.status });
		}

		const blob = await response.blob();
		const contentType =
			response.headers.get("content-type") || "application/octet-stream";

		return new NextResponse(blob, {
			headers: {
				"Content-Type": contentType,
			},
		});
	} catch (error) {
		return NextResponse.json(
			{ code: "INTERNAL_ERROR", message: "Failed to proxy file" },
			{ status: 500 },
		);
	}
}
