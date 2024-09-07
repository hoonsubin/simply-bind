import { readFile, writeFile } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import _ from "lodash";
import JSZip from "jszip";
import { DocumentItem } from "../types";
import { invoke } from "@tauri-apps/api/core";
import { PDFDocument, PDFImage } from "pdf-lib";

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

export const readZipFile = async (zipPath: string) => {
  const zipData = await readFile(zipPath); // todo: needs to be optimized

  return await JSZip.loadAsync(zipData);
};

export const webpToPng = async (webpData: Uint8Array) => {
  // create an image from the WebP data
  const img = await createImageBitmap(new Blob([webpData])); // todo: can it be optimized?

  // create a canvas element to draw the image
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

  // todo: this might be too much overhead. Need to find a better way in the future
  const pngResponse = await fetch(pngUri);
  const pngBlob = await pngResponse.blob();
  const pngArrayBuffer = await pngBlob.arrayBuffer();

  return new Uint8Array(pngArrayBuffer);
};

const webpToPngRust = async (webpData: Uint8Array) => {
  const convertedImg = await invoke("convert_webp_to_png", {
    webpData: Array.from(webpData),
  });
  if (typeof convertedImg === "string") {
    throw new Error(convertedImg);
  }

  const convertedData = new Uint8Array(convertedImg as Uint8Array);

  console.log(
    `Converted WebP image to PNG with the size of ${convertedData.length} bytes using Rust`
  );
  // trust issues
  return convertedData;
};

const embedImgToPdf = async (imgPath: string, pdf: PDFDocument) => {
  const imgBin = await readFile(imgPath);
  const imgExt = getFileExt(imgPath);

  console.log(`Processing page ${imgPath}`);

  let imageToAdd: PDFImage;

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
  // note: this part will progressively get bigger as the number of processed images increase
  // we need to find a way to process images into chunks, save it before processing the next chunk
  const page = pdf.addPage([imageToAdd.width, imageToAdd.height]);
  page.drawImage(imageToAdd, {
    x: 0,
    y: 0,
    width: imageToAdd.width,
    height: imageToAdd.height,
  });

  return pdf;
};

const createPdfFromImages = async (imgPagePaths: string[]) => {
  // todo: this function does not scale well. Maybe add pages in chunks?
  // for example, if the pdf doesn't already exist, create a new one and write first chunk, next loop will load the written file and add the next chunk
  let pdfDoc = await PDFDocument.create();

  console.log("Creating a new PDF document");

  for (const imgPath of imgPagePaths) {
    pdfDoc = await embedImgToPdf(imgPath, pdfDoc);
  }
  return await pdfDoc.save({ useObjectStreams: true });
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

    // note: this can get really big
    const pdfBin = await createPdfFromImages(
      _.map(doc.content, (i) => {
        return i.path;
      })
    );

    const docName = doc.collectionName + ".pdf";
    const savePath = await join(outputPath, docName);

    console.log(
      `Finished binding ${docName}. The document size is ${pdfBin.length} bytes`
    );

    //await writeBinaryFile(savePath, pdfBin); // note: the app runs out of memory here if the file size is large

    await writeBinaryInChunks(savePath, pdfBin);

    console.log(`Saved new PDF ${doc.collectionName} to ${savePath}`);
  }
};

export const writeBinaryInChunks = async (
  destinationPath: string,
  data: Uint8Array,
  chunkSize: number = 1024 * 1024 * 8 // 8 MB
) => {
  let offset = 0;

  console.log(
    `Saving the data with the size of ${data.length} into chunks of ${chunkSize}`
  );

  while (offset < data.length) {
    // Calculate the end of the current chunk
    const end = Math.min(offset + chunkSize, data.length);

    // Extract the current chunk from the Uint8Array
    const chunk = data.slice(offset, end);

    // todo: there is an issue with the chunk saving, where not all the bytes will be saved correctly
    // Write the chunk to the destination file
    await writeFile(destinationPath, chunk, { append: true });

    // Move the offset forward by the size of the chunk
    offset = end;
    console.log(`Wrote chunk from ${offset} to ${end} (${chunk.length} bytes)`);
  }
};
