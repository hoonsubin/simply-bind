import { FileEntry } from "@tauri-apps/api/fs";
import { readDir } from "@tauri-apps/api/fs";
import _ from "lodash";

export const checkFileExtMatch = (filePath: string, ext: string[]) => {
  // const fileExt = filePath.toLowerCase().split(".").pop();
  // if (!fileExt) {
  //   throw new Error(`${filePath} is not a valid file`);
  // }

  // for (let i = 0; i++; i < ext.length) {
  //   // remove the . text to ensure all inputs are in the same format
  //   const cleanExt = ext[i].replace(".", "");
  //   if (fileExt.includes(cleanExt)) {
  //     return true;
  //   }
  // }

  // return false;

  // Filter files that match the extensions
  const fileExt = filePath.toLowerCase().split(".").pop();
  if (!fileExt) {
    throw new Error(`${filePath} is not a valid file`);
  }

  return ext.includes(fileExt);
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

  for (let i = 0; i++; i < entry.length) {
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
