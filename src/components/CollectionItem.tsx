import { DocumentItem, ProcessStatus } from "../types";
import {
  CBadge,
  CCollapse,
  CContainer,
  CListGroup,
  CListGroupItem,
  CRow,
  CSpinner,
} from "@coreui/react";
import { useState, useMemo } from "react";

type CollectionItemProps = {
  collection: DocumentItem;
  processStatus: ProcessStatus;
};

const CollectionItem: React.FC<CollectionItemProps> = (props) => {
  const [isItemOpen, setIsItemOpen] = useState(false);

  const isProcessing = useMemo(() => {
    return props.processStatus === "Processing";
  }, [props.processStatus]);

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

  return (
    <CListGroupItem
      as="button"
      disabled={props.processStatus === "Processing"}
      color={statusColor}
      onClick={() =>
        props.collection.content.length > 0 && setIsItemOpen(!isItemOpen)
      }
    >
      <CContainer>
        <CRow>
          {isProcessing && <CSpinner variant="grow" className="m-1" />}
          <h4>{props.collection.collectionName}</h4>
        </CRow>
        <CRow>
          <small>{props.collection.basePath}</small>
        </CRow>
        <CRow>
          <div className="d-grid gap-2 d-md-flex justify-content-md-end">
            {props.collection.isArchive ? (
              <CBadge color="secondary">Archive</CBadge>
            ) : (
              <CBadge color="primary">Folder</CBadge>
            )}

            <small>{props.collection.content.length} Pages</small>
          </div>
        </CRow>
        {props.collection.content.length > 0 && (
          <CCollapse visible={isItemOpen}>
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
                  <CListGroupItem key={crypto.randomUUID()}>
                    {i.name}
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

export default CollectionItem;
