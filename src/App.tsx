import FileUpload from "./components/FileUpload";
import CollectionList from "./components/CollectionList";
import { useState, useCallback } from "react";
import { DocumentItem } from "./types";
import { CButton, CCard, CCardBody } from "@coreui/react";
import { downloadDir } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/api/dialog";
import * as helpers from "./helpers";
import _ from "lodash";

import "@coreui/coreui/dist/css/coreui.min.css";

function App() {
  // async function greet() {
  //   // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
  //   setGreetMsg(await invoke("greet", { name }));
  // }

  const [files, setFiles] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const onClickExport = useCallback(() => {
    console.log("Clicked export");
    const exportPdf = async () => {
      setIsLoading(true);
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
        console.log(`There are ${files.length} collections`);

        _.forEach(files, async (i) => {
          await helpers.createPdfFromCollection(i, saveLoc.toString());
        });
      }
    };

    exportPdf().finally(() => {
      setIsLoading(false);
    });
  }, [files]);

  return (
    <div className="container">
      <FileUpload onFileSelect={(i) => setFiles(i)} />
      <CollectionList collections={files} />
      <CButton
        color="primary"
        disabled={!files.length || isLoading}
        onClick={onClickExport}
      >
        Export Document
      </CButton>
    </div>
  );
}

export default App;
