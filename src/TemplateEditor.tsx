import { useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DocumentContent } from "./App";
import { SharedWorkspace } from "./editor/SharedWorkspace";
import { useToast } from "./components/Toast";

interface TemplateEditorProps {
  initialTemplate?: any;
  onClose: () => void;
}

export function TemplateEditor({ initialTemplate, onClose }: TemplateEditorProps) {
  const { showToast } = useToast();
  const [name, setName] = useState(initialTemplate?.name || "New Template");
  const [description, setDescription] = useState(initialTemplate?.description || "");
  const [content, setContent] = useState<DocumentContent>(initialTemplate?.metadata ? JSON.parse(initialTemplate.metadata) : { schema_version: "1.0", page: { width_mm: 210, height_mm: 297, margin_left_mm: 20, margin_right_mm: 20, margin_top_mm: 20, margin_bottom_mm: 20 }, elements: [] });
  const lastSavedStateRef = useRef<string>(JSON.stringify({ name, description, content }));

  const handleSave = async (): Promise<boolean> => {
    if (initialTemplate?.id) {
        await invoke("update_template", { id: initialTemplate.id, name, description, metadata: JSON.stringify(content) });
        showToast("Đã lưu template", "success");
    } else {
        await invoke("create_template", { name, description, metadata: JSON.stringify(content) });
        showToast("Đã tạo template", "success");
    }
    return true;
  };

  const handleSaveAsNew = async () => {
      await invoke("create_template", { name: name + " (Copy)", description, metadata: JSON.stringify(content) });
      showToast("Đã lưu bản sao", "success");
  };

  return (
    <SharedWorkspace
      mode="template"
      name={name}
      setName={setName}
      description={description}
      setDescription={setDescription}
      content={content}
      setContent={setContent}
      onSave={handleSave}
      onSaveAsNew={handleSaveAsNew}
      onClose={onClose}
      lastSavedStateRef={lastSavedStateRef}
    />
  );
}
