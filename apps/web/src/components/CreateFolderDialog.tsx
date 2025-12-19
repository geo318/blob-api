"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api-client";

interface CreateFolderDialogProps {
	currentPath: string;
	onClose: () => void;
	onCreated: () => void;
}

export function CreateFolderDialog({
	currentPath,
	onClose,
	onCreated,
}: CreateFolderDialogProps) {
	const [name, setName] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;

		setLoading(true);
		setError("");

		try {
			const path = `${currentPath === "/" ? "" : currentPath}/${name.trim()}`;
			await apiClient.fetchJson("/fs/dir", {
				method: "POST",
				body: JSON.stringify({ path }),
			});
			onCreated();
			onClose();
		} catch (err: any) {
			setError(err.message || "Failed to create folder");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				backgroundColor: "rgba(0, 0, 0, 0.5)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 1000,
			}}
			onClick={onClose}
		>
			<div
				className="card"
				style={{ minWidth: "400px" }}
				onClick={(e) => e.stopPropagation()}
			>
				<h2 style={{ marginBottom: "20px" }}>Create Folder</h2>
				<form onSubmit={handleSubmit}>
					<label className="label">Folder Name</label>
					<input
						type="text"
						className="input"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Folder name"
						required
					/>
					{error && <div className="error">{error}</div>}
					<div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
						<button type="submit" className="button" disabled={loading}>
							{loading ? "Creating..." : "Create"}
						</button>
						<button
							type="button"
							className="button"
							onClick={onClose}
							style={{ backgroundColor: "#666" }}
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
