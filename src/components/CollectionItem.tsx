import { DocumentItem } from "../types";
import {
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCollapse,
  CContainer,
  CListGroup,
  CListGroupItem,
  CRow,
  CSpinner,
} from "@coreui/react";
import CIcon from "@coreui/icons-react";
import { cilTrash } from "@coreui/icons";
import { useState, useMemo } from "react";

type ProcessStatus = "Loaded" | "Processing" | "Finished";

type CollectionItemProps = {
  collection: DocumentItem;
  processStatus: ProcessStatus;
  isProcessing?: boolean;
  onClickRemoveItem?: (item: DocumentItem) => void;
};

const CollectionItem: React.FC<CollectionItemProps> = (props) => {
  const [isItemOpen, setIsItemOpen] = useState(false);

  const statusColor = useMemo(() => {
    switch (props.processStatus) {
      case "Finished":
        return "success";
      case "Loaded":
        return "primary";
      case "Processing":
        return "warning";
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
          {props.isProcessing && <CSpinner variant="grow" className="m-1" />}
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
            {/* <CButton
              color="danger"
              shape="rounded-pill"
              onClick={() => {
                props.onClickRemoveItem &&
                  props.onClickRemoveItem(props.collection);
              }}
            >
              <CIcon icon={cilTrash} size="xl" />
            </CButton> */}
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
