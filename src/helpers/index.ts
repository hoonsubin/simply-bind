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
