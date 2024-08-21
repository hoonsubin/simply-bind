import React, { useState, useCallback } from 'react';
import { open } from '@tauri-apps/api/dialog';
import { readDir, BaseDirectory } from '@tauri-apps/api/fs';

type FileItem = {
  path: string;
  name: string;
};

const FileUpload: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const items = event.dataTransfer.items;

    if (items) {
      const filePromises: Promise<FileItem[]>[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item) {
          filePromises.push(processEntry(item as FileSystemDirectoryEntry));
        }
      }

      Promise.all(filePromises).then((fileItems) => {
        setFiles(fileItems.flat());
      });
    }
  }, []);

  const processEntry = async (entry: FileSystemDirectoryEntry): Promise<FileItem[]> => {
    if (entry.isFile) {
      return [{ path: entry.fullPath, name: entry.name || '' }];
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const entries = await new Promise<any[]>((resolve) => {
        dirReader.readEntries(resolve);
      });

      const promises = entries.map((e) => processEntry(e));
      const results = await Promise.all(promises);
      return results.flat();
    }
    return [];
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleButtonClick = async () => {
    const selected = await open({
      multiple: true,
      directory: true,
      recursive: true,
    });

    if (Array.isArray(selected)) {
      const filePromises = selected.map(async (path) => {
        const files = await readDir(path as string, { recursive: true });
        return files.map((file) => ({
          path: file.path,
          name: file.name || '',
        }));
      });

      const fileItems = await Promise.all(filePromises);
      setFiles(fileItems.flat());
    }
  };

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{ border: '2px dashed #ccc', padding: '20px', marginBottom: '20px' }}
      >
        Drag and drop
      </div>
      <button onClick={handleButtonClick}>Select Files or Folders</button>
      <ul>
        {files.map((file, index) => (
          <li key={index}>{file.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default FileUpload;
