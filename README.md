# Multi-tenant DB-backed File System + Pluggable Blob Stores

A TypeScript monorepo implementing a multi-tenant filesystem with PostgreSQL metadata storage and pluggable blob storage (local filesystem, S3-compatible, Bunny Storage).

## Architecture

- `packages/fs-core` - Domain logic and FsProvider (framework-agnostic)
- `packages/fs-adapter-postgres` - Drizzle ORM schema and Postgres repositories
- `packages/fs-adapter-blob-s3` - S3-compatible blob store adapter
- `packages/fs-adapter-blob-bunny` - Bunny Storage adapter
- `packages/fs-adapter-blob-local` - Local filesystem adapter
- `apps/api` - Fastify REST API with JWT auth
- `apps/web` - Next.js UI for file management

## Prerequisites

- Node.js >= 18
- pnpm >= 8
- Docker (for PostgreSQL)

## Environment

- API (`apps/api/.env`): see `apps/api/.env.example` for all variables (DB URL, JWT secret, blob store selection, S3/Bunny/local options, port). Validated at runtime (`apps/api/src/env.ts`).
- Web (`apps/web/.env`): see `apps/web/.env.example` (`NEXT_PUBLIC_API_URL`). Validated at runtime (`apps/web/src/env.ts`).
- Postgres adapter (`packages/fs-adapter-postgres/src/env.ts`) validates `DATABASE_URL`.

Missing required vars for the selected blob store will throw at boot.

## Setup & Run

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Copy envs and edit:
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```
3. Start Postgres (Docker):
   ```bash
   docker-compose up -d postgres
   ```
4. Run migrations:
   ```bash
   pnpm db:migrate
   ```
5. Development:
   ```bash
   pnpm dev              # api + web
   # or individually
   pnpm dev:api
   pnpm dev:web
   ```
6. Production-ish start (build + migrate + start api+web):
   ```bash
   pnpm start:all
   ```
   Individual:
   ```bash
   pnpm start:api
   pnpm start:web
   ```
7. Tests:
   ```bash
   pnpm --filter fs-core test
   ```

## Storage backends

Select via `BLOB_STORE` in `apps/api/.env`:
- `local`: uses `BLOB_STORE_PATH` for on-disk blobs.
- `bunny`: set `BUNNY_STORAGE_ZONE`, `BUNNY_ACCESS_KEY`, `BUNNY_ENDPOINT`.
- `s3`: set `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_REGION`, `S3_FORCE_PATH_STYLE`.

## Cleanup of orphaned blobs
- Manual: `POST /admin/cleanup-orphan-blobs` (JWT required, optional `?limit=`).
- Background cron (opt-in): set `CLEANUP_ORPHANS_CRON` (cron syntax, e.g., `0 * * * *`) and `CLEANUP_ORPHANS_LIMIT` in `apps/api/.env`. Leave blank to disable (default).

## Auth usage
- Register: `POST /auth/register` with JSON `{ "email": "...", "password": "..." }`
- Login: `POST /auth/login` with JSON `{ "email": "...", "password": "..." }`
- Include `Authorization: Bearer <token>` on all `/fs/*` and `/admin/*` requests.

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
