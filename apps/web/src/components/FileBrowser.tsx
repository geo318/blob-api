"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";

export interface FsNode {
	id: string;
	type: "file" | "dir";
	path: string;
	name: string;
	parentPath: string | null;
	size: number;
	mimeType: string | null;
	createdAt: string;
	updatedAt: string;
}

interface FileBrowserProps {
	currentPath: string;
	onPathChange: (path: string) => void;
	onPreview: (node: FsNode) => void;
}

export function FileBrowser({
	currentPath,
	onPathChange,
	onPreview,
}: FileBrowserProps) {
	const [items, setItems] = useState<FsNode[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const loadDirectory = async () => {
		setLoading(true);
		setError("");
		try {
			const result = await apiClient.fetchJson<{ items: FsNode[] }>(
				`/fs/dir?path=${encodeURIComponent(currentPath)}`,
			);
			// Sort: directories first, then files
			const sorted = result.items.sort((a, b) => {
				if (a.type !== b.type) {
					return a.type === "dir" ? -1 : 1;
				}
				return a.name.localeCompare(b.name);
			});
			setItems(sorted);
		} catch (err: any) {
			setError(err.message || "Failed to load directory");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadDirectory();
	}, [currentPath]);

	const handleDelete = async (node: FsNode) => {
		if (!confirm(`Delete ${node.name}?`)) return;

		try {
			if (node.type === "dir") {
				await apiClient.fetchJson(`/fs/dir`, {
					method: "DELETE",
					body: JSON.stringify({ path: node.path, recursive: true }),
				});
			} else {
				await apiClient.fetchJson(`/fs/file`, {
					method: "DELETE",
					body: JSON.stringify({ path: node.path }),
				});
			}
			loadDirectory();
		} catch (err: any) {
			alert(err.message || "Failed to delete");
		}
	};

	const handleDownload = async (node: FsNode) => {
		try {
			const blob = await apiClient.fetchBlob(
				`/fs/file?path=${encodeURIComponent(node.path)}`,
			);
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = node.name;
			a.click();
			window.URL.revokeObjectURL(url);
		} catch (err: any) {
			alert(err.message || "Failed to download");
		}
	};

	const pathParts =
		currentPath === "/" ? ["/"] : currentPath.split("/").filter(Boolean);

	return (
		<div className="card">
			<div style={{ marginBottom: "20px" }}>
				<div
					style={{
						display: "flex",
						gap: "5px",
						flexWrap: "wrap",
						alignItems: "center",
					}}
				>
					{pathParts.map((part, index) => {
						const path =
							index === 0 ? "/" : "/" + pathParts.slice(1, index + 1).join("/");
						return (
							<span key={index}>
								<button
									onClick={() => onPathChange(path)}
									style={{
										background: "none",
										border: "none",
										color: "#0070f3",
										cursor: "pointer",
										textDecoration: "underline",
									}}
								>
									{part}
								</button>
								{index < pathParts.length - 1 && <span> / </span>}
							</span>
						);
					})}
				</div>
			</div>

			{loading && <div>Loading...</div>}
			{error && <div className="error">{error}</div>}

			{!loading && !error && (
				<table style={{ width: "100%", borderCollapse: "collapse" }}>
					<thead>
						<tr style={{ borderBottom: "2px solid #ddd" }}>
							<th style={{ textAlign: "left", padding: "10px" }}>Name</th>
							<th style={{ textAlign: "left", padding: "10px" }}>Size</th>
							<th style={{ textAlign: "left", padding: "10px" }}>Actions</th>
						</tr>
					</thead>
					<tbody>
						{items.map((item) => (
							<tr key={item.id} style={{ borderBottom: "1px solid #eee" }}>
								<td style={{ padding: "10px" }}>
									<button
										onClick={() => {
											if (item.type === "dir") {
												onPathChange(item.path);
											} else {
												onPreview(item);
											}
										}}
										style={{
											background: "none",
											border: "none",
											color: "#0070f3",
											cursor: "pointer",
											textDecoration: "underline",
										}}
									>
										{item.type === "dir" ? "📁" : "📄"} {item.name}
									</button>
								</td>
								<td style={{ padding: "10px" }}>
									{item.type === "file" ? formatSize(item.size) : "-"}
								</td>
								<td style={{ padding: "10px" }}>
									<div style={{ display: "flex", gap: "10px" }}>
										{item.type === "file" && (
											<button
												onClick={() => handleDownload(item)}
												className="button"
												style={{ padding: "5px 10px", fontSize: "12px" }}
											>
												Download
											</button>
										)}
										<button
											onClick={() => handleDelete(item)}
											className="button"
											style={{
												padding: "5px 10px",
												fontSize: "12px",
												backgroundColor: "#d32f2f",
											}}
										>
											Delete
										</button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
