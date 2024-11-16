import { readDir, readFile, writeFile } from "@tauri-apps/plugin-fs"; // Import functions to read and write files from Tauri's file system plugin
import { basename, join } from "@tauri-apps/api/path"; // Import function to join paths safely
import _ from "lodash"; // Import lodash for utility functions
import JSZip from "jszip"; // Import JSZip library to handle zip files
import { DocumentItem, FileItem } from "../types"; // Import custom type definitions for document items
import { invoke } from "@tauri-apps/api/core"; // Import function to invoke Rust commands from Tauri
import { PDFDocument, PDFImage } from "pdf-lib"; // Import classes to create and manipulate PDF documents
import { Command } from "@tauri-apps/plugin-shell"; // Import command execution utility
import { open } from "@tauri-apps/plugin-dialog"; // Dialog plugin for opening file/folder selectors
import { appConfig } from "../config";

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
          collectionName: i.name,
          basePath,
          content: Object.keys(zipContent).map((i) => {
            return {
              name: i,
              path: path,
            };
          }),
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
 * Opens a folder selection dialog and returns the folder path
 */
const openSelectDir = async () => {
  const selected = await open({
    directory: true,
    recursive: false,
  });

  if (!selected) {
    console.error("User did not select a folder");
    return [];
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

/**
 * Converts WebP image data to PNG format using JavaScript.
 * @param webpData - The binary data of the WebP image.
 * @returns The binary data of the converted PNG image.
 */
export const webpToPng = async (webpData: Uint8Array) => {
  // Create an ImageBitmap from the WebP data
  const img = await createImageBitmap(new Blob([webpData]));

  // Create a canvas element to draw the image
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;

  const ctx = canvas.getContext("2d");

  // Throw an error if the 2D context is not available
  if (!ctx) {
    throw new Error("Cannot find context 2d in the canvas!");
  }

  // Draw the image on the canvas
  ctx.drawImage(img, 0, 0);

  // Convert the canvas content to a PNG data URL
  const pngUri = canvas.toDataURL("image/png");

  // Fetch the PNG data URL and convert it to a blob
  const pngResponse = await fetch(pngUri);
  const pngBlob = await pngResponse.blob();

  // Convert the blob to an array buffer and return as Uint8Array
  const pngArrayBuffer = await pngBlob.arrayBuffer();
  return new Uint8Array(pngArrayBuffer);
};

/**
 * Converts WebP image data to PNG format using a Rust function.
 * @param webpData - The binary data of the WebP image.
 * @returns The binary data of the converted PNG image.
 */
const webpToPngRust = async (webpData: Uint8Array) => {
  // Invoke the Rust function to convert WebP to PNG
  const convertedImg = await invoke("convert_webp_to_png", {
    webpData: Array.from(webpData),
  });

  // Throw an error if the conversion failed
  if (typeof convertedImg === "string") {
    throw new Error(convertedImg);
  }

  // Convert the result to Uint8Array and return
  const convertedData = new Uint8Array(convertedImg as Uint8Array);
  return convertedData;
};

/**
 * Embeds an image into a PDF document.
 * @param imgPath - The path to the image file to embed.
 * @param pdf - The PDFDocument object to which the image will be added.
 * @returns The updated PDFDocument with the embedded image.
 */
const embedImgToPdf = async (imgPath: string, pdf: PDFDocument) => {
  // Read the binary data of the image
  const imgBin = await readFile(imgPath);

  // Get the file extension of the image
  const imgExt = getFileExt(imgPath);

  let imageToAdd: PDFImage;

  // Embed the image based on its format
  switch (imgExt) {
    case "png":
      imageToAdd = await pdf.embedPng(imgBin);
      break;
    case "jpg":
    case "jpeg":
      imageToAdd = await pdf.embedJpg(imgBin);
      break;
    case "webp":
      const pngFromWebp = await webpToPngRust(imgBin);
      imageToAdd = await pdf.embedPng(pngFromWebp);
      break;
    default:
      throw new Error(`File extension ${imgExt} is not supported`);
  }

  // Add a page to the PDF with the same dimensions as the image
  const page = pdf.addPage([imageToAdd.width, imageToAdd.height]);

  // Draw the image on the page
  page.drawImage(imageToAdd, {
    x: 0,
    y: 0,
    width: imageToAdd.width,
    height: imageToAdd.height,
  });

  return pdf;
};

/**
 * Creates a PDF document from an array of image paths.
 * @param imgPagePaths - An array of file paths to images to include in the PDF.
 * @returns The binary data of the created PDF document.
 */
const createPdfFromImages = async (imgPagePaths: string[]) => {
  // Create a new PDF document
  let pdfDoc = await PDFDocument.create();

  // Embed each image into the PDF document
  for (const imgPath of imgPagePaths) {
    pdfDoc = await embedImgToPdf(imgPath, pdfDoc);
  }

  // Save the PDF document and return its binary data
  return await pdfDoc.save({ useObjectStreams: true });
};

/**
 * Creates a PDF document from a collection of images or archived content.
 * @param doc - A DocumentItem object representing the collection to convert.
 * @param outputPath - The path where the output PDF should be saved.
 */
export const createPdfFromCollection = async (
  doc: DocumentItem,
  outputPath: string
) => {
  if (doc.isArchive) {
    // Skip archives as zip support is not implemented yet
    console.log(
      `Skipping ${doc.collectionName} as zip support is not added yet`
    );
  } else {
    // Create a PDF document from the images in the collection
    const pdfBin = await createPdfFromImages(_.map(doc.content, (i) => i.path));

    // Construct the output file path
    const docName = doc.collectionName + ".pdf";
    const savePath = await join(outputPath, docName);

    // Write the PDF binary data to the file in chunks to avoid memory issues
    await writeBinaryInChunks(savePath, pdfBin);
  }
};

/**
 * Writes binary data to a file in chunks.
 * @param destinationPath - The path where the file should be saved.
 * @param data - The binary data to write.
 * @param chunkSize - The size of each chunk (default: 8 MB).
 */
export const writeBinaryInChunks = async (
  destinationPath: string,
  data: Uint8Array,
  chunkSize: number = 1024 * 1024 * 8 // 8 MB
) => {
  let offset = 0;

  // Loop through the data in chunks and write each chunk to the file
  while (offset < data.length) {
    // Calculate the end of the current chunk
    const end = Math.min(offset + chunkSize, data.length);

    // Extract the current chunk from the Uint8Array
    const chunk = data.slice(offset, end);

    // Write the chunk to the destination file
    await writeFile(destinationPath, chunk, { append: true });

    // Move the offset forward by the size of the chunk
    offset = end;
  }
};
