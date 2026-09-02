import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { mmToPx, pxToMm } from "./editor/coordinates";
import { Element, DocumentContent } from "./App";
import { exportToPdf } from "./editor/pdfExporter";
import { useToast } from "./components/Toast";

interface EditorViewProps {
  documentId: number;
  onClose: () => void;
}

type HandleType = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

function snapVal(val: number, step: number = 5): number {
  return Math.round(val / step) * step;
}

function ImageElement({ assetId }: { assetId: number }) {
  const [src, setSrc] = useState<string>("");
  useEffect(() => {
    if (assetId) {
      invoke<string>("get_asset_base64", { id: assetId }).then(setSrc).catch(console.error);
    }
  }, [assetId]);
  return src ? (
    <img src={src} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
  ) : (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "#f8fafc", color: "#64748b", fontSize: "12px" }}>
      🖼 Ảnh ({assetId})
    </div>
  );
}

export function EditorView({ documentId, onClose }: EditorViewProps) {
  const { showToast, ToastComponent } = useToast();
  const [content, setContent] = useState<DocumentContent>({
    schema_version: "1.0",
    page: { width_mm: 210, height_mm: 297, margin_left_mm: 20, margin_right_mm: 20, margin_top_mm: 20, margin_bottom_mm: 20 },
    elements: [],
  });
  const [docName, setDocName] = useState<string>("Untitled Document");
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);

  const [dragInfo, setDragInfo] = useState<{ elementId: string; offsetX: number; offsetY: number } | null>(null);
  const [resizeInfo, setResizeInfo] = useState<{
    elementId: string; handle: HandleType; startX: number; startY: number; initX: number; initY: number; initW: number; initH: number;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId: string } | null>(null);
  const [showCloseModal, setShowCloseModal] = useState<boolean>(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceImageElementId = useRef<string | null>(null);

  const contentRef = useRef(content);
  contentRef.current = content;
  const docNameRef = useRef(docName);
  docNameRef.current = docName;
  const selectedIdRef = useRef(selectedElementId);
  selectedIdRef.current = selectedElementId;
  const editingIdRef = useRef(editingElementId);
  editingIdRef.current = editingElementId;
  const snapEnabledRef = useRef(snapEnabled);
  snapEnabledRef.current = snapEnabled;
  const clipboardRef = useRef<Element | null>(null);
  const historyRef = useRef<DocumentContent[]>([]);
  const lastSavedStateRef = useRef<string>("");

  useEffect(() => {
    async function loadDocument() {
      try {
        setLoading(true);
        const docs: any[] = await invoke("get_documents");
        const doc = docs.find((d) => Number(d.id) === Number(documentId));
        if (doc) {
          const initialName = doc.name || "Untitled Document";
          let initialContent = {
            schema_version: "1.0",
            page: { width_mm: 210, height_mm: 297, margin_left_mm: 20, margin_right_mm: 20, margin_top_mm: 20, margin_bottom_mm: 20 },
            elements: [],
          };
          if (doc.metadata) {
            const parsed = JSON.parse(doc.metadata);
            initialContent = {
              schema_version: parsed.schema_version || "1.0",
              page: parsed.page || initialContent.page,
              elements: Array.isArray(parsed.elements) ? parsed.elements : [],
            };
          }
          setDocName(initialName);
          docNameRef.current = initialName;
          setContent(initialContent);
          contentRef.current = initialContent;
          lastSavedStateRef.current = JSON.stringify({ name: initialName, content: initialContent });
        }
      } catch (err) {
        console.error("Lỗi nạp Document:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDocument();
  }, [documentId]);

  const checkIsDirty = (): boolean => {
    const currentState = JSON.stringify({ name: docNameRef.current, content: contentRef.current });
    return lastSavedStateRef.current !== "" && lastSavedStateRef.current !== currentState;
  };

  const handleBack = () => {
    if (checkIsDirty()) {
      setShowCloseModal(true);
    } else {
      onClose();
    }
  };

  const saveSnapshot = () => {
    historyRef.current.push(structuredClone(contentRef.current));
    if (historyRef.current.length > 30) historyRef.current.shift();
  };

  const undo = () => {
    if (historyRef.current.length > 0) {
      const prev = historyRef.current.pop();
      if (prev) {
        setContent(prev);
        setSelectedElementId(null);
        showToast("Đã hoàn tác (Undo)", "success");
      }
    } else {
      showToast("Không còn thao tác để hoàn tác", "error");
    }
  };

  const copySelected = () => {
    if (!selectedIdRef.current) return;
    const target = contentRef.current.elements.find((el) => el.id === selectedIdRef.current);
    if (target) {
      clipboardRef.current = structuredClone(target);
      showToast("📋 Đã sao chép phần tử!", "success");
    }
  };

  const pasteClipboard = () => {
    if (!clipboardRef.current) return;
    saveSnapshot();
    const source = clipboardRef.current;
    const newEl: Element = {
      ...structuredClone(source),
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      position_x_mm: Math.round((source.position_x_mm + 5) * 10) / 10,
      position_y_mm: Math.round((source.position_y_mm + 5) * 10) / 10,
    };
    clipboardRef.current = structuredClone(newEl);
    setContent((prev) => ({ ...prev, elements: [...prev.elements, newEl] }));
    setSelectedElementId(newEl.id);
    showToast("📋 Đã dán phần tử!", "success");
  };

  const saveDocument = async (): Promise<boolean> => {
    try {
      await invoke("update_document", {
        id: documentId,
        name: docNameRef.current,
        metadata: JSON.stringify(contentRef.current),
      });
      lastSavedStateRef.current = JSON.stringify({ name: docNameRef.current, content: contentRef.current });
      showToast("Đã lưu tài liệu thành công!", "success");
      return true;
    } catch (err: any) {
      showToast("Lưu thất bại: " + (err.message || String(err)), "error");
      return false;
    }
  };

  const setOrientation = (orientation: "portrait" | "landscape") => {
    saveSnapshot();
    setContent((prev) => {
      const isLandscape = prev.page.width_mm > prev.page.height_mm;
      if ((orientation === "landscape" && isLandscape) || (orientation === "portrait" && !isLandscape)) {
        return prev;
      }
      return {
        ...prev,
        page: {
          ...prev.page,
          width_mm: prev.page.height_mm,
          height_mm: prev.page.width_mm,
        },
      };
    });
    showToast(orientation === "landscape" ? "Đã chuyển sang khổ Ngang" : "Đã chuyển sang khổ Dọc", "success");
  };

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("pointerdown", closeMenu);

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (isCtrl && key === "s") {
        e.preventDefault();
        saveDocument();
        return;
      }

      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (editingIdRef.current !== null || activeTag === "input" || activeTag === "textarea") {
        return;
      }

      if (isCtrl && key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      if (isCtrl && key === "c") {
        e.preventDefault();
        copySelected();
        return;
      }

      if (isCtrl && key === "v") {
        e.preventDefault();
        pasteClipboard();
        return;
      }

      if (isCtrl && key === "d") {
        e.preventDefault();
        copySelected();
        pasteClipboard();
        return;
      }

      if ((key === "delete" || key === "backspace") && selectedIdRef.current) {
        e.preventDefault();
        saveSnapshot();
        const idToDelete = selectedIdRef.current;
        setContent((prev) => ({ ...prev, elements: prev.elements.filter((el) => el.id !== idToDelete) }));
        setSelectedElementId(null);
        showToast("🗑 Đã xóa phần tử!", "success");
        return;
      }

      if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key) && selectedIdRef.current) {
        e.preventDefault();
        saveSnapshot();
        const step = e.shiftKey ? 5 : 1;
        const idToMove = selectedIdRef.current;
        setContent((prev) => ({
          ...prev,
          elements: prev.elements.map((el) => {
            if (el.id !== idToMove) return el;
            let nx = el.position_x_mm;
            let ny = el.position_y_mm;
            if (key === "arrowup") ny = Math.max(0, ny - step);
            if (key === "arrowdown") ny += step;
            if (key === "arrowleft") nx = Math.max(0, nx - step);
            if (key === "arrowright") nx += step;
            return { ...el, position_x_mm: Math.round(nx * 10) / 10, position_y_mm: Math.round(ny * 10) / 10 };
          }),
        }));
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", closeMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const isAlt = e.altKey;

      if (dragInfo && !resizeInfo) {
        if (scrollContainerRef.current) {
          const sRect = scrollContainerRef.current.getBoundingClientRect();
          const threshold = 60;
          const speed = 12;
          if (e.clientY < sRect.top + threshold) {
            scrollContainerRef.current.scrollTop -= speed;
          } else if (e.clientY > sRect.bottom - threshold) {
            scrollContainerRef.current.scrollTop += speed;
          }
        }

        const curX = pxToMm(e.clientX - rect.left);
        const curY = pxToMm(e.clientY - rect.top);
        let newX = Math.max(0, curX - dragInfo.offsetX);
        let newY = Math.max(0, curY - dragInfo.offsetY);

        if (snapEnabledRef.current && !isAlt) {
          newX = snapVal(newX, 5);
          newY = snapVal(newY, 5);
        } else {
          newX = Math.round(newX * 10) / 10;
          newY = Math.round(newY * 10) / 10;
        }

        setContent((prev) => ({
          ...prev,
          elements: prev.elements.map((item) =>
            item.id === dragInfo.elementId
              ? { ...item, position_x_mm: newX, position_y_mm: newY }
              : item
          ),
        }));
      } else if (resizeInfo) {
        const deltaX = pxToMm(e.clientX - resizeInfo.startX);
        const deltaY = pxToMm(e.clientY - resizeInfo.startY);
        let { initX, initY, initW, initH, handle, elementId } = resizeInfo;
        let newX = initX, newY = initY, newW = initW, newH = initH;
        const minW = 5, minH = 5;

        if (handle.includes("e")) newW = Math.max(minW, initW + deltaX);
        if (handle.includes("s")) newH = Math.max(minH, initH + deltaY);
        if (handle.includes("w")) {
          const possibleW = initW - deltaX;
          if (possibleW >= minW) { newW = possibleW; newX = initX + deltaX; }
        }
        if (handle.includes("n")) {
          const possibleH = initH - deltaY;
          if (possibleH >= minH) { newH = possibleH; newY = initY + deltaY; }
        }

        if (snapEnabledRef.current && !isAlt) {
          newX = snapVal(newX, 5);
          newY = snapVal(newY, 5);
          newW = Math.max(minW, snapVal(newW, 5));
          newH = Math.max(minH, snapVal(newH, 5));
        } else {
          newX = Math.round(newX * 10) / 10;
          newY = Math.round(newY * 10) / 10;
          newW = Math.round(newW * 10) / 10;
          newH = Math.round(newH * 10) / 10;
        }

        setContent((prev) => ({
          ...prev,
          elements: prev.elements.map((item) =>
            item.id === elementId
              ? {
                  ...item,
                  position_x_mm: newX,
                  position_y_mm: newY,
                  width_mm: newW,
                  height_mm: newH,
                }
              : item
          ),
        }));
      }
    };

    const handlePointerUp = () => {
      setDragInfo(null);
      setResizeInfo(null);
    };

    if (dragInfo || resizeInfo) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    }

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragInfo, resizeInfo]);

  const handleExportPdf = async () => {
    showToast("Đang khởi tạo và xuất PDF...", "loading");
    try {
      await exportToPdf(content, docName);
      showToast("Xuất PDF thành công!", "success");
    } catch (err) {
      showToast("Xuất PDF thất bại!", "error");
    }
  };

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const existingElementId = replaceImageElementId.current;
    replaceImageElementId.current = null;
    showToast("Đang tải ảnh lên...", "loading");
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const assetId: number = await invoke("upload_asset_base64", { dataUrl, fileName: `${Date.now()}_${file.name}` });
        if (existingElementId) {
          const img = new Image();
          img.src = dataUrl;
          img.onload = () => {
            const el = content.elements.find((e) => e.id === existingElementId);
            if (el) {
              const newHeight = Math.round((el.width_mm * (img.naturalHeight / img.naturalWidth)) * 10) / 10;
              updateElement({ ...el, properties: { ...el.properties, asset_id: assetId }, height_mm: newHeight });
              showToast("Đã đổi ảnh thành công!", "success");
            }
          };
        } else {
          saveSnapshot();
          const pageWidth = content.page?.width_mm || 210;
          let posX = (pageWidth - 40) / 2;
          if (snapEnabled) posX = snapVal(posX, 5);
          else posX = Math.round(posX * 10) / 10;

          const newEl: Element = {
            id: Date.now().toString() + "_" + Math.random().toString(36).substring(2, 7),
            element_type: "Image",
            position_x_mm: posX,
            position_y_mm: 25,
            width_mm: 40,
            height_mm: 40,
            properties: { type: "Image", asset_id: assetId },
          };
          setContent((prev) => ({ ...prev, elements: [...prev.elements, newEl] }));
          setSelectedElementId(newEl.id);
          showToast("Đã thêm ảnh thành công!", "success");
        }
      } catch (err: any) { showToast("Thêm ảnh thất bại: " + (err.message || String(err)), "error"); }
    };
    reader.readAsDataURL(file);
  }

  function updateElement(el: Element) {
    setContent((prev) => ({ ...prev, elements: prev.elements.map((e) => (e.id === el.id ? el : e)) }));
  }

  function addElement(type: "Text" | "Number" | "Date" | "Select" | "Checkbox") {
    saveSnapshot();
    const pageWidth = content.page?.width_mm || 210;
    let initialProps: any = { type: "Text", content: "Văn bản mới", font_family: "Arial", font_size: 12, is_bold: false, is_italic: false, is_underline: false, alignment: "left" };
    let initialW = 50;
    let initialH = 10;

    if (type === "Number") {
      initialProps = { type: "Number", value: 0 };
      initialW = 30;
    } else if (type === "Date") {
      initialProps = { type: "Date", value: "", format: "YYYY-MM-DD" };
      initialW = 40;
    } else if (type === "Select") {
      initialProps = { type: "Select", options: ["Option 1", "Option 2"], selected: "Option 1" };
      initialW = 40;
    } else if (type === "Checkbox") {
      initialProps = { type: "Checkbox", checked: false };
      initialW = 10;
      initialH = 10;
    }

    let posX = (pageWidth - initialW) / 2;
    if (snapEnabled) posX = snapVal(posX, 5);
    else posX = Math.round(posX * 10) / 10;

    const newEl: Element = {
      id: Date.now().toString(),
      element_type: type,
      position_x_mm: posX,
      position_y_mm: 25,
      width_mm: initialW,
      height_mm: initialH,
      properties: initialProps,
    };
    setContent((prev) => ({ ...prev, elements: [...prev.elements, newEl] }));
    setSelectedElementId(newEl.id);
  }

  if (loading) return <div style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>⏳ Đang tải tài liệu...</div>;
  const selectedElement = content.elements.find((e) => e.id === selectedElementId);
  const isLandscape = content.page.width_mm > content.page.height_mm;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#ffffff", overflow: "hidden" }}>
      {ToastComponent}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 20px", height: "54px", backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0", zIndex: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={handleBack} style={{ backgroundColor: "#f1f5f9", border: "none", padding: "6px 12px", borderRadius: "6px", color: "#475569", cursor: "pointer", fontWeight: 500 }}>← Quay lại</button>
          <input type="text" value={docName} onChange={(e) => setDocName(e.target.value)} style={{ fontWeight: 600, fontSize: "15px", color: "#1e293b", border: "none", outline: "none", background: "transparent", width: "200px" }} placeholder="Tên tài liệu" />
        </div>
        <div style={{ display: "flex", gap: "6px", backgroundColor: "#f1f5f9", padding: "4px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <button style={{ backgroundColor: "#ffffff", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "13px", fontWeight: 500, color: "#334155", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }} onClick={() => addElement("Text")}>+ Văn bản</button>
          <button style={{ backgroundColor: "#ffffff", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "13px", fontWeight: 500, color: "#334155", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }} onClick={() => addElement("Checkbox")}>+ Checkbox</button>
          <button style={{ backgroundColor: "#ffffff", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "13px", fontWeight: 500, color: "#334155", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }} onClick={() => { replaceImageElementId.current = null; fileInputRef.current?.click(); }}>+ Hình ảnh</button>
          <button style={{ backgroundColor: "#ffffff", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "13px", fontWeight: 500, color: "#334155", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }} onClick={() => setOrientation(isLandscape ? "portrait" : "landscape")}>
            {isLandscape ? "📃 Ngang" : "📄 Dọc"}
          </button>
          <input type="file" ref={fileInputRef} style={{ display: "none" }} accept="image/png, image/jpeg, image/jpg, image/webp" onChange={handleFileSelected} />
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button style={{ backgroundColor: "#ffffff", border: "1px solid #cbd5e1", color: "#334155", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 500 }} onClick={handleExportPdf}>Export PDF</button>
          <button style={{ backgroundColor: "#2563eb", color: "white", fontWeight: 600, padding: "6px 18px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "13px", boxShadow: "0 2px 4px rgba(37,99,235,0.2)" }} onClick={() => saveDocument()}>Save</button>
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        <div ref={scrollContainerRef} style={{ flex: 1, overflow: "auto", padding: "48px 32px 80px 32px", display: "flex", justifyContent: "center", alignItems: "flex-start", backgroundColor: "#f1f5f9" }} onClick={() => setSelectedElementId(null)}>
          <div
            ref={canvasRef}
            style={{
              width: `${mmToPx(content.page?.width_mm || 210)}px`,
              height: `${mmToPx(content.page?.height_mm || 297)}px`,
              backgroundColor: "#ffffff",
              borderRadius: "2px",
              position: "relative",
              border: "1px solid #e2e8f0",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)",
              backgroundImage: showGrid ? "radial-gradient(#cbd5e1 1px, transparent 1px)" : "none",
              backgroundSize: `${mmToPx(5)}px ${mmToPx(5)}px`,
            }}
            onClick={(e) => { e.stopPropagation(); setSelectedElementId(null); }}
          >
            {content.elements.map((el) => {
              const props = (el.properties as any) || {};
              const isEditing = editingElementId === el.id;
              const isSelected = selectedElementId === el.id;

              return (
                <div
                  key={el.id}
                  onClick={(e) => { e.stopPropagation(); setSelectedElementId(el.id); }}
                  onDoubleClick={(e) => { e.stopPropagation(); if (el.element_type === "Text") setEditingElementId(el.id); }}
                  onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedElementId(el.id); setContextMenu({ x: e.clientX, y: e.clientY, elementId: el.id }); }}
                  style={{
                    position: "absolute",
                    left: `${mmToPx(el.position_x_mm)}px`,
                    top: `${mmToPx(el.position_y_mm)}px`,
                    width: `${mmToPx(el.width_mm)}px`,
                    height: `${mmToPx(el.height_mm)}px`,
                    border: isSelected ? "1.5px solid #2563eb" : "1px solid transparent",
                    cursor: isEditing ? "text" : "move",
                    touchAction: "none",
                    userSelect: "none",
                  }}
                  onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.border = "1px dashed #94a3b8"; }}
                  onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.border = "1px solid transparent"; }}
                  onPointerDown={(e) => {
                    if (isEditing) return;
                    saveSnapshot();
                    (document.activeElement as HTMLElement)?.blur();
                    setEditingElementId(null);
                    e.stopPropagation();
                    setSelectedElementId(el.id);
                    const rect = canvasRef.current?.getBoundingClientRect();
                    if (rect) setDragInfo({ elementId: el.id, offsetX: pxToMm(e.clientX - rect.left) - el.position_x_mm, offsetY: pxToMm(e.clientY - rect.top) - el.position_y_mm });
                  }}
                >
                  {el.element_type === "Text" && (
                    <textarea
                      value={props.content || ""}
                      onChange={(e) => updateElement({ ...el, properties: { ...props, content: e.target.value } })}
                      onBlur={() => setEditingElementId(null)}
                      style={{
                        width: "100%", height: "100%", border: "none", background: "transparent", resize: "none", outline: "none",
                        pointerEvents: isEditing ? "auto" : "none",
                        fontWeight: props.is_bold ? "bold" : "normal", fontStyle: props.is_italic ? "italic" : "normal", textDecoration: props.is_underline ? "underline" : "none", textAlign: props.alignment || "left", fontSize: props.font_size ? `${props.font_size}px` : "12px",
                      }}
                    />
                  )}
                  {el.element_type === "Number" && (
                    <input type="number" value={props.value || 0} onChange={(e) => updateElement({ ...el, properties: { ...props, value: parseFloat(e.target.value) || 0 } })} style={{ width: "100%", height: "100%", border: "1px solid #cbd5e1", borderRadius: "4px", padding: "4px" }} />
                  )}
                  {el.element_type === "Date" && (
                    <input type="date" value={props.value || ""} onChange={(e) => updateElement({ ...el, properties: { ...props, value: e.target.value } })} style={{ width: "100%", height: "100%", border: "1px solid #cbd5e1", borderRadius: "4px", padding: "4px" }} />
                  )}
                  {el.element_type === "Select" && (
                    <select value={props.selected || ""} onChange={(e) => updateElement({ ...el, properties: { ...props, selected: e.target.value } })} style={{ width: "100%", height: "100%", border: "1px solid #cbd5e1", borderRadius: "4px", padding: "4px" }}>
                      {(props.options || []).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  )}
                  {el.element_type === "Checkbox" && (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <input type="checkbox" checked={!!props.checked} onChange={(e) => updateElement({ ...el, properties: { ...props, checked: e.target.checked } })} onPointerDown={(e) => e.stopPropagation()} style={{ cursor: "pointer", width: "16px", height: "16px" }} />
                    </div>
                  )}
                  {el.element_type === "Image" && <ImageElement assetId={props.asset_id}/>}

                  {isSelected && (["nw", "n", "ne", "e", "se", "s", "sw", "w"] as HandleType[]).map((h) => {
                    const posStyle: React.CSSProperties = { position: "absolute", width: "8px", height: "8px", backgroundColor: "#fff", border: "1.5px solid #0056b3", borderRadius: "2px", zIndex: 50 };
                    if (h === "nw") Object.assign(posStyle, { top: "-4px", left: "-4px", cursor: "nwse-resize" });
                    if (h === "n") Object.assign(posStyle, { top: "-4px", left: "calc(50% - 4px)", cursor: "ns-resize" });
                    if (h === "ne") Object.assign(posStyle, { top: "-4px", right: "-4px", cursor: "nesw-resize" });
                    if (h === "e") Object.assign(posStyle, { top: "calc(50% - 4px)", right: "-4px", cursor: "ew-resize" });
                    if (h === "se") Object.assign(posStyle, { bottom: "-4px", right: "-4px", cursor: "nwse-resize" });
                    if (h === "s") Object.assign(posStyle, { bottom: "-4px", left: "calc(50% - 4px)", cursor: "ns-resize" });
                    if (h === "sw") Object.assign(posStyle, { bottom: "-4px", left: "-4px", cursor: "nesw-resize" });
                    if (h === "w") Object.assign(posStyle, { top: "calc(50% - 4px)", left: "-4px", cursor: "ew-resize" });
                    return <div key={h} style={posStyle} onPointerDown={(e) => { e.stopPropagation(); saveSnapshot(); setResizeInfo({ elementId: el.id, handle: h, startX: e.clientX, startY: e.clientY, initX: el.position_x_mm, initY: el.position_y_mm, initW: el.width_mm, initH: el.height_mm }); }} />;
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <aside style={{ width: "290px", borderLeft: "1px solid #e2e8f0", backgroundColor: "#ffffff", display: "flex", flexDirection: "column", zIndex: 20, padding: "16px", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
          {selectedElement ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                <span style={{ fontWeight: 600, fontSize: "14px", color: "#1e293b" }}>Thuộc tính: {selectedElement.element_type}</span>
                <button onClick={() => setSelectedElementId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>✕</button>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Vị trí & Kích thước (mm)</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px" }}>
                  <div>
                    <label style={{ fontSize: "11px", color: "#64748b" }}>X:</label>
                    <input type="number" style={{ width: "100%", padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "12px", boxSizing: "border-box" }} value={selectedElement.position_x_mm} onChange={(e) => { saveSnapshot(); updateElement({ ...selectedElement, position_x_mm: Math.max(0, parseFloat(e.target.value) || 0) }); }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", color: "#64748b" }}>Y:</label>
                    <input type="number" style={{ width: "100%", padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "12px", boxSizing: "border-box" }} value={selectedElement.position_y_mm} onChange={(e) => { saveSnapshot(); updateElement({ ...selectedElement, position_y_mm: Math.max(0, parseFloat(e.target.value) || 0) }); }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", color: "#64748b" }}>Rộng (W):</label>
                    <input type="number" style={{ width: "100%", padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "12px", boxSizing: "border-box" }} value={selectedElement.width_mm} onChange={(e) => { saveSnapshot(); updateElement({ ...selectedElement, width_mm: Math.max(2, parseFloat(e.target.value) || 2) }); }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", color: "#64748b" }}>Cao (H):</label>
                    <input type="number" style={{ width: "100%", padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "12px", boxSizing: "border-box" }} value={selectedElement.height_mm} onChange={(e) => { saveSnapshot(); updateElement({ ...selectedElement, height_mm: Math.max(2, parseFloat(e.target.value) || 2) }); }} />
                  </div>
                </div>
              </div>

              <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: "16px 0" }} />

              {selectedElement.element_type === "Text" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Nội dung</label>
                    <textarea style={{ width: "100%", height: "60px", padding: "6px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "12px", marginTop: "4px", boxSizing: "border-box", resize: "vertical" }} value={selectedElement.properties.content || ""} onChange={(e) => { saveSnapshot(); updateElement({ ...selectedElement, properties: { ...selectedElement.properties, content: e.target.value } }); }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Cỡ chữ (px)</label>
                    <input type="number" style={{ width: "100%", padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "12px", marginTop: "4px", boxSizing: "border-box" }} value={selectedElement.properties.font_size || 12} onChange={(e) => { saveSnapshot(); updateElement({ ...selectedElement, properties: { ...selectedElement.properties, font_size: parseFloat(e.target.value) || 12 } }); }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Định dạng & Căn lề</label>
                    <div style={{ display: "flex", gap: "4px", marginTop: "6px" }}>
                      <button style={{ flex: 1, padding: "6px", borderRadius: "6px", border: "1px solid #e2e8f0", background: selectedElement.properties.is_bold ? "#dbeafe" : "#ffffff", fontWeight: "bold", cursor: "pointer" }} onClick={() => { saveSnapshot(); updateElement({ ...selectedElement, properties: { ...selectedElement.properties, is_bold: !selectedElement.properties.is_bold } }); }}>B</button>
                      <button style={{ flex: 1, padding: "6px", borderRadius: "6px", border: "1px solid #e2e8f0", background: selectedElement.properties.is_italic ? "#dbeafe" : "#ffffff", fontStyle: "italic", cursor: "pointer" }} onClick={() => { saveSnapshot(); updateElement({ ...selectedElement, properties: { ...selectedElement.properties, is_italic: !selectedElement.properties.is_italic } }); }}>I</button>
                      <button style={{ flex: 1, padding: "6px", borderRadius: "6px", border: "1px solid #e2e8f0", background: selectedElement.properties.is_underline ? "#dbeafe" : "#ffffff", textDecoration: "underline", cursor: "pointer" }} onClick={() => { saveSnapshot(); updateElement({ ...selectedElement, properties: { ...selectedElement.properties, is_underline: !selectedElement.properties.is_underline } }); }}>U</button>
                    </div>
                    <div style={{ display: "flex", gap: "4px", marginTop: "6px" }}>
                      {(["left", "center", "right"] as const).map((align) => (
                        <button key={align} style={{ flex: 1, padding: "6px", borderRadius: "6px", border: "1px solid #e2e8f0", background: (selectedElement.properties.alignment || "left") === align ? "#dbeafe" : "#ffffff", fontSize: "11px", cursor: "pointer", textTransform: "capitalize" }} onClick={() => { saveSnapshot(); updateElement({ ...selectedElement, properties: { ...selectedElement.properties, alignment: align } }); }}>{align}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedElement.element_type === "Number" && (
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Giá trị</label>
                  <input type="number" style={{ width: "100%", padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "12px", marginTop: "4px", boxSizing: "border-box" }} value={selectedElement.properties.value || 0} onChange={(e) => { saveSnapshot(); updateElement({ ...selectedElement, properties: { ...selectedElement.properties, value: parseFloat(e.target.value) || 0 } }); }} />
                </div>
              )}

              {selectedElement.element_type === "Date" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Ngày</label>
                    <input type="date" style={{ width: "100%", padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "12px", marginTop: "4px", boxSizing: "border-box" }} value={selectedElement.properties.value || ""} onChange={(e) => { saveSnapshot(); updateElement({ ...selectedElement, properties: { ...selectedElement.properties, value: e.target.value } }); }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Định dạng</label>
                    <select style={{ width: "100%", padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "12px", marginTop: "4px", boxSizing: "border-box" }} value={selectedElement.properties.format || "YYYY-MM-DD"} onChange={(e) => { saveSnapshot(); updateElement({ ...selectedElement, properties: { ...selectedElement.properties, format: e.target.value } }); }}>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    </select>
                  </div>
                </div>
              )}

              {selectedElement.element_type === "Select" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Tùy chọn (phân cách bởi dấu phẩy)</label>
                    <textarea style={{ width: "100%", height: "60px", padding: "6px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "12px", marginTop: "4px", boxSizing: "border-box", resize: "vertical" }} value={(selectedElement.properties.options || []).join(", ")} onChange={(e) => { saveSnapshot(); updateElement({ ...selectedElement, properties: { ...selectedElement.properties, options: e.target.value.split(",").map(s => s.trim()) } }); }} />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Chọn giá trị mặc định</label>
                    <select style={{ width: "100%", padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "12px", marginTop: "4px", boxSizing: "border-box" }} value={selectedElement.properties.selected || ""} onChange={(e) => { saveSnapshot(); updateElement({ ...selectedElement, properties: { ...selectedElement.properties, selected: e.target.value } }); }}>
                      {(selectedElement.properties.options || []).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {selectedElement.element_type === "Checkbox" && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input type="checkbox" id="chk-prop" checked={!!selectedElement.properties.checked} onChange={(e) => { saveSnapshot(); updateElement({ ...selectedElement, properties: { ...selectedElement.properties, checked: e.target.checked } }); }} />
                  <label htmlFor="chk-prop" style={{ fontSize: "13px", color: "#334155", cursor: "pointer" }}>Đã đánh dấu (Checked)</label>
                </div>
              )}

              {selectedElement.element_type === "Image" && (
                <div>
                  <div style={{ height: "120px", border: "1px solid #e2e8f0", borderRadius: "6px", overflow: "hidden", marginBottom: "8px" }}>
                    <ImageElement assetId={selectedElement.properties.asset_id}/>
                  </div>
                  <button style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: "12px", cursor: "pointer", fontWeight: 500 }} onClick={() => { replaceImageElementId.current = selectedElement.id; fileInputRef.current?.click(); }}>Thay đổi ảnh khác...</button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <span style={{ fontWeight: 600, fontSize: "14px", color: "#1e293b", display: "block", marginBottom: "16px" }}>⚙️ Thiết lập trang</span>
              <div style={{ marginBottom: "16px" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Khổ giấy A4 & Hướng</span>
                <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                  <button style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0", background: !isLandscape ? "#dbeafe" : "#ffffff", fontSize: "12px", cursor: "pointer", fontWeight: !isLandscape ? 600 : 400 }} onClick={() => setOrientation("portrait")}>📄 Dọc (210×297)</button>
                  <button style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0", background: isLandscape ? "#dbeafe" : "#ffffff", fontSize: "12px", cursor: "pointer", fontWeight: isLandscape ? 600 : 400 }} onClick={() => setOrientation("landscape")}>📃 Ngang (297×210)</button>
                </div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Lưới & Căn chỉnh</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#334155", cursor: "pointer" }}>
                    <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
                    Hiển thị lưới chấm (5mm)
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#334155", cursor: "pointer" }}>
                    <input type="checkbox" checked={snapEnabled} onChange={(e) => setSnapEnabled(e.target.checked)} />
                    Hít tọa độ Snap (5mm)
                  </label>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>💡 Giữ phím <b>Alt</b> khi kéo để di chuyển tự do.</span>
                </div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Tổng số phần tử</span>
                <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "#334155" }}>{content.elements.length} phần tử trên trang</p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {contextMenu && (
        <div onPointerDown={(e) => e.stopPropagation()} style={{ position: "fixed", left: `${contextMenu.x}px`, top: `${contextMenu.y}px`, backgroundColor: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", borderRadius: "6px", zIndex: 2000, padding: "6px 0", minWidth: "160px" }}>
          <button style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "none", cursor: "pointer", fontSize: "13px" }} onClick={() => {
            const target = content.elements.find((item) => item.id === contextMenu.elementId);
            if (target) {
              const cloned: Element = { ...structuredClone(target), id: Date.now().toString() + "_" + Math.random().toString(36).substring(2, 6), position_x_mm: target.position_x_mm + 5, position_y_mm: target.position_y_mm + 5 };
              setContent((prev) => ({ ...prev, elements: [...prev.elements, cloned] }));
              setSelectedElementId(cloned.id);
            }
            setContextMenu(null);
          }}>📋 Nhân bản (Duplicate)</button>
          {content.elements.find((e) => e.id === contextMenu.elementId)?.element_type === "Image" && (
            <button style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "none", cursor: "pointer", fontSize: "13px" }} onClick={() => { replaceImageElementId.current = contextMenu.elementId; fileInputRef.current?.click(); setContextMenu(null); }}>🖼 Đổi ảnh khác...</button>
          )}
          <button style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "none", cursor: "pointer", color: "red", fontSize: "13px" }} onClick={() => {
            setContent((prev) => ({ ...prev, elements: prev.elements.filter((item) => item.id !== contextMenu.elementId) }));
            setSelectedElementId(null);
            setContextMenu(null);
          }}>🗑 Xóa (Delete)</button>
        </div>
      )}

      {showCloseModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ width: "380px", backgroundColor: "#ffffff", padding: "24px", borderRadius: "12px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)" }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", fontWeight: 600, color: "#1e293b" }}>Lưu thay đổi trước khi thoát?</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#64748b", lineHeight: "1.5" }}>Tài liệu của bạn có các chỉnh sửa chưa được lưu lại. Bạn có muốn lưu trước khi đóng không?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button style={{ width: "100%", padding: "10px", backgroundColor: "#2563eb", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer", fontSize: "13px" }} onClick={async () => {
                const saved = await saveDocument();
                if (saved) onClose();
              }}>💾 Lưu và thoát</button>
              <button style={{ width: "100%", padding: "10px", backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "8px", fontWeight: 600, cursor: "pointer", fontSize: "13px" }} onClick={onClose}>🗑 Không lưu</button>
              <button style={{ width: "100%", padding: "10px", backgroundColor: "#ffffff", color: "#475569", border: "1px solid #e2e8f0", borderRadius: "8px", fontWeight: 500, cursor: "pointer", fontSize: "13px" }} onClick={() => setShowCloseModal(false)}>✕ Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
