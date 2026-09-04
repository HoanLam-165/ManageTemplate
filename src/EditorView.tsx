import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DocumentContent } from "./App";
import { SharedWorkspace } from "./editor/SharedWorkspace";

interface EditorViewProps {
  documentId: number;
  onClose: () => void;
}

export function EditorView({ documentId, onClose }: EditorViewProps) {
  const [docName, setDocName] = useState("");
  const [content, setContent] = useState<DocumentContent | null>(null);
  const lastSavedStateRef = useRef<string>("");

  useEffect(() => {
    async function loadDocument() {
      const docs: any[] = await invoke("get_documents");
      const doc = docs.find((d) => Number(d.id) === Number(documentId));
      if (doc) {
        setDocName(doc.name);
        const parsedContent = JSON.parse(doc.metadata);
        setContent(parsedContent);
        lastSavedStateRef.current = JSON.stringify({ name: doc.name, content: parsedContent });
      }
    }
    loadDocument();
  }, [documentId]);

  const handleSave = async (): Promise<boolean> => {
    if (!content) return false;
    await invoke("update_document", { id: documentId, name: docName, metadata: JSON.stringify(content) });
    lastSavedStateRef.current = JSON.stringify({ name: docName, content: content });
    return true;
  };

  if (!content) return <div>Loading...</div>;

  return (
    <SharedWorkspace
      mode="document"
      name={docName}
      setName={setDocName}
      content={content}
      setContent={(update) => setContent(prev => prev ? (typeof update === 'function' ? (update as (prevState: DocumentContent) => DocumentContent)(prev) : update) : null)}
      onSave={handleSave}
      onClose={onClose}
      lastSavedStateRef={lastSavedStateRef}
    />
  );
}
