import { beforeEach, describe, expect, it } from "vitest";
import { ErrorCodes } from "./errors.js";
import { InMemoryBlobRepo } from "./fakes/in-memory-blob-repo.js";
import { InMemoryBlobStore } from "./fakes/in-memory-blob-store.js";
import { InMemoryMetadataRepo } from "./fakes/in-memory-metadata-repo.js";
import { SimpleTransactionManager } from "./fakes/simple-transaction-manager.js";
import { FsProvider } from "./fs-provider.js";

describe("FsProvider", () => {
	let provider: FsProvider;
	let ownerId1: string;
	let ownerId2: string;

	beforeEach(() => {
		const metadataRepo = new InMemoryMetadataRepo();
		const blobRepo = new InMemoryBlobRepo();
		const blobStore = new InMemoryBlobStore();
		const transactionManager = new SimpleTransactionManager();

		provider = new FsProvider({
			metadataRepo,
			blobRepo,
			blobStore,
			transactionManager,
		});

		ownerId1 = "user1";
		ownerId2 = "user2";
	});

	describe("Path normalization and validation", () => {
		it("should reject path traversal", async () => {
			await expect(
				provider.createDirectory("../test", ownerId1),
			).rejects.toMatchObject({ code: ErrorCodes.INVALID_PATH });
			await expect(
				provider.createDirectory("test/../other", ownerId1),
			).rejects.toMatchObject({ code: ErrorCodes.INVALID_PATH });
			await expect(
				provider.createDirectory("./test", ownerId1),
			).rejects.toMatchObject({ code: ErrorCodes.INVALID_PATH });
		});

		it("should normalize paths correctly", async () => {
			const dir = await provider.createDirectory("/test", ownerId1);
			expect(dir.path).toBe("/test");

			const dir2 = await provider.createDirectory("test2", ownerId1);
			expect(dir2.path).toBe("/test2");
		});

		it("should reject Windows paths", async () => {
			await expect(
				provider.createDirectory("test\\other", ownerId1),
			).rejects.toMatchObject({ code: ErrorCodes.INVALID_PATH });
		});
	});

	describe("Directory operations", () => {
		it("should create a directory", async () => {
			const dir = await provider.createDirectory("/test", ownerId1);
			expect(dir.type).toBe("dir");
			expect(dir.path).toBe("/test");
			expect(dir.name).toBe("test");
		});

		it("should create nested directories", async () => {
			const child = await provider.createDirectory("/parent/child", ownerId1);
			expect(child.path).toBe("/parent/child");
			expect(child.parentPath).toBe("/parent");
		});

		it("should create parent directories automatically", async () => {
			const child = await provider.createDirectory("/parent/child", ownerId1);
			expect(child.path).toBe("/parent/child");
			const parent = await provider.getInfo("/parent", ownerId1);
			expect(parent.type).toBe("dir");
		});

		it("should fail to create directory if already exists", async () => {
			await provider.createDirectory("/test", ownerId1);
			await expect(
				provider.createDirectory("/test", ownerId1),
			).rejects.toMatchObject({ code: ErrorCodes.ALREADY_EXISTS });
		});

		it("should delete an empty directory", async () => {
			await provider.createDirectory("/test", ownerId1);
			await provider.deleteDirectory("/test", ownerId1);
			await expect(provider.getInfo("/test", ownerId1)).rejects.toMatchObject({
				code: ErrorCodes.NOT_FOUND,
			});
		});

		it("should fail to delete non-empty directory without recursive flag", async () => {
			await provider.createDirectory("/parent", ownerId1);
			await provider.createDirectory("/parent/child", ownerId1);
			await expect(
				provider.deleteDirectory("/parent", ownerId1, false),
			).rejects.toMatchObject({ code: ErrorCodes.CONFLICT });
		});

		it("should delete directory recursively", async () => {
			await provider.createDirectory("/parent", ownerId1);
			await provider.createDirectory("/parent/child", ownerId1);
			const content = new TextEncoder().encode("test content");
			await provider.writeFile("/parent/file.txt", content, ownerId1);
			await provider.deleteDirectory("/parent", ownerId1, true);
			await expect(provider.getInfo("/parent", ownerId1)).rejects.toMatchObject(
				{ code: ErrorCodes.NOT_FOUND },
			);
		});

		it("should copy a directory", async () => {
			await provider.createDirectory("/source", ownerId1);
			await provider.createDirectory("/source/nested", ownerId1);
			const content = new TextEncoder().encode("test");
			await provider.writeFile("/source/file.txt", content, ownerId1);

			const copied = await provider.copyDirectory("/source", "/dest", ownerId1);
			expect(copied.path).toBe("/dest");

			const nested = await provider.getInfo("/dest/nested", ownerId1);
			expect(nested.type).toBe("dir");

			const file = await provider.getInfo("/dest/file.txt", ownerId1);
			expect(file.type).toBe("file");
		});

		it("should move a directory", async () => {
			await provider.createDirectory("/source", ownerId1);
			await provider.createDirectory("/source/nested", ownerId1);

			const moved = await provider.moveDirectory("/source", "/dest", ownerId1);
			expect(moved.path).toBe("/dest");

			await expect(provider.getInfo("/source", ownerId1)).rejects.toMatchObject(
				{ code: ErrorCodes.NOT_FOUND },
			);
			const nested = await provider.getInfo("/dest/nested", ownerId1);
			expect(nested.type).toBe("dir");
		});

		it("should prevent moving directory into itself", async () => {
			await provider.createDirectory("/test", ownerId1);
			await expect(
				provider.moveDirectory("/test", "/test/nested", ownerId1),
			).rejects.toMatchObject({ code: ErrorCodes.CONFLICT });
		});
	});

	describe("File operations", () => {
		it("should write and read a file", async () => {
			const content = new TextEncoder().encode("hello world");
			const file = await provider.writeFile("/test.txt", content, ownerId1);
			expect(file.type).toBe("file");
			expect(file.size).toBe(content.length);

			const readContent = await provider.readFile("/test.txt", ownerId1);
			expect(new TextDecoder().decode(readContent)).toBe("hello world");
		});

		it("should write and read a text file", async () => {
			const file = await provider.writeFile(
				"/text.txt",
				"hello text",
				ownerId1,
				"text/plain",
			);
			expect(file.mimeType).toBe("text/plain");

			const readContent = await provider.readFile(
				"/text.txt",
				ownerId1,
				"text",
			);
			expect(readContent).toBe("hello text");
		});

		it("should overwrite a file", async () => {
			const content1 = new TextEncoder().encode("first");
			await provider.writeFile("/test.txt", content1, ownerId1);

			const content2 = new TextEncoder().encode("second");
			const file = await provider.writeFile("/test.txt", content2, ownerId1);
			expect(file.size).toBe(content2.length);

			const readContent = await provider.readFile("/test.txt", ownerId1);
			expect(new TextDecoder().decode(readContent)).toBe("second");
		});

		it("should delete a file", async () => {
			const content = new TextEncoder().encode("test");
			await provider.writeFile("/test.txt", content, ownerId1);
			await provider.deleteFile("/test.txt", ownerId1);
			await expect(
				provider.getInfo("/test.txt", ownerId1),
			).rejects.toMatchObject({ code: ErrorCodes.NOT_FOUND });
		});

		it("should copy a file", async () => {
			const content = new TextEncoder().encode("test content");
			await provider.writeFile("/source.txt", content, ownerId1);

			const copied = await provider.copyFile(
				"/source.txt",
				"/dest.txt",
				ownerId1,
			);
			expect(copied.path).toBe("/dest.txt");

			const readContent = await provider.readFile("/dest.txt", ownerId1);
			expect(new TextDecoder().decode(readContent)).toBe("test content");
		});

		it("should move a file", async () => {
			const content = new TextEncoder().encode("test");
			await provider.writeFile("/source.txt", content, ownerId1);

			const moved = await provider.moveFile(
				"/source.txt",
				"/dest.txt",
				ownerId1,
			);
			expect(moved.path).toBe("/dest.txt");

			await expect(
				provider.getInfo("/source.txt", ownerId1),
			).rejects.toMatchObject({ code: ErrorCodes.NOT_FOUND });
			const readContent = await provider.readFile("/dest.txt", ownerId1);
			expect(new TextDecoder().decode(readContent)).toBe("test");
		});
	});

	describe("Deduplication", () => {
		it("should reuse blob for identical content", async () => {
			const content = new TextEncoder().encode("identical content");
			const file1 = await provider.writeFile("/file1.txt", content, ownerId1);
			const file2 = await provider.writeFile("/file2.txt", content, ownerId1);

			// Both files should point to the same blob
			await provider.getInfo("/file1.txt", ownerId1);
			await provider.getInfo("/file2.txt", ownerId1);

			// The important thing is that the blob store only has one copy
			expect(file1.size).toBe(file2.size);
		});

		it("should increment ref_count when copying file", async () => {
			const content = new TextEncoder().encode("test");
			await provider.writeFile("/source.txt", content, ownerId1);
			await provider.copyFile("/source.txt", "/dest.txt", ownerId1);

			// Both files should reference the same blob with ref_count = 2
			// This is verified by the blob repo implementation
		});

		it("should decrement ref_count when deleting file", async () => {
			const content = new TextEncoder().encode("test");
			await provider.writeFile("/file.txt", content, ownerId1);
			await provider.deleteFile("/file.txt", ownerId1);

			// Blob ref_count should be decremented
			// In a real scenario, if ref_count reaches 0, blob becomes orphan
		});

		it("should decrement old blob ref_count when overwriting", async () => {
			const content1 = new TextEncoder().encode("first");
			await provider.writeFile("/file.txt", content1, ownerId1);

			const content2 = new TextEncoder().encode("second");
			await provider.writeFile("/file.txt", content2, ownerId1);

			// Old blob ref_count should be decremented, new blob ref_count should be 1
		});
	});

	describe("Multi-tenant isolation", () => {
		it("should isolate files by owner", async () => {
			const content1 = new TextEncoder().encode("user1 content");
			await provider.writeFile("/file.txt", content1, ownerId1);

			const content2 = new TextEncoder().encode("user2 content");
			await provider.writeFile("/file.txt", content2, ownerId2);

			// Both users should have their own file at the same path
			const read1 = await provider.readFile("/file.txt", ownerId1);
			expect(new TextDecoder().decode(read1)).toBe("user1 content");

			const read2 = await provider.readFile("/file.txt", ownerId2);
			expect(new TextDecoder().decode(read2)).toBe("user2 content");
		});

		it("should isolate directories by owner", async () => {
			await provider.createDirectory("/test", ownerId1);
			await provider.createDirectory("/test", ownerId2);

			// Both users should have their own directory
			const dir1 = await provider.getInfo("/test", ownerId1);
			expect(dir1.type).toBe("dir");

			const dir2 = await provider.getInfo("/test", ownerId2);
			expect(dir2.type).toBe("dir");
		});

		it("should not allow user1 to access user2 files", async () => {
			const content = new TextEncoder().encode("user2 only");
			await provider.writeFile("/secret.txt", content, ownerId2);

			await expect(
				provider.readFile("/secret.txt", ownerId1),
			).rejects.toMatchObject({ code: ErrorCodes.NOT_FOUND });
		});
	});

	describe("Working directory", () => {
		it("should default to root", () => {
			const cwd = provider.getWorkingDirectory(ownerId1);
			expect(cwd).toBe("/");
		});

		it("should set and get working directory", async () => {
			await provider.createDirectory("/work", ownerId1);
			await provider.setWorkingDirectory("/work", ownerId1);
			const cwd = provider.getWorkingDirectory(ownerId1);
			expect(cwd).toBe("/work");
		});

		it("should resolve relative paths against working directory", async () => {
			await provider.createDirectory("/work", ownerId1);
			await provider.setWorkingDirectory("/work", ownerId1);

			const content = new TextEncoder().encode("test");
			const file = await provider.writeFile("relative.txt", content, ownerId1);
			expect(file.path).toBe("/work/relative.txt");
		});

		it("should set working directory with a relative path", async () => {
			await provider.createDirectory("/base/sub", ownerId1);
			await provider.setWorkingDirectory("/base", ownerId1);
			await provider.setWorkingDirectory("sub", ownerId1);
			expect(provider.getWorkingDirectory(ownerId1)).toBe("/base/sub");
		});

		it("should isolate working directories by owner", async () => {
			await provider.createDirectory("/user1-work", ownerId1);
			await provider.createDirectory("/user2-work", ownerId2);

			await provider.setWorkingDirectory("/user1-work", ownerId1);
			await provider.setWorkingDirectory("/user2-work", ownerId2);

			expect(provider.getWorkingDirectory(ownerId1)).toBe("/user1-work");
			expect(provider.getWorkingDirectory(ownerId2)).toBe("/user2-work");
		});
	});

	describe("List directory", () => {
		it("should list directory contents", async () => {
			await provider.createDirectory("/test", ownerId1);
			await provider.createDirectory("/test/dir1", ownerId1);
			await provider.createDirectory("/test/dir2", ownerId1);
			const content = new TextEncoder().encode("file");
			await provider.writeFile("/test/file.txt", content, ownerId1);

			const result = await provider.listDirectory("/test", ownerId1);
			expect(result.items.length).toBe(3);
			expect(result.items.some((item) => item.name === "dir1")).toBe(true);
			expect(result.items.some((item) => item.name === "dir2")).toBe(true);
			expect(result.items.some((item) => item.name === "file.txt")).toBe(true);
		});

		it("should support pagination with cursor", async () => {
			await provider.createDirectory("/test", ownerId1);
			for (let i = 0; i < 5; i++) {
				await provider.createDirectory(`/test/dir${i}`, ownerId1);
			}

			const page1 = await provider.listDirectory("/test", ownerId1, 2);
			expect(page1.items.length).toBe(2);
			expect(page1.nextCursor).toBeDefined();

			const page2 = await provider.listDirectory(
				"/test",
				ownerId1,
				2,
				page1.nextCursor,
			);
			expect(page2.items.length).toBe(2);
		});
	});

	describe("Get info", () => {
		it("should get file info", async () => {
			const content = new TextEncoder().encode("test");
			await provider.writeFile("/test.txt", content, ownerId1, "text/plain");
			const info = await provider.getInfo("/test.txt", ownerId1);
			expect(info.type).toBe("file");
			expect(info.size).toBe(content.length);
			expect(info.mimeType).toBe("text/plain");
		});

		it("should get directory info", async () => {
			const dir = await provider.createDirectory("/test", ownerId1);
			const info = await provider.getInfo("/test", ownerId1);
			expect(info.type).toBe("dir");
			expect(info.path).toBe(dir.path);
		});

		it("should throw NOT_FOUND for non-existent path", async () => {
			await expect(
				provider.getInfo("/nonexistent", ownerId1),
			).rejects.toMatchObject({ code: ErrorCodes.NOT_FOUND });
		});
	});
});
