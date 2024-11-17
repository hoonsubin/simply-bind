import { readDir, readFile, exists } from "@tauri-apps/plugin-fs"; // Import functions to read and write files from Tauri's file system plugin
import { basename, join } from "@tauri-apps/api/path"; // Import function to join paths safely
import _ from "lodash"; // Import lodash for utility functions
import JSZip from "jszip"; // Import JSZip library to handle zip files
import { DocumentItem, FileItem } from "../types"; // Import custom type definitions for document items
import { Command } from "@tauri-apps/plugin-shell"; // Import command execution utility
import { open } from "@tauri-apps/plugin-dialog"; // Dialog plugin for opening file/folder selectors
import { appConfig } from "../config";
import { downloadDir } from "@tauri-apps/api/path";

/**
 * Converts a file to PDF using a sidecar Python script.
 * @param fileName - The name of the file to convert.
 * @param inputPath - The path to the input file.
 * @param outputPath - The path where the output PDF should be saved.
 */
export const convertToPdfSidecar = async (
  fileName: string,
  inputPath: string,
  outputPath: string
) => {
  const targetPath = await join(outputPath, fileName + ".pdf");
  const fileExists = await exists(targetPath);
  if (fileExists) {
    throw new Error(`File ${targetPath} already exists`);
  }

  // Create a command instance for the sidecar Python script with arguments
  const command = Command.sidecar("bin/python-script", [
    "--name",
    fileName,
    "--input",
    inputPath,
    "--output",
    outputPath,
  ]);

  // Execute the command and log the output
  const output = await command.execute();
  console.log(output);
};

/**
 * Extracts the file extension from a given file path.
 * @param filePath - The path of the file.
 * @returns The file extension in lowercase.
 * @throws Will throw an error if the file does not have an extension.
 */
const getFileExt = (filePath: string) => {
  // Split the file path by dot and get the last part as the extension
  const ext = filePath.toLowerCase().split(".").pop();

  // Throw an error if no extension is found
  if (!ext) {
    throw new Error(`${filePath} does not have an extension`);
  }

  return ext;
};

/**
 * Checks if a file's extension matches any of the provided extensions.
 * @param filePath - The path of the file to check.
 * @param ext - An array of valid extensions.
 * @returns True if the file's extension is in the list, false otherwise.
 */
export const checkFileExtMatch = (filePath: string, ext: string[]) => {
  return ext.includes(getFileExt(filePath));
};

/**
 * Processes a directory by reading its contents and categorizing them into image files, zip files, and folders.
 * @param path - The path of the directory to process.
 * @returns An array of processed document items.
 */
export const processPath = async (path: string) => {
  let processedFiles: DocumentItem[] = [];

  const files = await readDir(path); // Read the contents of the directory

  if (!files) {
    return [];
  }

  // Filter image files based on supported formats
  const imageFiles = files.filter((file) => {
    return (
      file.isFile && checkFileExtMatch(file.name, appConfig.supportedImgFormat)
    );
  });

  // Filter zip files
  const zipFiles = files.filter((file) => {
    return file.isFile && checkFileExtMatch(file.name, ["zip"]);
  });

  // Filter folders (directories)
  const folders = files.filter((file) => {
    return !!file.isDirectory;
  });

  if (!imageFiles.length && !zipFiles.length && !folders.length) {
    throw new Error(`${path} is empty`);
  }

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
      return await processPath(await join(path, folder.name)); // Recursively process each folder
    });

    const processedSubDirs = (await Promise.all(subDocs)).flat();
    processedFiles.push(...processedSubDirs);
  }

  // Handling zip files of image collections
  if (zipFiles.length > 0) {
    const zipCollections = await Promise.all(
      _.map(zipFiles, async (i) => {
        const basePath = await join(path, i.name);
        const zipContent = (await readZipFile(basePath)).files;

        return {
          collectionName: i.name.split(".")[0],
          basePath,
          content: Object.keys(zipContent).map((i) => {
            return {
              name: i,
              path: path,
            };
          }),
          isArchive: true,
          processStatus: "Loaded",
        } as DocumentItem;
      })
    );

    processedFiles.push(...zipCollections);
  }

  return processedFiles;
};

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

export const listContainsDocument = (
  docList: DocumentItem[],
  docToCheck: DocumentItem
) => {
  return !!_.find(docList, (i) => {
    return (
      i.collectionName === docToCheck.collectionName &&
      i.basePath === docToCheck.basePath
    );
  });
};

/**
 * Opens a folder selection dialog and returns the folder path
 */
export const openSelectDir = async () => {
  const selected = await open({
    directory: true,
    recursive: false,
    defaultPath: await downloadDir(),
  });

  if (!selected) {
    console.error("User did not select a folder");
    return "";
  }

  return selected;
};

/**
 * Reads a ZIP file and returns its contents as a JSZip object.
 * @param zipPath - The path to the ZIP file.
 * @returns A JSZip object containing the ZIP file's contents.
 */
export const readZipFile = async (zipPath: string) => {
  // Read the binary data of the ZIP file
  const zipData = await readFile(zipPath);

  // Load the ZIP data into a JSZip object
  return await JSZip.loadAsync(zipData);
};
