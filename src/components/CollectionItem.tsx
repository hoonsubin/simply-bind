import { DocumentItem, ProcessStatus } from "../types"; // Importing necessary types for the component
import {
  CBadge,
  CCollapse,
  CContainer,
  CListGroup,
  CListGroupItem,
  CRow,
  CSpinner,
} from "@coreui/react"; // Importing components from @coreui/react library
import { useState, useMemo } from "react"; // Importing React hooks: useState and useMemo
import { open } from "@tauri-apps/plugin-shell"; // Importing the 'open' function from @tauri-apps/plugin-shell

// Defining the props that CollectionItem component will accept
type CollectionItemProps = {
  collection: DocumentItem; // A DocumentItem object representing the collection
  processStatus: ProcessStatus; // The current status of the processing, can be "Finished", "Loaded", "Processing", or "Failed"
};

// Defining the CollectionItem component as a React Functional Component (FC)
const CollectionItem: React.FC<CollectionItemProps> = (props) => {
  // State to manage whether the item is open or collapsed
  const [isItemOpen, setIsItemOpen] = useState(false);

  // Memoized value to determine if the collection is currently processing
  const isProcessing = useMemo(() => {
    return props.processStatus === "Processing";
  }, [props.processStatus]);

  // Memoized value to determine the color of the status badge based on processStatus
  const statusColor = useMemo(() => {
    switch (props.processStatus) {
      case "Finished":
        return "success";
      case "Loaded":
        return "info";
      case "Processing":
        return "warning";
      case "Failed":
        return "danger";
    }
  }, [props.processStatus]);

  // Function to open an image file in the default application
  const onClickOpenImage = async (filePath: string) => {
    try {
      await open(filePath); // Using the 'open' function from @tauri-apps/plugin-shell to open the file
    } catch (e) {
      console.error(e); // Logging any errors that occur during opening the file
    }
  };

  // Rendering the CollectionItem component
  return (
    <CListGroupItem
      as="button" // The CListGroupItem will act as a button
      disabled={props.processStatus === "Processing"} // Disabling the item if it is currently processing
      color={statusColor} // Applying the appropriate status color based on processStatus
      onClick={() =>
        props.collection.content.length > 0 && setIsItemOpen(!isItemOpen)
      } // Toggling the open state when the button is clicked, only if there are items in the collection
    >
      <CContainer>
        <CRow>
          {isProcessing && <CSpinner variant="grow" className="m-1" />} // Showing a spinner if the item is processing
          <h4>{props.collection.collectionName}</h4> {/* Displaying the name of the collection */}
        </CRow>
        <CRow>
          <small>{props.collection.basePath}</small> {/* Displaying the base path of the collection */}
        </CRow>
        <CRow>
          <div className="d-grid gap-2 d-md-flex justify-content-md-end">
            {props.collection.isArchive ? (
              <CBadge color="secondary">Archive</CBadge> // Badge indicating if it's an archive
            ) : (
              <CBadge color="primary">Folder</CBadge> // Badge indicating if it's a folder
            )}

            <small>{props.collection.content.length} Pages</small> {/* Displaying the number of pages in the collection */}
          </div>
        </CRow>
        {props.collection.content.length > 0 && (
          <CCollapse visible={isItemOpen}> // Collapsible section containing items of the collection
            <CListGroup
              className="mt-3"
              style={{
                height: "14rem",
                overflowY: "auto",
                overflowX: "hidden",
              }}
            >
              {props.collection.content.map((i) => {
                return (
                  <CListGroupItem
                    as="button" // Each item will act as a button
                    onClick={() => {
                      if (!props.collection.isArchive)
                        onClickOpenImage(i.path); // Opening the image in default application when clicked, but not for archives
                    }}
                    key={i.path}
                  >
                    {i.name} {/* Displaying the name of the item */}
                  </CListGroupItem>
                );
              })}
            </CListGroup>
          </CCollapse>
        )}
      </CContainer>
    </CListGroupItem>
  );
};

export default CollectionItem; // Exporting the CollectionItem component as the default export
