import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen } from "@tauri-apps/api/event";
import { LogOut, Layers } from "lucide-react";
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

  const userTemplatesCount = templates.filter(t => !t.is_system).length;
  const quota = 3;
  const isQuotaReached = userTemplatesCount >= quota;

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

  const openAppWindow = async (mode: "template" | "document", id: string | number, title: string) => {
    showToast(`Đang mở: ${title}...`, "loading");
    try {
      const windowLabel = `editor-${mode}-${id}`;
      const existingWin = await WebviewWindow.getByLabel(windowLabel);
      if (existingWin) {
        await existingWin.setFocus();
        showToast("Đã chuyển sang cửa sổ đang mở!", "success");
        return;
      }

      const win = new WebviewWindow(windowLabel, {
        url: `/#/editor?mode=${mode}&id=${id}`,
        title: title,
        width: 1280,
        height: 800,
        minWidth: 960,
        minHeight: 640,
      });

      win.once("tauri://created", () => {
        showToast("Đã mở cửa sổ thành công!", "success");
      });
    } catch (err) {
      console.error("Open Window Exception:", err);
      showToast(`Lỗi hệ thống: ${String(err)}`, "error");
    }
  };

  const handleCreateNewTemplate = () => {
    if (isQuotaReached) {
        showToast("Đã đạt giới hạn 3 template!", "error");
        return;
    }
    openAppWindow("template", "new", "Tạo Template Mới");
  };

  async function handleDelete(type: "template" | "document", id: number) {
    if (confirm(`Bạn có chắc chắn muốn xóa ${type === "template" ? "template" : "tài liệu"} này không?`)) {
        await invoke(type === "template" ? "delete_template" : "delete_document", { id });
        loadData();
    }
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fafafa" }}>
      <nav style={{ height: "64px", backgroundColor: "#ffffff", borderBottom: "1px solid #e4e4e7", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "600", fontSize: "16px" }}>
          <Layers size={20}/> Template Workspace
        </div>
        <div style={{ display: "flex", gap: "4px", backgroundColor: "#f4f4f5", padding: "4px", borderRadius: "8px" }}>
          <button style={{ padding: "6px 16px", borderRadius: "6px", border: "none", cursor: "pointer", backgroundColor: activeTab === "templates" ? "#ffffff" : "transparent" }} onClick={() => setActiveTab("templates")}>Templates</button>
          <button style={{ padding: "6px 16px", borderRadius: "6px", border: "none", cursor: "pointer", backgroundColor: activeTab === "documents" ? "#ffffff" : "transparent" }} onClick={() => setActiveTab("documents")}>Documents</button>
        </div>
        <button style={{ background: "none", border: "1px solid #e4e4e7", padding: "6px 10px", borderRadius: "6px", cursor: "pointer" }} onClick={onLogout}>
          <LogOut size={14}/> Logout
        </button>
      </nav>

      <div style={{ padding: "32px" }}>
        {activeTab === "templates" && (
          <div style={{ marginBottom: "20px", padding: "16px", backgroundColor: "#f4f4f5", borderRadius: "8px" }}>
              <div style={{ fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>
                  Custom Templates: {userTemplatesCount}/{quota} used
              </div>
              <div style={{ height: "8px", backgroundColor: "#e4e4e7", borderRadius: "4px" }}>
                  <div style={{ height: "100%", width: `${(userTemplatesCount / quota) * 100}%`, backgroundColor: isQuotaReached ? "#dc2626" : "#18181b" }}></div>
              </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
            {activeTab === "templates" && (
                <div style={{ backgroundColor: "#ffffff", padding: "20px", borderRadius: "10px", border: "1px solid #e4e4e7" }}>
                    <div style={{ fontSize: "15px", fontWeight: "600" }}>Blank Template</div>
                    <div style={{ fontSize: "13px", color: "#71717a", marginBottom: "12px" }}>Trang trắng</div>
                    <button 
                        style={{ padding: "6px 12px", borderRadius: "6px", border: "none", cursor: isQuotaReached ? "not-allowed" : "pointer", backgroundColor: isQuotaReached ? "#a1a1aa" : "#18181b", color: "white" }}
                        onClick={() => isQuotaReached ? showToast("Đã đạt giới hạn 3 template!", "error") : handleCreateNewTemplate()}
                    >
                        Create New
                    </button>
                </div>
            )}
            {(activeTab === "templates" ? templates : documents).map((item: any) => (
                <div key={item.id} style={{ backgroundColor: "#ffffff", padding: "20px", borderRadius: "10px", border: "1px solid #e4e4e7" }}>
                    <div style={{ fontSize: "15px", fontWeight: "600" }}>{item.name}</div>
                    <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                        {activeTab === "templates" ? (
                            <>
                            <button onClick={() => {
                                const templateId = item.id;
                                const windowLabel = `doc-${Date.now()}`;
                                const url = `/#/editor?mode=document&id=new&templateId=${templateId}`;
                                
                                showToast(`Đang mở document từ template...`, "loading");
                                try {
                                    const win = new WebviewWindow(windowLabel, {
                                        url: url,
                                        title: `Document: ${item.name}`,
                                        width: 1280,
                                        height: 800,
                                        minWidth: 960,
                                        minHeight: 640,
                                    });
                                    win.once("tauri://created", () => {
                                        showToast("Đã mở cửa sổ thành công!", "success");
                                    });
                                } catch (err) {
                                    console.error("Open Window Exception:", err);
                                    showToast(`Lỗi hệ thống: ${String(err)}`, "error");
                                }
                            }}>Use</button>
                            <button onClick={() => openAppWindow("template", item.id, item.name)}>Edit</button>
                            <button onClick={() => handleDelete("template", item.id)}>Delete</button>
                            </>
                        ) : (
                            <>
                            <button onClick={() => openAppWindow("document", item.id, item.name)}>Open</button>
                            <button onClick={() => handleExportPdf(item)}>Export</button>
                            <button onClick={() => handleDelete("document", item.id)}>Delete</button>
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
      </div>
      {ToastComponent}
    </div>
  );
}
