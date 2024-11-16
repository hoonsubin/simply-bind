import { useState, useCallback } from "react";
import { DocumentItem, FileItem } from "./types"; // Import custom types for document and file items
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CListGroup,
  CListGroupItem,
  CRow,
} from "@coreui/react"; // Import CoreUI components
import { downloadDir } from "@tauri-apps/api/path"; // Function to get the default download directory
import { open } from "@tauri-apps/plugin-dialog"; // Dialog plugin for opening file/folder selectors
import * as helpers from "./helpers"; // Custom helper functions
import { basename, join } from "@tauri-apps/api/path"; // Path manipulation functions
import _ from "lodash"; // Utility library
import { readDir } from "@tauri-apps/plugin-fs"; // Function to read directory contents
import { appConfig } from "./config"; // Application configuration
import "@coreui/coreui/dist/css/coreui.min.css"; // Import CoreUI CSS

function App() {
  const [files, setFiles] = useState<DocumentItem[]>([]); // State to hold the list of processed files
  const [isLoading, setIsLoading] = useState(false); // State to indicate if the app is currently loading

  /**
   * Processes a directory by reading its contents and categorizing them into image files, zip files, and folders.
   * @param path - The path of the directory to process.
   * @returns An array of processed document items.
   */
  const processDir = async (path: string) => {
    let processedFiles: DocumentItem[] = [];

    const files = await readDir(path); // Read the contents of the directory

    if (!files) {
      return [];
    }

    // Filter image files based on supported formats
    const imageFiles = files.filter((file) => {
      return (
        file.isFile &&
        helpers.checkFileExtMatch(file.name, appConfig.supportedImgFormat)
      );
    });

    // Filter zip files
    const zipFiles = files.filter((file) => {
      return file.isFile && helpers.checkFileExtMatch(file.name, ["zip"]);
    });

    // Filter folders (directories)
    const folders = files.filter((file) => {
      return !!file.isDirectory;
    });

    if (!imageFiles.length && !zipFiles.length && !folders.length) {
      throw new Error(`${path} is empty`);
    }

    console.log("Found the following files in " + path, {
      imageFiles,
      zipFiles,
      folders,
    });

    // Handling image collections in the base directory
    if (imageFiles.length > 0) {
      const collectionName = await basename(path); // Get the name of the directory

      const collectionContent = await Promise.all(
        _.map(imageFiles, async (i) => {
          return {
            name: i.name,
            path: await join(path, i.name),
          } as FileItem;
        })
      );

      const rootCollection: DocumentItem = {
        collectionName: collectionName,
        basePath: path,
        content: _.sortBy(collectionContent, ["name"]), // Sort files by name
        isArchive: false,
      };

      processedFiles.push(rootCollection);
    }

    // Handling folders of image collections
    if (folders.length > 0) {
      const subDocs = _.map(folders, async (folder) => {
        return await processDir(await join(path, folder.name)); // Recursively process each folder
      });

      const processedSubDirs = (await Promise.all(subDocs)).flat();
      processedFiles.push(...processedSubDirs);
    }

    // Handling zip files of image collections
    if (zipFiles.length > 0) {
      const zipCollections = await Promise.all(
        _.map(zipFiles, async (i) => {
          return {
            collectionName: i.name,
            basePath: await join(path, i.name),
            content: [],
            isArchive: true,
          } as DocumentItem;
        })
      );

      processedFiles.push(...zipCollections);
    }

    console.log("Processed collections ", processedFiles);

    return processedFiles;
  };

  /**
   * Handles the drop event when files or folders are dragged and dropped onto the drop zone.
   * @param event - The drag event.
   */
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const items = event.dataTransfer.items;

    if (items) {
      const filePromises: Promise<FileItem[]>[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item) {
          filePromises.push(processEntry(item as FileSystemDirectoryEntry)); // Process each entry
        }
      }

      // Promise.all(filePromises).then((fileItems) => {
      //   setFiles(fileItems.flat());
      // });
    }
  }, []);

  /**
   * Recursively processes a directory or file entry.
   * @param entry - The file system entry to process (can be a file or a directory).
   * @returns An array of processed file items.
   */
  const processEntry = async (
    entry: FileSystemDirectoryEntry
  ): Promise<FileItem[]> => {
    if (entry.isFile) {
      return [{ path: entry.fullPath, name: entry.name || "" }]; // Return the file item for a file entry
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const entries = await new Promise<any[]>((resolve) => {
        dirReader.readEntries(resolve); // Read the contents of the directory
      });

      const promises = entries.map((e) => processEntry(e)); // Process each entry in the directory
      const results = await Promise.all(promises);
      return results.flat();
    }
    return [];
  };

  /**
   * Handles the drag over event to allow dropping files or folders.
   * @param event - The drag event.
   */
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  /**
   * Opens a folder selection dialog and processes the selected directories.
   */
  const onClickSelectFiles = async () => {
    setIsLoading(true); // Show loading effect

    const selected = await open({
      multiple: true,
      directory: true,
      recursive: false,
    });

    if (!selected) {
      console.error("User did not select a folder");
      setIsLoading(false);
      return;
    }

    if (Array.isArray(selected)) {
      const filePromises = selected.map(async (path) => {
        return await processDir(path); // Process each selected directory
      });

      const fileItems = (await Promise.all(filePromises)).flat();
      setFiles(fileItems); // Update the files state with processed items
      setIsLoading(false);
    }
  };

  /**
   * Converts the selected document collections into PDFs.
   */
  const onClickConvert = useCallback(() => {
    setIsLoading(true);

    const exportPdf = async () => {
      const saveLoc = await open({
        multiple: false,
        directory: true,
        recursive: false,
        defaultPath: await downloadDir(),
      });

      if (!saveLoc) {
        console.error("Could not get the export path");
        setIsLoading(false);
        return;
      }
      console.log("Got the export path: ", saveLoc);

      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          await helpers.createPdfFromCollection(file, saveLoc.toString()); // Convert each collection to a PDF
        }
      }
    };

    exportPdf()
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setIsLoading(false); // Hide loading effect after processing is complete
      });
  }, [files]);

  return (
    <div
      className="container"
      style={{
        paddingTop: "20px",
        paddingBottom: "20px",
        position: "relative",
      }}
    >
      <CRow>
        <CCol>
          <CCard
            style={{
              height: "100%",
              width: "100%",
            }}
          >
            <CCardBody>
              {/* Drag and drop area */}
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
              {/* Button to select files or folders */}
              <CButton
                color="primary"
                onClick={onClickSelectFiles}
                disabled={isLoading}
              >
                {isLoading ? "Loading files..." : "Select Files or Folders"}
              </CButton>
              {/* Button to convert selected collections to PDFs */}
              <CButton
                color="primary"
                disabled={files.length < 1 || isLoading}
                onClick={onClickConvert}
              >
                Convert
              </CButton>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol>
          {/* Display processed files and collections */}
          <div
            style={{
              height: "90vh",
              overflowX: "hidden",
              overflowY: "auto",
            }}
          >
            {files.length > 0 ? (
              <>
                <CListGroup>
                  {files.map((i, index) => {
                    return (
                      <CListGroupItem
                        as="button"
                        key={index}
                        color={!i.isArchive ? "primary" : "secondary"}
                      >
                        <div>
                          <h5>{i.collectionName}</h5>
                          <small>{i.basePath}</small>
                        </div>
                      </CListGroupItem>
                    );
                  })}
                </CListGroup>
              </>
            ) : (
              <>
                <h1>No Items</h1>
              </>
            )}
          </div>
        </CCol>
      </CRow>
    </div>
  );
}

export default App;
