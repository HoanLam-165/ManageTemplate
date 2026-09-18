import { useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { SharedWorkspace } from "./editor/SharedWorkspace";
import { useToast } from "./components/Toast";
import { useDocumentStore } from "./store/documentStore";

interface TemplateEditorProps {
  initialTemplate?: any;
  onClose: () => void;
}

export function TemplateEditor({ initialTemplate, onClose }: TemplateEditorProps) {
  const { showToast } = useToast();
  const lastSavedStateRef = useRef<string>(JSON.stringify({ name: initialTemplate?.name || "New Template", description: initialTemplate?.description || "", content: initialTemplate?.metadata ? JSON.parse(initialTemplate.metadata) : { schema_version: "1.0", page: { width_mm: 210, height_mm: 297, margin_left_mm: 20, margin_right_mm: 20, margin_top_mm: 20, margin_bottom_mm: 20 }, elements: [] } }));

  useEffect(() => {
    useDocumentStore.getState().setName(initialTemplate?.name || "New Template");
    useDocumentStore.getState().setDescription(initialTemplate?.description || "");
    if (initialTemplate?.metadata) {
      useDocumentStore.getState().setContent(JSON.parse(initialTemplate.metadata));
    }
  }, [initialTemplate]);

  const handleSave = async (): Promise<boolean> => {
    const { name, description, content } = useDocumentStore.getState();
    await invoke("save_template", { 
        id: initialTemplate?.id || null, 
        name, 
        description, 
        metadata: JSON.stringify(content) 
    });
    showToast(initialTemplate?.id ? "Đã lưu template" : "Đã tạo template", "success");
    return true;
  };

  const handleSaveAsNew = async () => {
    const { name, description, content } = useDocumentStore.getState();
      await invoke("create_template", { name: name + " (Copy)", description, metadata: JSON.stringify(content) });
      showToast("Đã lưu bản sao", "success");
  };

  return (
    <SharedWorkspace
      onSave={handleSave}
      onSaveAsNew={handleSaveAsNew}
      onClose={onClose}
      lastSavedStateRef={lastSavedStateRef}
    />
  );
}
