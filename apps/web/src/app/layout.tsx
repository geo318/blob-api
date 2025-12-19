import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Blob API File Manager",
	description: "Multi-tenant file system",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
