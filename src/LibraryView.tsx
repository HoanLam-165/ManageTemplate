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
  const [searchTerm, setSearchTerm] = useState("");
  const [editingDocId, setEditingDocId] = useState<number | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | "new" | null>(null);

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

  const filteredData = (activeTab === "templates" ? templates : documents).filter((item: any) => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (editingDocId !== null) {
    return <EditorView documentId={editingDocId} onClose={() => { setEditingDocId(null); loadData(); }} />;
  }

  if (editingTemplate !== null) {
    return (
      <TemplateEditor
        initialTemplate={editingTemplate === "new" ? undefined : editingTemplate}
        onClose={() => { setEditingTemplate(null); loadData(); }}
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <nav style={{ height: "60px", backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px" }}>
        <div style={{ fontWeight: "bold", fontSize: "18px" }}>📑 Template Workspace</div>
        <div style={{ display: "flex", gap: "4px", backgroundColor: "#f1f5f9", padding: "4px", borderRadius: "8px" }}>
          <button style={{ padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer", backgroundColor: activeTab === "templates" ? "#ffffff" : "transparent", boxShadow: activeTab === "templates" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }} onClick={() => setActiveTab("templates")}>Templates</button>
          <button style={{ padding: "8px 16px", borderRadius: "6px", border: "none", cursor: "pointer", backgroundColor: activeTab === "documents" ? "#ffffff" : "transparent", boxShadow: activeTab === "documents" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }} onClick={() => setActiveTab("documents")}>Documents</button>
        </div>
        <button style={{ background: "none", border: "1px solid #e2e8f0", color: "#64748b", padding: "6px 12px", borderRadius: "6px", cursor: "pointer" }} onClick={onLogout}>Logout</button>
      </nav>

      <div style={{ padding: "24px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0" }}>{activeTab === "templates" ? "Templates" : "Documents"}</h2>
          <div style={{ display: "flex", gap: "12px" }}>
            <input style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }} placeholder="Tìm kiếm..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            {activeTab === "templates" && <button style={{ padding: "8px 16px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }} onClick={() => setEditingTemplate("new")}>+ Tạo Template mới</button>}
          </div>
        </div>

        {filteredData.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px", border: "2px dashed #e2e8f0", borderRadius: "12px", color: "#64748b" }}>Chưa có tài liệu nào. Bắt đầu bằng cách tạo mới!</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px" }}>
            {filteredData.map((item: any) => (
              <div key={item.id} style={{ backgroundColor: "#ffffff", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", justifyContent: "space-between", transition: "border 0.2s, box-shadow 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.border = "1px solid #3b82f6"; e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.1)"; }} onMouseLeave={(e) => { e.currentTarget.style.border = "1px solid #e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "15px", fontWeight: "600", marginBottom: "4px" }}>{item.name}</div>
                  <div style={{ fontSize: "13px", color: "#64748b" }}>{item.description || "Không có mô tả"}</div>
                </div>
                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "12px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                  {activeTab === "templates" ? (
                    <>
                      <button style={{ padding: "6px 12px", fontSize: "12px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }} onClick={() => useTemplate(item.id)}>Dùng</button>
                      <button style={{ padding: "6px 12px", fontSize: "12px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", cursor: "pointer" }} onClick={() => setEditingTemplate(item)}>Sửa</button>
                      <button style={{ padding: "6px 12px", fontSize: "12px", backgroundColor: "#fef2f2", color: "#dc2626", border: "none", borderRadius: "6px", cursor: "pointer" }} onClick={() => handleDelete("template", item.id)}>Xóa</button>
                    </>
                  ) : (
                    <>
                      <button style={{ padding: "6px 12px", fontSize: "12px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", cursor: "pointer" }} onClick={() => setEditingDocId(item.id)}>Sửa</button>
                      <button style={{ padding: "6px 12px", fontSize: "12px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", cursor: "pointer" }} onClick={() => handleExportPdf(item)}>PDF</button>
                      <button style={{ padding: "6px 12px", fontSize: "12px", backgroundColor: "#fef2f2", color: "#dc2626", border: "none", borderRadius: "6px", cursor: "pointer" }} onClick={() => handleDelete("document", item.id)}>Xóa</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {ToastComponent}
    </div>
  );
}
