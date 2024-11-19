import React, { useEffect, useRef } from "react";
import { CCard, CCardBody } from "@coreui/react";
import { LogMessage } from "../types";

interface SystemLogProps {
  logs: LogMessage[];
}

const SystemLog: React.FC<SystemLogProps> = ({ logs }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when new logs are added
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
        height: "100%",
      }}
    >
      <CCardBody
          ref={logContainerRef}
          style={{
            whiteSpace: "pre-wrap", // to preserve whitespace and line breaks
            height: "100%",
          }}
        >
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <div
                style={{
                  overflowX: "hidden",
                  overflowY: "auto",
                }}
                key={index}
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
