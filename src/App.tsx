import { useState, useCallback } from "react";
import { DocumentItem, FileItem } from "./types"; // Import custom types for document and file items
import {
  CButton,
  CCard,
  CCol,
  CContainer,
  CFormInput,
  CFormLabel,
  CInputGroup,
  CInputGroupText,
  CListGroup,
  CListGroupItem,
  CProgress,
  CRow,
  CToast,
  CToastBody,
  CToastHeader,
} from "@coreui/react"; // Import CoreUI components
import { downloadDir } from "@tauri-apps/api/path"; // Function to get the default download directory
import { open } from "@tauri-apps/plugin-dialog"; // Dialog plugin for opening file/folder selectors
import * as helpers from "./helpers"; // Custom helper functions
import _ from "lodash"; // Utility library
import "@coreui/coreui/dist/css/coreui.min.css"; // Import CoreUI CSS
import CollectionItem from "./components/CollectionItem";

type SysMsgToastProps = {
  message: string;
};
const SysMsgToast: React.FC<SysMsgToastProps> = (props) => {
  return (
    <>
      <CToast>
        <CToastHeader closeButton>
          <svg
            className="rounded me-2"
            width="20"
            height="20"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid slice"
            focusable="false"
            role="img"
          >
            <rect width="100%" height="100%" fill="#007aff"></rect>
          </svg>
          <div className="fw-bold me-auto">CoreUI for React.js</div>
          <small>7 min ago</small>
        </CToastHeader>
        <CToastBody>{props.message}</CToastBody>
      </CToast>
    </>
  );
};

function App() {
  const [files, setFiles] = useState<DocumentItem[]>([]); // State to hold the list of processed files
  const [isLoading, setIsLoading] = useState(false); // State to indicate if the app is currently loading
  const [outputPath, setOutputPath] = useState("");

  const onClickSelectSavePath = () => {
    setIsLoading(true);
    const _saveFiles = async () => {
      const selected = await open({
        multiple: false,
        directory: true,
        recursive: false,
      });

      if (!selected) {
        throw new Error("User did not select a folder");
      }

      return selected;
    };

    _saveFiles()
      .then((i) => {
        setOutputPath(i);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  /**
   * Opens a folder selection dialog and processes the selected directories.
   */
  const onClickAddFiles = () => {
    setIsLoading(true); // Show loading effect

    const _addFiles = async () => {
      const selected = await open({
        multiple: true,
        directory: true,
        recursive: false,
      });

      if (!selected) {
        throw new Error("User did not select a folder");
      }

      const filePromises = selected.map(async (path) => {
        return await helpers.processPath(path); // Process each selected directory
      });

      const fileItems = (await Promise.all(filePromises)).flat();
      return fileItems;
    };

    _addFiles()
      .then((i) => {
        // todo: add new files to the list instead of completely replacing it
        setFiles(i); // Update the files state with processed items
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  /**
   * Converts the selected document collections into PDFs.
   */
  const onClickConvert = useCallback(() => {
    setIsLoading(true);

    const _exportPdf = async () => {
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          await helpers.convertToPdfSidecar(
            file.collectionName,
            file.basePath,
            outputPath
          ); // Convert each collection to a PDF
        }
      }
    };

    _exportPdf()
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setIsLoading(false); // Hide loading effect after processing is complete
      });
  }, [files, outputPath]);

  return (
    <CContainer
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
            <CListGroup>
              <CListGroupItem className="d-grid gap-2">
                {/* Button to select files or folders */}
                <CButton
                  color="primary"
                  onClick={onClickAddFiles}
                  disabled={isLoading}
                  size="lg"
                >
                  {isLoading ? "Loading files..." : "Add Collections"}
                </CButton>
              </CListGroupItem>
              <CListGroupItem className="d-grid gap-2">
                {/* <div className="mb-3">
                  <CFormInput
                    type="file"
                    id="formFile"
                    label="Set output folder"
                  />
                </div> */}
                <CInputGroup className="has-validation">
                  <CButton
                    color="primary"
                    disabled={isLoading}
                    size="lg"
                    onClick={onClickSelectSavePath}
                  >
                    Where to save
                  </CButton>
                  {outputPath && (
                    <CInputGroupText>{outputPath}</CInputGroupText>
                  )}
                </CInputGroup>
              </CListGroupItem>
              <CListGroupItem className="d-grid gap-2">
                {/* Button to convert selected collections to PDFs */}
                <CButton
                  color="primary"
                  disabled={files.length < 1 || isLoading || !outputPath}
                  onClick={onClickConvert}
                  size="lg"
                >
                  Convert
                </CButton>
              </CListGroupItem>
              <CListGroupItem>
                <h1>Progress</h1>
                <CProgress value={50} />
              </CListGroupItem>
            </CListGroup>
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
                      <CollectionItem
                        processStatus="Loaded"
                        key={index}
                        collection={i}
                        onClickRemoveItem={(i) => console.log(i)}
                      />
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
    </CContainer>
  );
}

export default App;
