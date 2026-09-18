import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DocumentContent } from "./App";
import { SharedWorkspace } from "./editor/SharedWorkspace";
import { useDocumentStore } from "./store/documentStore";

interface EditorViewProps {
  documentId: number;
  onClose: () => void;
}

export function EditorView({ documentId, onClose }: EditorViewProps) {
  const [content, setContent] = useState<DocumentContent | null>(null);
  const lastSavedStateRef = useRef<string>("");

  useEffect(() => {
    async function loadDocument() {
      const docs: any[] = await invoke("get_documents");
      const doc = docs.find((d) => Number(d.id) === Number(documentId));
      if (doc) {
        const parsedContent = JSON.parse(doc.metadata);
        setContent(parsedContent);
        useDocumentStore.getState().setName(doc.name);
        useDocumentStore.getState().setContent(parsedContent);
        lastSavedStateRef.current = JSON.stringify({ name: doc.name, content: parsedContent });
      }
    }
    loadDocument();
  }, [documentId]);

  const handleSave = async (): Promise<boolean> => {
    const { name, content } = useDocumentStore.getState();
    await invoke("save_document", { 
        id: documentId, 
        name: name, 
        metadata: JSON.stringify(content),
        template_id: null
    });
    lastSavedStateRef.current = JSON.stringify({ name: name, content: content });
    return true;
  };

  if (!content) return <div>Loading...</div>;

  return (
    <SharedWorkspace
      onSave={handleSave}
      onClose={onClose}
      lastSavedStateRef={lastSavedStateRef}
    />
  );
}
