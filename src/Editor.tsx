import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSearchParams } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { emit } from "@tauri-apps/api/event";
import { SharedWorkspace } from "./editor/SharedWorkspace";
import { DocumentContent, Template, Document as DocType } from "./App";
import { useToast } from "./components/Toast";
import { useDocumentStore } from "./store/documentStore";

export function Editor() {
  const [searchParams, setSearchParams] = useSearchParams();
  const id = searchParams.get("id");
  const mode = searchParams.get("mode") as "template" | "document";
  const templateId = searchParams.get("templateId");
  
  // CRITICAL FIX: Extract setters directly from the hook to ensure React reactivity
  const setMode = useDocumentStore(state => state.setMode);
  const setContent = useDocumentStore(state => state.setContent);
  const setName = useDocumentStore(state => state.setName);
  const setDescription = useDocumentStore(state => state.setDescription);
  
  const lastSavedStateRef = useRef<string>("");
  const hasLoadedRef = useRef(false);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    if (hasLoadedRef.current) return;

    async function loadData() {
      setMode(mode);
      if (!id || id === "new") {
        if (templateId) {
          try {
            const item = await invoke<Template>("get_template", { id: Number(templateId) });
            const parsedContent = JSON.parse(item.metadata);
            
            setContent(parsedContent);
            setName(item.name + " - Document");
            setDescription("");
            lastSavedStateRef.current = JSON.stringify({ name: item.name + " - Document", content: parsedContent });
            
            setTimeout(() => useDocumentStore.temporal.getState().clear(), 50);
          } catch (err) {
            console.error("Failed to load template", err);
            showToast("Lỗi tải mẫu template", "error");
          }
        } else {
          const newContent: DocumentContent = {
              schema_version: "1.0",
              page: { width_mm: 210, height_mm: 297, margin_left_mm: 20, margin_right_mm: 20, margin_top_mm: 20, margin_bottom_mm: 20 },
              elements: []
          };
          setContent(newContent);
          setName("New Template");
          setDescription("");
          lastSavedStateRef.current = JSON.stringify({ name: "New Template", content: newContent });
          setTimeout(() => useDocumentStore.temporal.getState().clear(), 50);
        }
        hasLoadedRef.current = true;
        return;
      }

      try {
        const item: Template | DocType = await invoke(mode === "template" ? "get_template" : "get_document", { id: Number(id) });
        setName(item.name);
        const parsedContent = JSON.parse(item.metadata);
        setContent(parsedContent);
        if (mode === "template") setDescription((item as Template).description || "");
        lastSavedStateRef.current = JSON.stringify({ name: item.name, ...(mode === "template" ? { description: (item as Template).description } : {}), content: parsedContent });
        
        setTimeout(() => useDocumentStore.temporal.getState().clear(), 50);
        hasLoadedRef.current = true;
      } catch (err) {
        console.error("Failed to load", err);
        showToast("Lỗi tải dữ liệu", "error");
      }
    }
    loadData();
  }, [id, mode, templateId, setMode, setContent, setName, setDescription]);

  const handleSave = async (): Promise<boolean> => {
    // Read fresh state right before saving
    const currentState = useDocumentStore.getState();
    const currentName = currentState.name;
    const currentDescription = currentState.description || "";
    const currentContent = currentState.content;

    try {
        let newId: any;
        if (mode === "template") {
            newId = await invoke("save_template", { 
                id: id === "new" ? null : Number(id), 
                name: currentName, 
                description: currentDescription, 
                metadata: JSON.stringify(currentContent) 
            });
        } else {
            newId = await invoke("save_document", { 
                id: id === "new" ? null : Number(id), 
                name: currentName, 
                metadata: JSON.stringify(currentContent),
                template_id: templateId ? Number(templateId) : null
            });
        }
        
        lastSavedStateRef.current = JSON.stringify({ name: currentName, ...(mode === "template" ? { description: currentDescription } : {}), content: currentContent });
        await emit("item-saved");

        if (id === "new" && newId) {
            setSearchParams({ mode, id: newId.toString(), ...(templateId ? { templateId } : {}) }, { replace: true });
        }
        
        return true;
    } catch (err: any) {
        showToast("Lỗi lưu dữ liệu: " + String(err), "error");
        return false;
    }
  };

  return (
    <>
      {ToastComponent}
      <SharedWorkspace
        onSave={handleSave}
        onClose={() => getCurrentWindow().close()}
        lastSavedStateRef={lastSavedStateRef}
      />
    </>
  );
}
