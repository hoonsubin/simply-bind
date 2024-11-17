import { useState, useCallback, useMemo } from "react";
import { DocumentItem, ProcessStatus } from "./types"; // Import custom types for document and file items
import {
  CButton,
  CCard,
  CCol,
  CContainer,
  CInputGroup,
  CInputGroupText,
  CListGroup,
  CListGroupItem,
  CProgress,
  CRow,
} from "@coreui/react"; // Import CoreUI components
import { open } from "@tauri-apps/plugin-dialog"; // Dialog plugin for opening file/folder selectors
import * as helpers from "./helpers"; // Custom helper functions
import _ from "lodash"; // Utility library
import "@coreui/coreui/dist/css/coreui.min.css"; // Import CoreUI CSS
import CollectionItem from "./components/CollectionItem";

interface ProcessableDoc extends DocumentItem {
  status: ProcessStatus;
}

function App() {
  const [files, setFiles] = useState<DocumentItem[]>([]); // State to hold the list of processed files
  const [isLoading, setIsLoading] = useState(false); // State to indicate if the app is currently loading
  const [outputPath, setOutputPath] = useState("");
  const [processingFileNo, setProcessingFileNo] = useState<number | null>(null);
  const [processedFiles, setProcessedFiles] = useState<string[]>([]);
  const [failedFiles, setFailedFiles] = useState<string[]>([]);

  const convertProgress = useMemo(() => {
    const finishedTasks = processingFileNo || 0;
    const totalTasks = files.length;

    return finishedTasks > 0 ? (finishedTasks / totalTasks) * 100 : 0;
  }, [processingFileNo, files]);

  const processableDocs = useMemo(() => {
    return _.map(files, (file, index) => {
      let status: ProcessStatus = "Loaded";

      if (processingFileNo === index) {
        status = "Processing";
      } else if (_.includes(processedFiles, file.basePath)) {
        status = "Finished";
      } else if (_.includes(failedFiles, file.basePath)) {
        status = "Failed";
      }

      return {
        ...file,
        status,
      } as ProcessableDoc;
    });
  }, [files, processingFileNo, failedFiles, processedFiles]);

  const onClickSelectSavePath = () => {
    setIsLoading(true);
    const _saveFiles = async () => {
      const selected = await helpers.openSelectDir();

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
        // todo: append new files to the list instead of completely replacing it
        const newFiles = i.filter((j) => {
          return !helpers.listContainsDocument(files, j);
        });
        
        setFiles(oldFiles => _.concat(oldFiles, newFiles)); // Update the files state with processed items
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  /**
   * Converts the selected document collections into PDFs.
   */
  const onClickConvertAll = useCallback(() => {
    setIsLoading(true);

    const _exportPdf = async () => {
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          // Skip already converted files
          if (processableDocs[i].status === "Finished") {
            continue;
          }

          setProcessingFileNo(i);

          try {
            await helpers.convertToPdfSidecar(
              file.collectionName,
              file.basePath,
              outputPath
            ); // Convert each collection to a PDF
          } catch (e) {
            console.error(e);
            setFailedFiles(old => _.concat(old, [file.basePath]));
            continue;
          }
          setProcessedFiles(old => _.concat(old, file.basePath));

          console.log({
            processedFiles,
            failedFiles,
            processableDocs,
          });
        }
      }
    };

    _exportPdf()
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setIsLoading(false); // Hide loading effect after processing is complete
        setProcessingFileNo(null);
      });
  }, [files, failedFiles, processedFiles, processableDocs, outputPath]);

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
                  Add Collections
                </CButton>
              </CListGroupItem>
              <CListGroupItem className="d-grid gap-2">
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
                  onClick={onClickConvertAll}
                  size="lg"
                >
                  Convert
                </CButton>
              </CListGroupItem>
              <CListGroupItem>
                <h1>Progress</h1>
                <CProgress value={convertProgress} />
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
                  {processableDocs.map((i, index) => {
                    return (
                      <CollectionItem
                        key={index}
                        collection={i}
                        processStatus={i.status}
                      />
                    );
                  })}
                </CListGroup>
              </>
            ) : (
              <CContainer
                style={{
                  height: "100%",
                }}
              >
                <CCard
                  style={{
                    height: "100%",
                  }}
                >
                  <h1>No Items</h1>
                </CCard>
              </CContainer>
            )}
          </div>
        </CCol>
      </CRow>
    </CContainer>
  );
}

export default App;
