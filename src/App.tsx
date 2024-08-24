import FileUpload from "./components/FileUpload";
import CollectionList from "./components/CollectionList";
import { useState } from "react";
import { DocumentItem } from "./types";

import '@coreui/coreui/dist/css/coreui.min.css'

function App() {
  // async function greet() {
  //   // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
  //   setGreetMsg(await invoke("greet", { name }));
  // }

  const [files, setFiles] = useState<DocumentItem[]>([]);

  return (
    <div className="container">
      <FileUpload onFileSelect={(i) => setFiles(i)} />
      <CollectionList collections={files} />
    </div>
  );
}

export default App;
