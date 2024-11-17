import { readDir, readFile, exists } from "@tauri-apps/plugin-fs"; // Import functions to interact with the file system from Tauri's file system plugin
import { basename, join } from "@tauri-apps/api/path"; // Import path manipulation utilities
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
  // Construct the target path for the output PDF file
  const targetPath = await join(outputPath, fileName + ".pdf");
  
  // Check if the target file already exists
  const fileExists = await exists(targetPath);
  if (fileExists) {
    throw new Error(`File ${targetPath} already exists`);
  }

  // Create a command instance to execute the sidecar Python script with appropriate arguments
  const command = Command.sidecar("bin/python-script", [
    "--name",
    fileName,
    "--input",
    inputPath,
    "--output",
    outputPath,
  ]);

  // Execute the command and log its output
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

  // todo: ignore hidden files
  const files = await readDir(path); // Read the contents of the directory

  if (!files) {
    return [];
  }

  // Filter image files based on supported formats defined in appConfig
  const imageFiles = files.filter((file) => file.isFile && checkFileExtMatch(file.name, appConfig.supportedImgFormat));

  // Filter zip files by their extension
  const zipFiles = files.filter((file) => file.isFile && checkFileExtMatch(file.name, ["zip"]));

  // Filter folders (directories)
  const folders = files.filter((file) => !!file.isDirectory);

  if (!imageFiles.length && !zipFiles.length && !folders.length) {
    throw new Error(`${path} is empty`);
  }

  // Handling image collections in the base directory
  if (imageFiles.length > 0) {
    // Get the name of the directory
    const collectionName = await basename(path);

    // Map image files to FileItem objects
    const collectionContent = await Promise.all(
      _.map(imageFiles, async (i) => ({
        name: i.name,
        path: await join(path, i.name),
      } as FileItem))
    );

    // Create a DocumentItem for the collection of images in the base directory
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
    // Recursively process each folder and flatten the results
    const subDocs = _.map(folders, async (folder) => await processPath(await join(path, folder.name)));
    const processedSubDirs = (await Promise.all(subDocs)).flat();
    processedFiles.push(...processedSubDirs);
  }

  // Handling zip files of image collections
  if (zipFiles.length > 0) {
    // Process each zip file to create a DocumentItem for the images inside it
    const zipCollections = await Promise.all(
      _.map(zipFiles, async (i) => {
        const basePath = await join(path, i.name);
        
        // note: removed zip content read due to a platform-specific error
        // const zipContent = (await readZipFile(basePath)).files;

        // const zipCont = Object.keys(zipContent).map((i) => {
        //   return {
        //     name: i,
        //     path: path,
        //   };
        // })

        return {
          collectionName: i.name.split(".")[0], // Extract the name of the collection from the zip file's name
          basePath,
          content: [],
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
    // Return the file item for a file entry
    return [{ path: entry.fullPath, name: entry.name || "" }];
  } else if (entry.isDirectory) {
    const dirReader = entry.createReader();
    
    // Read the contents of the directory
    const entries = await new Promise<any[]>((resolve) => {
      dirReader.readEntries(resolve);
    });

    // Process each entry in the directory and flatten the results
    const promises = entries.map((e) => processEntry(e));
    const results = await Promise.all(promises);
    return results.flat();
  }
  
  return [];
};

/**
 * Checks if a document item is contained in a list of document items.
 * @param docList - The list of document items to search within.
 * @param docToCheck - The document item to check for.
 * @returns True if the document item is found, false otherwise.
 */
export const listContainsDocument = (
  docList: DocumentItem[],
  docToCheck: DocumentItem
) => {
  return !!_.find(docList, (i) => i.collectionName === docToCheck.collectionName && i.basePath === docToCheck.basePath);
};

/**
 * Opens a folder selection dialog and returns the selected folder path.
 * @returns The path of the selected folder or an empty string if no folder was selected.
 */
export const openSelectDir = async () => {
  // Open a dialog to select a directory
  const selected = await open({
    directory: true,
    recursive: false,
    defaultPath: await downloadDir(), // Set the default path to the user's download directory
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
