export interface FileItem {
  name: string;
  path: string;
}

export type ProcessStatus = "Loaded" | "Processing" | "Finished" | "Failed";

export interface DocumentItem {
  collectionName: string;
  basePath: string;
  isArchive: boolean;
  content: FileItem[];
}
