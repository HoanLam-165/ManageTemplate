import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen } from "@tauri-apps/api/event";
import { Search, Plus, FileText, LayoutTemplate, Trash2, Edit3, Download, LogOut, Layers } from "lucide-react";
import { Template, Document } from "./App";
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
  const [modal, setModal] = useState<{ type: "prompt" | "confirm"; message: string; onConfirm: (val?: string) => void; onCancel: () => void; } | null>(null);
  const [inputValue, setInputValue] = useState("");

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
    const unlisten = listen("item-saved", () => {
      loadData();
    });
    return () => {
      unlisten.then(f => f());
    };
  }, [activeTab]);

  async function loadData() {
    if (activeTab === "templates") {
      setTemplates(await invoke("get_templates"));
    } else {
      setDocuments(await invoke("get_documents"));
    }
  }

  const openAppWindow = async (label: string, path: string, title: string) => {
    showToast(`Đang mở: ${title}...`, "loading");
    try {
      const existingWin = await WebviewWindow.getByLabel(label);
      if (existingWin) {
        await existingWin.setFocus();
        showToast("Đã chuyển sang cửa sổ đang mở!", "success");
        return;
      }

      const win = new WebviewWindow(label, {
        url: path,
        title: title,
        width: 1280,
        height: 800,
        minWidth: 960,
        minHeight: 640,
      });

      win.once("tauri://created", () => {
        showToast("Đã mở cửa sổ thành công!", "success");
      });

      win.once("tauri://error", (e) => {
        console.error("Window Error:", e);
        showToast(`Lỗi tạo cửa sổ: ${JSON.stringify(e)}`, "error");
      });
    } catch (err) {
      console.error("Open Window Exception:", err);
      showToast(`Lỗi hệ thống: ${String(err)}`, "error");
    }
  };

  async function useTemplate(templateId: number) {
    setModal({
      type: "prompt",
      message: "Nhập tên tài liệu mới:",
      onConfirm: async (name) => {
        if (name) {
          const docId = await invoke<number>("create_document", { name, templateId });
          setActiveTab("documents");
          loadData();
          setModal(null);
          openAppWindow(`document-${docId}`, `/#/document/${docId}`, `Document: ${name}`);
        }
      },
      onCancel: () => setModal(null)
    });
  }

  async function handleDelete(type: "template" | "document", id: number) {
    setModal({
      type: "confirm",
      message: `Bạn có chắc chắn muốn xóa ${type === "template" ? "template" : "tài liệu"} này không? Hành động này không thể hoàn tác.`,
      onConfirm: async () => {
        await invoke(type === "template" ? "delete_template" : "delete_document", { id });
        loadData();
        setModal(null);
      },
      onCancel: () => setModal(null)
    });
  }

  const filteredData = (activeTab === "templates" ? templates : documents).filter((item: any) => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fafafa" }}>
      <style>{` .actions { opacity: 0 !important; transition: opacity 0.2s; } .document-card:hover .actions { opacity: 1 !important; } `}</style>
      <nav style={{ height: "64px", backgroundColor: "#ffffff", borderBottom: "1px solid #e4e4e7", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "600", fontSize: "16px", color: "#18181b" }}>
          <Layers size={20}/> Template Workspace
        </div>
        <div style={{ display: "flex", gap: "4px", backgroundColor: "#f4f4f5", padding: "4px", borderRadius: "8px" }}>
          <button style={{ padding: "6px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "500", backgroundColor: activeTab === "templates" ? "#ffffff" : "transparent", color: activeTab === "templates" ? "#18181b" : "#71717a", boxShadow: activeTab === "templates" ? "0 1px 2px rgba(0,0,0,0.05)" : "none", transition: "all 0.2s" }} onClick={() => setActiveTab("templates")}>Templates</button>
          <button style={{ padding: "6px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "500", backgroundColor: activeTab === "documents" ? "#ffffff" : "transparent", color: activeTab === "documents" ? "#18181b" : "#71717a", boxShadow: activeTab === "documents" ? "0 1px 2px rgba(0,0,0,0.05)" : "none", transition: "all 0.2s" }} onClick={() => setActiveTab("documents")}>Documents</button>
        </div>
        <button style={{ background: "none", border: "1px solid #e4e4e7", color: "#71717a", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }} onClick={onLogout}>
          <LogOut size={14}/> Logout
        </button>
      </nav>

      <div style={{ padding: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "600", margin: "0", color: "#18181b" }}>{activeTab === "templates" ? "Templates" : "Documents"}</h2>
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Search color="#a1a1aa" size={16} style={{ position: "absolute", left: "10px" }} />
              <input style={{ padding: "8px 12px 8px 32px", borderRadius: "8px", border: "1px solid #e4e4e7", fontSize: "13px", width: "200px" }} placeholder="Tìm kiếm..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            {activeTab === "templates" && <button style={{ padding: "8px 16px", backgroundColor: "#18181b", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "500", display: "flex", alignItems: "center", gap: "6px" }} onClick={() => openAppWindow("template-new", "/#/template/new", "Tạo Template Mới")}><Plus size={16}/> Tạo mới</button>}
          </div>
        </div>

        {filteredData.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px", border: "1px dashed #e4e4e7", borderRadius: "12px", color: "#71717a", fontSize: "14px" }}>Chưa có tài liệu nào.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
            {filteredData.map((item: any) => (
              <div key={item.id} className="document-card" style={{ backgroundColor: "#ffffff", padding: "20px", borderRadius: "10px", border: "1px solid #e4e4e7", display: "flex", flexDirection: "column", gap: "16px", transition: "border 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#a1a1aa"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e4e4e7"; }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div style={{ fontSize: "15px", fontWeight: "600", color: "#18181b" }}>{item.name}</div>
                  <div style={{ color: "#a1a1aa" }}>{activeTab === "templates" ? <LayoutTemplate size={18}/> : <FileText size={18}/>}</div>
                </div>
                <div style={{ fontSize: "13px", color: "#71717a" }}>{item.description || "Không có mô tả"}</div>
                <div style={{ marginTop: "auto", paddingTop: "12px", display: "flex", justifyContent: "flex-end", gap: "8px", opacity: 0, transition: "opacity 0.2s" }} className="actions">
                  {activeTab === "templates" ? (
                    <>
                      <button style={{ padding: "6px", backgroundColor: "#f4f4f5", border: "none", borderRadius: "6px", cursor: "pointer" }} onClick={() => useTemplate(item.id)} title="Dùng"><FileText size={16}/></button>
                      <button style={{ padding: "6px", backgroundColor: "#f4f4f5", border: "none", borderRadius: "6px", cursor: "pointer" }} onClick={() => openAppWindow(`template-${item.id}`, `/#/template/${item.id}`, `Template: ${item.name}`)} title="Sửa"><Edit3 size={16}/></button>
                      <button style={{ padding: "6px", backgroundColor: "#fef2f2", color: "#dc2626", border: "none", borderRadius: "6px", cursor: "pointer" }} onClick={() => handleDelete("template", item.id)} title="Xóa"><Trash2 size={16}/></button>
                    </>
                  ) : (
                    <>
                      <button style={{ padding: "6px", backgroundColor: "#f4f4f5", border: "none", borderRadius: "6px", cursor: "pointer" }} onClick={() => openAppWindow(`document-${item.id}`, `/#/document/${item.id}`, `Document: ${item.name}`)} title="Sửa"><Edit3 size={16}/></button>
                      <button style={{ padding: "6px", backgroundColor: "#f4f4f5", border: "none", borderRadius: "6px", cursor: "pointer" }} onClick={() => handleExportPdf(item)} title="Xuất PDF"><Download size={16}/></button>
                      <button style={{ padding: "6px", backgroundColor: "#fef2f2", color: "#dc2626", border: "none", borderRadius: "6px", cursor: "pointer" }} onClick={() => handleDelete("document", item.id)} title="Xóa"><Trash2 size={16}/></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", width: "360px", border: "1px solid #e4e4e7" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "15px", fontWeight: 600 }}>{modal.type === "prompt" ? "Tạo tài liệu mới" : "Xác nhận xóa"}</h3>
            <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#71717a" }}>{modal.message}</p>
            {modal.type === "prompt" && (
              <input autoFocus style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #e4e4e7", marginBottom: "20px", fontSize: "13px" }} placeholder="Tên tài liệu..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
            )}
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #e4e4e7", background: "white", cursor: "pointer", fontSize: "13px" }} onClick={modal.onCancel}>Hủy</button>
              <button style={{ padding: "8px 16px", borderRadius: "6px", border: "none", background: modal.type === "confirm" ? "#dc2626" : "#18181b", color: "white", cursor: "pointer", fontSize: "13px" }} onClick={() => modal.onConfirm(inputValue)}>{modal.type === "confirm" ? "Xóa vĩnh viễn" : "Tạo tài liệu"}</button>
            </div>
          </div>
        </div>
      )}
      {ToastComponent}
    </div>
  );
}
