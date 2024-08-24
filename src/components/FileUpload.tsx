import React, { useState, useCallback, useEffect } from "react";
import { open } from "@tauri-apps/api/dialog";
import { readDir } from "@tauri-apps/api/fs";
import { dirname, basename } from "@tauri-apps/api/path";
import { appConfig } from "../config";
import { FileItem, DocumentItem } from "../types";
import * as helpers from "../helpers";
import _ from "lodash";
import { CButton, CCard, CCardBody } from "@coreui/react";

type FileUploadProps = {
  onFileSelect: (files: DocumentItem[]) => void;
};

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const [files, setFiles] = useState<DocumentItem[]>([]);

  useEffect(() => {
    onFileSelect(files);
  }, [files]);

  const processDir = async (path: string) => {
    // todo: implement this
    // check the base folder for all zip or image files and subdirectories
    // check all subdirectories for zip or image files
    // create a collection for all folders (and zip) of image files

    let processedFiles: DocumentItem[] = [];

    const files = await readDir(path, { recursive: false });

    if (!files) {
      return [];
    }
    const imageFiles = files.filter((file) => {
      return (
        file.name &&
        helpers.checkFileExtMatch(file.path, appConfig.supportedImgFormat)
      );
    });
    const zipFiles = files.filter((file) => {
      return file.name && helpers.checkFileExtMatch(file.path, ["zip"]);
    });
    const folders = files.filter((file) => {
      return !!file.children;
    });

    if (!imageFiles && !zipFiles && !folders) {
      throw new Error(`${path} is empty`);
    }

    console.log("Found the following files in " + path, {
      imageFiles,
      zipFiles,
      folders,
    });
    // handling image collections in the base dir
    if (imageFiles.length > 0) {
      // create a root collection
      const collectionName = await basename(await dirname(imageFiles[0].path));
      const collectionContent = _.map(imageFiles, (i) => {
        return {
          name: i.name!,
          path: i.path,
        } as FileItem;
      });

      const rootCollection: DocumentItem = {
        collectionName: collectionName,
        basePath: path,
        content: _.sortBy(collectionContent, ["name"]),
      };

      processedFiles.push(rootCollection);
    }

    // handling folders of image collection
    if (folders.length > 0) {
      // todo: handle folder image collection behavior
      const subDocs = _.map(folders, async (folder) => {
        return await processDir(folder.path);
      });

      const processedSubDirs = (await Promise.all(subDocs)).flat();
      processedFiles.push(...processedSubDirs);
    }

    // handling zip files of image collection
    if (zipFiles.length > 0) {
      // todo: handle zip image collection behavior. Note that this function is extremely slow!
      // note: we cannot assume that all zip file will contain exclusively image files
      // const loadedZipBin = await Promise.all(
      //   _.map(zipFiles, async (i) => {
      //     return await readBinaryFile(i.path);
      //   })
      // );
      // const zipContents = await Promise.all(
      //   _.map(loadedZipBin, async (i) => {
      //     return (await JSZip.loadAsync(i)).files;
      //   })
      // );
    }

    return processedFiles;
  };

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
        //setFiles(fileItems.flat());
      });
    }
  }, []);

  const processEntry = async (
    entry: FileSystemDirectoryEntry
  ): Promise<FileItem[]> => {
    if (entry.isFile) {
      return [{ path: entry.fullPath, name: entry.name || "" }];
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

  const handleSelectButtonClick = async () => {
    const selected = await open({
      multiple: true,
      directory: true,
      recursive: false,
    });

    if (Array.isArray(selected)) {
      // gets all the files in the selected directory
      const filePromises = selected.map(async (path) => {
        return await processDir(path);
      });

      const fileItems = (await Promise.all(filePromises)).flat();
      setFiles(fileItems);
    }
  };

  return (
    <div>
      <CCard>
        <CCardBody>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            style={{
              border: "2px dashed #ccc",
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            Drag and drop
          </div>
          <CButton color="primary" onClick={handleSelectButtonClick}>
            Select Files or Folders
          </CButton>
        </CCardBody>
      </CCard>
    </div>
  );
};

export default FileUpload;
