import FileUpload from "./components/FileUpload";
import CollectionList from "./components/CollectionList";
import { useState, useCallback } from "react";
import { DocumentItem } from "./types";
import { CButton, CCol, CListGroup, CListGroupItem, CRow } from "@coreui/react";
import { downloadDir } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
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
        console.log(`There are ${files.length} collections`);

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          await helpers.createPdfFromCollection(file, saveLoc.toString());
        }
      }
    };

    exportPdf()
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [files]);

  return (
    <div
      className="container"
      style={{
        paddingTop: "20px",
        paddingBottom: "20px",
        position: "relative"
      }}
    >
      <CRow>
        <CCol>
          <div style={{
            height: "100%"
          }}>
            <FileUpload onFileSelect={(i) => setFiles(i)} />
            {/* <CollectionList collections={files} /> */}
            <CButton
              color="primary"
              disabled={files.length < 1 || isLoading}
              onClick={onClickExport}
            >
              Convert
            </CButton>
          </div>
        </CCol>
        <CCol>
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
