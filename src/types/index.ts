export interface FileItem {
  name: string;
  path: string;
}

export interface DocumentItem {
  collectionName: string;
  basePath: string;
  content: FileItem[];
}
