import React, { useEffect, useRef } from "react";
import { CCard, CCardBody } from "@coreui/react";
import { LogMessage } from "../types";

interface SystemLogProps {
  logs: LogMessage[];
}

const SystemLog: React.FC<SystemLogProps> = ({ logs }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <CCard
      style={{
        color: "black",
        width: "100%",
        height: "340px", // Fixed height for the log container
        minHeight: "200px",
      }}
    >
      <CCardBody
        ref={logContainerRef}
        style={{
          whiteSpace: "pre-wrap",
          height: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          padding: "10px"
        }}
      >
        {logs.length > 0 ? (
          logs.map((log, index) => (
            <div
              key={index}
              style={{
                marginBottom: "8px"
              }}
            >
              <small>{log.timestamp.toDateString()}</small>
              <div color={log.msgStatus}>{log.message}</div>
            </div>
          ))
        ) : (
          <div>No messages</div>
        )}
      </CCardBody>
    </CCard>
  );
};

export default SystemLog;
