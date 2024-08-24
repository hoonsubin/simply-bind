export interface FileItem {
  name: string;
  path: string;
}

export interface DocumentItem {
  collectionName: string;
  basePath: string;
  isArchive: boolean;
  content: FileItem[];
}
