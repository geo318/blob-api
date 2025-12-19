"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CreateFolderDialog } from "@/components/CreateFolderDialog";
import type { FsNode } from "@/components/FileBrowser";
import { FileBrowser } from "@/components/FileBrowser";
import { FilePreview } from "@/components/FilePreview";
import { UploadDialog } from "@/components/UploadDialog";
import { apiClient } from "@/lib/api-client";

export default function FilesPage() {
	const router = useRouter();
	const [currentPath, setCurrentPath] = useState("/");
	const [previewNode, setPreviewNode] = useState<FsNode | null>(null);
	const [showUpload, setShowUpload] = useState(false);
	const [showCreateFolder, setShowCreateFolder] = useState(false);
	const [refreshKey, setRefreshKey] = useState(0);

	useEffect(() => {
		const token =
			typeof window !== "undefined" ? localStorage.getItem("token") : null;
		if (!token) {
			router.push("/login");
		}
	}, [router]);

	const handleLogout = () => {
		apiClient.clearToken();
		router.push("/login");
	};

	return (
		<div className="container">
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "20px",
				}}
			>
				<h1>File Manager</h1>
				<div style={{ display: "flex", gap: "10px" }}>
					<button
						type="button"
						onClick={() => setShowCreateFolder(true)}
						className="button"
					>
						Create Folder
					</button>
					<button
						type="button"
						onClick={() => setShowUpload(true)}
						className="button"
					>
						Upload File
					</button>
					<button
						type="button"
						onClick={handleLogout}
						className="button"
						style={{ backgroundColor: "#666" }}
					>
						Logout
					</button>
				</div>
			</div>

			<FileBrowser
				key={refreshKey}
				currentPath={currentPath}
				onPathChange={setCurrentPath}
				onPreview={setPreviewNode}
			/>

			{previewNode && (
				<FilePreview node={previewNode} onClose={() => setPreviewNode(null)} />
			)}

			{showUpload && (
				<UploadDialog
					currentPath={currentPath}
					onClose={() => setShowUpload(false)}
					onUploaded={() => setRefreshKey((k) => k + 1)}
				/>
			)}

			{showCreateFolder && (
				<CreateFolderDialog
					currentPath={currentPath}
					onClose={() => setShowCreateFolder(false)}
					onCreated={() => setRefreshKey((k) => k + 1)}
				/>
			)}
		</div>
	);
}
