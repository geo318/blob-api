export type EntryType = 'file' | 'dir';

export interface FsNode {
  id: string;
  type: EntryType;
  ownerId: string;
  path: string;
  name: string;
  parentPath: string | null;
  size: number;
  mimeType: string | null;
  createDate: Date;
  updateDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkingDirectoryContext {
  [ownerId: string]: string;
}
