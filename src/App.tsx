import { useState, useCallback, useMemo } from "react";
import { DocumentItem, ProcessStatus, LogMessage } from "./types"; // Import custom types for document and file items
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
import SystemLog from "./components/SystemLog";

// Define a new interface that extends DocumentItem with an additional status field
interface ProcessableDoc extends DocumentItem {
  status: ProcessStatus;
}

function App() {
  const [files, setFiles] = useState<DocumentItem[]>([]); // State to hold the list of files
  const [isLoading, setIsLoading] = useState(false); // State to indicate if the app is currently loading
  const [outputPath, setOutputPath] = useState(""); // State to store the selected output path for saving files
  const [processingFileNo, setProcessingFileNo] = useState<number | null>(null); // Index of the file being processed
  const [processedFiles, setProcessedFiles] = useState<string[]>([]); // List of paths to files that have been successfully processed
  const [failedFiles, setFailedFiles] = useState<string[]>([]); // List of paths to files that failed processing
  const [systemLogs, setSystemLog] = useState<LogMessage[]>([]);

  const addSystemLog = (
    message: string,
    type: "info" | "warning" | "error"
  ) => {
    setSystemLog((i) =>
      _.concat(i, {
        message: message,
        timestamp: new Date(),
        msgStatus: type,
      })
    );
  };

  // Calculate the conversion progress as a percentage based on the number of files processed
  const convertProgress = useMemo(() => {
    const finishedTasks = processingFileNo || 0;
    const totalTasks = files.length;

    return finishedTasks > 0 ? (finishedTasks / totalTasks) * 100 : 0;
  }, [processingFileNo, files]);

  // Map the files array to include a status field indicating whether each file is loaded, processing, finished, or failed
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

  // Opens a dialog for selecting the save path and updates the outputPath state
  const onClickSelectSavePath = () => {
    setIsLoading(true); // Show loading effect

    const _saveFiles = async () => {
      const selected = await helpers.openSelectDir(); // Use helper function to open directory selection dialog

      if (!selected) {
        throw new Error("User did not select a folder"); // Throw an error if no folder is selected
      }

      return selected;
    };

    _saveFiles()
      .then((i) => {
        setOutputPath(i); // Update outputPath state with the selected directory path
      })
      .catch((err) => {
        addSystemLog(err.message, "error");
      })
      .finally(() => {
        setIsLoading(false); // Hide loading effect after dialog closes
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
        throw new Error("User did not select a folder"); // Throw an error if no folder is selected
      }

      const filePromises = selected.map(async (path) => {
        return await helpers.processPath(path); // Process each selected directory and get file items
      });

      const fileItems = (await Promise.all(filePromises)).flat();
      return fileItems;
    };

    _addFiles()
      .then((i) => {
        // Filter out duplicate files before adding to the list
        const newFiles = i.filter((j) => {
          return !helpers.listContainsDocument(files, j);
        });

        setFiles((oldFiles) => _.concat(oldFiles, newFiles)); // Append new files to the existing files state
        addSystemLog(`Added ${newFiles.length} new files`, "info");
      })
      .catch((err) => {
        addSystemLog(err.message, "error");
      })
      .finally(() => {
        setIsLoading(false); // Hide loading effect after file processing is complete
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

          setProcessingFileNo(i); // Update the index of the current file being processed

          try {
            await helpers.convertToPdfSidecar(
              file.collectionName,
              file.basePath,
              outputPath
            ); // Convert each collection to a PDF using helper function
          } catch (e: any) {
            setFailedFiles((old) => _.concat(old, [file.basePath])); // Add the failed file path to the failed files list

            addSystemLog(e.message, "error");
            continue;
          }
          setProcessedFiles((old) => _.concat(old, file.basePath)); // Add the successfully processed file path to the processed files list
          addSystemLog(
            `Converted ${file.collectionName} into a PDF file`,
            "info"
          );
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
      .catch((err) => {
        addSystemLog(err.message, "error");
      })
      .finally(() => {
        setIsLoading(false); // Hide loading effect after processing is complete
        setProcessingFileNo(null); // Reset the index of the current file being processed
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
      <CRow style={{ height: "90vh" }}>
        <CCol className="left-panel">
          <CCard
            style={{
              height: "100%",
              width: "100%",
              display: "flex",
              flexDirection: "column",
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
                {files.length > 0 && (
                  <small>Loaded {files.length} collections</small>
                )}
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
                    <CInputGroupText
                      style={{
                        maxWidth: "100%",
                        overflowY: "auto",
                      }}
                    >
                      {outputPath}
                    </CInputGroupText>
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
                {/* todo: add cancel button */}
              </CListGroupItem>
              <CListGroupItem>
                <h2>Progress</h2>
                <small>Converted {processedFiles.length} files</small>
                <br />
                {failedFiles.length > 0 && (
                  <small>Failed to convert {failedFiles.length} files</small>
                )}

                <CProgress value={convertProgress} />
              </CListGroupItem>
              <CListGroupItem
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "stretch",
                }}
              >
                <h2>Program Log</h2>

                <SystemLog logs={systemLogs} />
              </CListGroupItem>
            </CListGroup>
          </CCard>
        </CCol>
        <CCol
          className="right-panel"
          style={{
            height: "90vh",
            overflowX: "hidden",
            overflowY: "auto",
          }}
        >
          {/* Display processed files and collections */}
          <div>
            {files.length > 0 ? (
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
