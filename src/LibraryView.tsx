import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Template, Document } from "./App";
import { EditorView } from "./EditorView";
import { TemplateEditor } from "./TemplateEditor";
import { exportToPdf } from "./editor/pdfExporter";
import { useToast } from "./components/Toast";

interface LibraryViewProps {
  onLogout: () => void;
}

export function LibraryView({ onLogout }: LibraryViewProps) {
  const { showToast, ToastComponent } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeTab, setActiveTab] = useState<"templates" | "documents">("templates");
  const [editingDocId, setEditingDocId] = useState<number | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null | undefined>(null);

  const handleExportPdf = async (d: any) => {
    showToast("Đang khởi tạo và xuất PDF...", "loading");
    try {
      await exportToPdf(JSON.parse(d.metadata), d.name);
      showToast("Xuất PDF thành công!", "success");
    } catch (err) {
      showToast("Xuất PDF thất bại!", "error");
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    if (activeTab === "templates") {
      setTemplates(await invoke("get_templates"));
    } else {
      setDocuments(await invoke("get_documents"));
    }
  }

  async function useTemplate(templateId: number) {
    const name = prompt("Document name:");
    if (name) {
      await invoke("create_document", { name, templateId });
      setActiveTab("documents");
      loadData();
    }
  }

  async function handleDelete(type: "template" | "document", id: number) {
    if (window.confirm(`Are you sure you want to delete this ${type}?`)) {
      await invoke(type === "template" ? "delete_template" : "delete_document", { id });
      loadData();
    }
  }

  if (editingDocId !== null) {
    return <EditorView documentId={editingDocId} onClose={() => setEditingDocId(null)} />;
  }

  if (editingTemplateId !== null) {
    return <TemplateEditor templateId={editingTemplateId === undefined ? undefined : editingTemplateId} onClose={() => { setEditingTemplateId(null); loadData(); }} />;
  }

  return (
    <div className="container">
      <button onClick={onLogout}>Logout</button>
      <div>
        <button onClick={() => setActiveTab("templates")}>Templates</button>
        <button onClick={() => setActiveTab("documents")}>Documents</button>
      </div>

      {activeTab === "templates" ? (
        <div>
          <h2>Templates <button onClick={() => setEditingTemplateId(undefined)}>+</button></h2>
          {templates.map((t: any) => (
            <div key={t.id}>
              {t.name} 
              <button onClick={() => useTemplate(t.id)}>Use</button>
              <button onClick={() => setEditingTemplateId(t.id)}>Edit</button>
              <button style={{color: "red"}} onClick={() => handleDelete("template", t.id)}>Delete</button>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <h2>Documents</h2>
          {documents.map((d: any) => (
            <div key={d.id}>
              {d.name} 
              <button onClick={() => setEditingDocId(d.id)}>Edit</button>
              <button style={{color: "red"}} onClick={() => handleDelete("document", d.id)}>Delete</button>
              <button onClick={() => handleExportPdf(d)}>PDF</button>
            </div>
          ))}
        </div>
      )}
      {ToastComponent}
    </div>
  );
}
