import {
  FileEntry,
  readDir,
  readBinaryFile,
  writeBinaryFile,
} from "@tauri-apps/api/fs";
import { join } from "@tauri-apps/api/path";
import { PDFDocument, PDFImage } from "pdf-lib";
import _ from "lodash";
import JSZip from "jszip";
import { DocumentItem } from "../types";

export const getFileExt = (filePath: string) => {
  const ext = filePath.toLowerCase().split(".").pop();

  if (!ext) {
    throw new Error(`${filePath} does not have an extension`);
  }

  return ext;
};

export const checkFileExtMatch = (filePath: string, ext: string[]) => {
  return ext.includes(getFileExt(filePath));
};

export const getAllFilesInDir = async (
  basePath: string,
  extFilter?: string[]
) => {
  const filesInDir = await readDir(basePath, { recursive: false });

  if (!filesInDir) {
    return [];
  }

  if (extFilter) {
    return _.filter(filesInDir, (file) => {
      return file.name && !file.children && extFilter.includes(file.name!);
    });
  }

  return filesInDir;
};

export const getAllFolderOrZip = (entry: FileEntry[]) => {
  const foldersOrZip: FileEntry[] = [];

  if (!entry) {
    return [];
  }

  for (let i = 0; i < entry.length; i++) {
    const file = entry[i];
    // skip if it's a special directory (e.g., '.' or '..')
    if (!file.name) {
      continue;
    }

    // if the entry is a subdirectory
    if (file.children) {
      foldersOrZip.push(file);
    } else {
      // only add zip files
      if (checkFileExtMatch(file.path, ["zip"])) {
        foldersOrZip.push(file);
      } else {
        // skip if it's not a sub dir or a zip file
        continue;
      }
    }
  }

  return foldersOrZip;
};

export const readZipFile = async (zipPath: string) => {
  const zipData = await readBinaryFile(zipPath);

  return await JSZip.loadAsync(zipData);
};

export const webpToPng = async (webpData: Uint8Array) => {
  // Create an image from the WebP data
  const img = await createImageBitmap(new Blob([webpData]));

  // Create a canvas element to draw the image
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Cannot find context 2d in the canvas!");
  }

  ctx.drawImage(img, 0, 0);

  // convert the canvas content to a PNG data URL
  const pngUri = canvas.toDataURL("image/png");

  // note: this might be too much overhead. Need to find a better way in the future
  const pngResponse = await fetch(pngUri);
  const pngBlob = await pngResponse.blob();
  const pngArrayBuffer = await pngBlob.arrayBuffer();

  return new Uint8Array(pngArrayBuffer);
};

const createPdfFromImages = async (imgPagePaths: string[]) => {
  // todo: this function is broken
  const pdfDoc = await PDFDocument.create();

  console.log("Creating a new PDF document");

  // todo: must convert webp to png before loading
  const imageData = await Promise.all(
    _.map(imgPagePaths, async (i) => {
      const imgBin = await readBinaryFile(i);
      const imgExt = getFileExt(i);
      console.log("Extracted image with the extension ", imgExt);
      return {
        imgBin,
        imgExt,
      };
    })
  );

  for (let i = 0; i < imageData.length; i++) {
    const currentImgBin = imageData[i].imgBin;
    const imgExt = imageData[i].imgExt;

    console.log(`Processing page ${imgPagePaths[i]}`);

    let imageToAdd: PDFImage;

    switch (imgExt) {
      case "png":
        imageToAdd = await pdfDoc.embedPng(currentImgBin);
        break;
      case "jpg":
      case "jpeg":
        imageToAdd = await pdfDoc.embedJpg(currentImgBin);
        break;
      case "webp":
        // convert the image to pdf if its a webp
        console.log("Found a webp file. Converting to png before adding the page");
        const pngFromWebp = await webpToPng(currentImgBin);
        imageToAdd = await pdfDoc.embedPng(pngFromWebp);
        break;
      default:
        throw new Error(`File extension ${imgExt} is not supported`);
    }

    // if (!imageToAdd) {
    //   throw new Error("Failed to prepare image to be embedded to the PDF");
    // }

    const page = pdfDoc.addPage([imageToAdd.width, imageToAdd.height]);
    
    page.drawImage(imageToAdd, {
      x: 0,
      y: 0,
      width: imageToAdd.width,
      height: imageToAdd.height,
    });

    console.log("Added a new page");
  }

  return await pdfDoc.save();
};

export const createPdfFromCollection = async (
  doc: DocumentItem,
  outputPath: string
) => {
  if (doc.isArchive) {
    // todo: implement convert zip content to pdf
    console.log(
      `Skipping ${doc.collectionName} as zip support is not added yet`
    );
  } else {
    console.log(
      `Converting collection ${doc.collectionName} in ${doc.basePath}`
    );
    // todo: because we load everything to memory, this function will quickly run out of memory
    const pdfBin = await createPdfFromImages(
      _.map(doc.content, (i) => {
        return i.path;
      })
    );
    const docName = doc.collectionName + ".pdf";
    const savePath = await join(outputPath, docName);
    await writeBinaryFile(savePath, pdfBin);
    console.log(`Saved new PDF ${doc.collectionName} to ${savePath}`);
  }
};
