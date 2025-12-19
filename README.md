# Multi-tenant DB-backed File System + S3 Blob Store

A TypeScript monorepo implementing a multi-tenant filesystem with PostgreSQL metadata storage and S3-compatible blob storage.

## Architecture

- `packages/fs-core` - Domain logic and FsProvider (framework-agnostic)
- `packages/fs-adapter-postgres` - Drizzle ORM schema and Postgres repositories
- `packages/fs-adapter-blob-s3` - S3-compatible blob store adapter
- `apps/api` - Fastify REST API with JWT auth
- `apps/web` - Next.js UI for file management

## Prerequisites

- Node.js >= 18
- pnpm >= 8
- Docker (for PostgreSQL)

## Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Start PostgreSQL:**
   ```bash
   docker-compose up -d
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example apps/api/.env
   cp .env.example apps/web/.env
   # Edit the .env files with your configuration
   ```

4. **Run migrations:**
   ```bash
   pnpm --filter fs-adapter-postgres migrate:push
   ```

5. **Run tests:**
   ```bash
   pnpm --filter fs-core test
   ```

6. **Start development servers:**
   ```bash
   # Start both API and Web
   pnpm dev

   # Or start individually:
   pnpm --filter api dev
   pnpm --filter web dev
   ```

## API Endpoints

### Auth
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token

### Filesystem (requires JWT)
- `POST /fs/dir` - Create directory
- `DELETE /fs/dir` - Delete directory
- `POST /fs/dir/copy` - Copy directory
- `POST /fs/dir/move` - Move directory
- `GET /fs/dir` - List directory contents
- `PUT /fs/file` - Upload file (multipart)
- `PUT /fs/file/text` - Upload text file (JSON)
- `GET /fs/file` - Download file
- `DELETE /fs/file` - Delete file
- `POST /fs/file/copy` - Copy file
- `POST /fs/file/move` - Move file
- `GET /fs/info` - Get file/directory info

### Admin
- `POST /admin/cleanup-orphan-blobs` - Clean up orphaned blobs

## Development

- API runs on `http://localhost:3001`
- Web runs on `http://localhost:3000`

# blob-api
