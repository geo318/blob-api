import { ErrorCodes, FsError } from './errors.js';

/**
 * Normalizes a path to POSIX format and validates it.
 * Rejects traversal, empty segments, and Windows paths.
 */
export function normalizePath(path: string): string {
  if (!path || typeof path !== 'string') {
    throw new FsError(ErrorCodes.INVALID_PATH, 'Path must be a non-empty string');
  }

  // Reject Windows-style paths
  if (path.includes('\\')) {
    throw new FsError(ErrorCodes.INVALID_PATH, 'Windows paths are not allowed');
  }

  // Normalize to POSIX (forward slashes)
  let normalized = path.replace(/\\/g, '/');

  // Remove leading/trailing slashes except for root
  if (normalized !== '/') {
    normalized = normalized.replace(/^\/+|\/+$/g, '');
  }

  // Split into segments
  const segments = normalized === '/' ? [''] : normalized.split('/').filter(Boolean);

  // Validate segments
  for (const segment of segments) {
    if (segment === '' && normalized !== '/') {
      throw new FsError(ErrorCodes.INVALID_PATH, 'Path contains empty segments');
    }
    if (segment === '.' || segment === '..') {
      throw new FsError(ErrorCodes.INVALID_PATH, 'Path traversal (.. or .) is not allowed');
    }
  }

  // Reconstruct path
  return normalized === '/' ? '/' : '/' + segments.join('/');
}

/**
 * Resolves a relative path against a base directory.
 */
export function resolvePath(basePath: string, relativePath: string): string {
  const base = normalizePath(basePath);

  if (!relativePath || typeof relativePath !== 'string') {
    throw new FsError(ErrorCodes.INVALID_PATH, 'Path must be a non-empty string');
  }

  // If relative path is absolute, return it
  if (relativePath.startsWith('/')) {
    return normalizePath(relativePath);
  }

  const relative = normalizePath(`/${relativePath}`).slice(1);

  // If base is root, just return relative
  if (base === '/') {
    return `/${relative}`;
  }

  // Combine base and relative
  const combined = `${base}/${relative}`;
  return normalizePath(combined);
}

/**
 * Gets the parent directory path.
 */
export function getParentPath(path: string): string | null {
  const normalized = normalizePath(path);
  if (normalized === '/') {
    return null;
  }
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length <= 1) {
    return '/';
  }
  return '/' + segments.slice(0, -1).join('/');
}

/**
 * Gets the name (last segment) of a path.
 */
export function getName(path: string): string {
  const normalized = normalizePath(path);
  if (normalized === '/') {
    return '/';
  }
  const segments = normalized.split('/').filter(Boolean);
  return segments[segments.length - 1] || '/';
}
