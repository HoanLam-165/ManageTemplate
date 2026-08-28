import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { mmToPx, pxToMm } from "./editor/coordinates";
import { Element, ElementType, DocumentContent } from "./App";
import { exportToPdf } from "./editor/pdfExporter";
import { useToast } from "./components/Toast";

interface TemplateEditorProps {
  templateId?: number;
  onClose: () => void;
}

type HandleType = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

// Image Asset Component
function ImageElement({ assetId }: { assetId: number }) {
  const [src, setSrc] = useState<string>("");
  useEffect(() => {
    if (assetId) {
      invoke<string>("get_asset_base64", { id: assetId }).then(setSrc).catch(console.error);
    }
  }, [assetId]);
  return src ? <img src={src} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <div>🖼 Image ({assetId})</div>;
}

export function TemplateEditor({ templateId, onClose }: TemplateEditorProps) {
  const { showToast, ToastComponent } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState<DocumentContent>({
    schema_version: "1.0",
    page: { width_mm: 210, height_mm: 297, margin_left_mm: 20, margin_right_mm: 20, margin_top_mm: 20, margin_bottom_mm: 20 },
    elements: [],
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [dragInfo, setDragInfo] = useState<{ elementId: string; offsetX: number; offsetY: number } | null>(null);
  const [resizeInfo, setResizeInfo] = useState<{
    elementId: string; handle: HandleType; startX: number; startY: number; initX: number; initY: number; initW: number; initH: number;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId: string } | null>(null);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [propPos, setPropPos] = useState({ x: window.innerWidth - 320, y: 80 });
  const [propDragging, setPropDragging] = useState<{ startX: number; startY: number; posX: number; posY: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceImageElementId = useRef<string | null>(null);

  useEffect(() => {
    async function loadTemplate() {
      try {
        setLoading(true);
        if (templateId) {
          const templates: any[] = await invoke("get_templates");
          const template = templates.find((t) => t.id === templateId);
          if (template) {
            setName(template.name);
            setDescription(template.description || "");
            const parsed = JSON.parse(template.metadata);
            setContent({
              schema_version: parsed.schema_version || "1.0",
              page: parsed.page || { width_mm: 210, height_mm: 297, margin_left_mm: 20, margin_right_mm: 20, margin_top_mm: 20, margin_bottom_mm: 20 },
              elements: Array.isArray(parsed.elements) ? parsed.elements : [],
            });
          }
        }
      } catch (err) {
        console.error("Lỗi nạp Template:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTemplate();
  }, [templateId]);

  useEffect(() => {
    if (!propDragging) return;
    const handleMove = (e: PointerEvent) => {
      setPropPos({
        x: Math.max(10, propDragging.posX + (e.clientX - propDragging.startX)),
        y: Math.max(10, propDragging.posY + (e.clientY - propDragging.startY)),
      });
    };
    const handleUp = () => setPropDragging(null);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [propDragging]);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("pointerdown", closeMenu);
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedElementId) {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === "input" || activeTag === "textarea") return;
        e.preventDefault();
        setContent((prev) => ({ ...prev, elements: prev.elements.filter((el) => el.id !== selectedElementId) }));
        setSelectedElementId(null);
        setIsPropertiesOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", closeMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedElementId]);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();

      if (dragInfo && !resizeInfo) {
        const curX = pxToMm(e.clientX - rect.left);
        const curY = pxToMm(e.clientY - rect.top);
        const newX = Math.max(0, curX - dragInfo.offsetX);
        const newY = Math.max(0, curY - dragInfo.offsetY);

        setContent((prev) => ({
          ...prev,
          elements: prev.elements.map((item) =>
            item.id === dragInfo.elementId
              ? { ...item, position_x_mm: Math.round(newX * 10) / 10, position_y_mm: Math.round(newY * 10) / 10 }
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

        setContent((prev) => ({
          ...prev,
          elements: prev.elements.map((item) =>
            item.id === elementId
              ? {
                  ...item,
                  position_x_mm: Math.round(newX * 10) / 10,
                  position_y_mm: Math.round(newY * 10) / 10,
                  width_mm: Math.round(newW * 10) / 10,
                  height_mm: Math.round(newH * 10) / 10,
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
          const pageWidth = content.page?.width_mm || 210;
          const posX = Math.round(((pageWidth - 40) / 2) * 10) / 10;
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

  const handleExportPdf = async () => {
    showToast("Đang xuất PDF...", "loading");
    try {
      await exportToPdf(content, name);
      showToast("Xuất PDF thành công!", "success");
    } catch (err) {
      showToast("Xuất PDF thất bại!", "error");
    }
  };

  async function save(overwrite: boolean) {
    if (templateId && overwrite) {
      await invoke("update_template", { id: templateId, name, description, metadata: JSON.stringify(content) });
    } else {
      await invoke("create_template", { name, description: description || null, metadata: JSON.stringify(content) });
    }
    onClose();
  }

  function updateElement(el: Element) {
    setContent((prev) => ({ ...prev, elements: prev.elements.map((e) => (e.id === el.id ? el : e)) }));
  }

  function addElement(type: ElementType) {
    const pageWidth = content.page?.width_mm || 210;
    const newEl: Element = {
      id: Date.now().toString(),
      element_type: type,
      position_x_mm: Math.round(((pageWidth - 40) / 2) * 10) / 10,
      position_y_mm: 25,
      width_mm: 40,
      height_mm: 10,
      properties: type === "Text" ? { type: "Text", content: "New Text", font_family: "Arial", font_size: 12, is_bold: false, is_italic: false, is_underline: false, alignment: "left" }
        : type === "Select" ? { type: "Select", options: [], selected: null }
        : type === "Checkbox" ? { type: "Checkbox", checked: false }
        : { type: "Image", asset_id: 0 },
    };
    setContent((prev) => ({ ...prev, elements: [...prev.elements, newEl] }));
    setSelectedElementId(newEl.id);
  }

  if (loading) return <div>⏳ Đang tải dữ liệu...</div>;
  const selectedElement = content.elements.find((e) => e.id === selectedElementId);
  const canvasWidth = mmToPx(content.page.width_mm);
  const canvasHeight = mmToPx(content.page.height_mm);

  return (
    <div style={{ display: "flex", height: "100vh", position: "relative" }} onClick={() => { setSelectedElementId(null); setEditingElementId(null); }}>
      <div style={{ flex: 1, padding: "10px", display: "flex", flexDirection: "column" }}>
        <div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template Name" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
          <button onClick={onClose}>Cancel</button>
          <button onClick={() => save(true)}>Save</button>
          <button onClick={() => save(false)}>Save As New</button>
          <button onClick={handleExportPdf}>Export PDF</button>
        </div>
        {ToastComponent}

        <div style={{ margin: "10px 0", display: "flex", gap: "5px" }}>
          {(["Text", "Select", "Checkbox"] as ElementType[]).map((type) => <button key={type} onClick={() => addElement(type)}>Add {type}</button>)}
          <button onClick={() => { replaceImageElementId.current = null; fileInputRef.current?.click(); }}>Add Image</button>
          <input type="file" ref={fileInputRef} style={{ display: "none" }} accept="image/png, image/jpeg, image/jpg, image/webp" onChange={handleFileSelected} />
        </div>

        <div ref={canvasRef} style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px`, border: "1px solid black", position: "relative", backgroundColor: "white", marginTop: "10px" }}>
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
                  border: isSelected ? "2px solid blue" : "1px dashed gray",
                  cursor: isEditing ? "text" : "move",
                  touchAction: "none", userSelect: "none",
                }}
                onPointerDown={(e) => {
                  if (isEditing) return;
                  e.stopPropagation();
                  setSelectedElementId(el.id);
                  const rect = canvasRef.current?.getBoundingClientRect();
                  if (rect) setDragInfo({ elementId: el.id, offsetX: pxToMm(e.clientX - rect.left) - el.position_x_mm, offsetY: pxToMm(e.clientY - rect.top) - el.position_y_mm });
                }}
              >
                {el.element_type === "Text" && (
                  <textarea value={props.content || ""} onChange={(e) => updateElement({ ...el, properties: { ...props, content: e.target.value } })} onBlur={() => setEditingElementId(null)} onPointerDown={(e) => e.stopPropagation()} style={{ width: "100%", height: "100%", border: "none", background: "transparent", resize: "none", outline: "none", pointerEvents: isEditing ? "auto" : "none", fontWeight: props.is_bold ? "bold" : "normal", fontStyle: props.is_italic ? "italic" : "normal", textDecoration: props.is_underline ? "underline" : "none", textAlign: props.alignment || "left", fontSize: props.font_size ? `${props.font_size}px` : "12px" }} />
                )}
                {el.element_type === "Select" && (
                  <select value={props.selected || ""} onChange={(e) => updateElement({ ...el, properties: { ...props, selected: e.target.value } })} onPointerDown={(e) => e.stopPropagation()} style={{ width: "100%", height: "100%", border: "none", background: "transparent", outline: "none" }}>
                    <option value="">-- Chọn --</option>
                    {(props.options || []).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                )}
                {el.element_type === "Checkbox" && <input type="checkbox" checked={!!props.checked} onChange={(e) => updateElement({ ...el, properties: { ...props, checked: e.target.checked } })} onPointerDown={(e) => e.stopPropagation()} style={{ cursor: "pointer", width: "18px", height: "18px" }} />}
                {el.element_type === "Image" && <ImageElement assetId={props.asset_id} />}

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
                  return <div key={h} style={posStyle} onPointerDown={(e) => { e.stopPropagation(); setResizeInfo({ elementId: el.id, handle: h, startX: e.clientX, startY: e.clientY, initX: el.position_x_mm, initY: el.position_y_mm, initW: el.width_mm, initH: el.height_mm }); }} />;
                })}
              </div>
            );
          })}
        </div>
      </div>

      {contextMenu && (
        <div onPointerDown={(e) => e.stopPropagation()} style={{ position: "fixed", left: `${contextMenu.x}px`, top: `${contextMenu.y}px`, backgroundColor: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", borderRadius: "6px", zIndex: 2000, padding: "6px 0", minWidth: "160px" }}>
          <button style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "none", cursor: "pointer" }} onClick={() => {
            const target = content.elements.find((item) => item.id === contextMenu.elementId);
            if (target) {
              const cloned: Element = { ...structuredClone(target), id: Date.now().toString() + "_" + Math.random().toString(36).substring(2, 6), position_x_mm: target.position_x_mm + 5, position_y_mm: target.position_y_mm + 5 };
              setContent((prev) => ({ ...prev, elements: [...prev.elements, cloned] }));
              setSelectedElementId(cloned.id);
            }
            setContextMenu(null);
          }}>📋 Nhân bản (Duplicate)</button>
          {content.elements.find((e) => e.id === contextMenu.elementId)?.element_type === "Image" && (
            <button style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "none", cursor: "pointer" }} onClick={() => { replaceImageElementId.current = contextMenu.elementId; fileInputRef.current?.click(); setContextMenu(null); }}>🖼 Đổi ảnh khác...</button>
          )}
          <button style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "none", cursor: "pointer", color: "red" }} onClick={() => {
            setContent((prev) => ({ ...prev, elements: prev.elements.filter((item) => item.id !== contextMenu.elementId) }));
            setSelectedElementId(null);
            setContextMenu(null);
          }}>🗑 Xóa (Delete)</button>
          <hr style={{ margin: "4px 0", border: "none", borderTop: "1px solid #eee" }} />
          <button style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "none", cursor: "pointer" }} onClick={(e) => {
            e.stopPropagation();
            setSelectedElementId(contextMenu.elementId);
            setIsPropertiesOpen(true);
            setContextMenu(null);
          }}>⚙️ Thuộc tính (Properties)...</button>
        </div>
      )}

      {isPropertiesOpen && selectedElement && (
        <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} style={{ position: "fixed", left: `${propPos.x}px`, top: `${propPos.y}px`, width: "280px", backgroundColor: "#fff", boxShadow: "0 4px 16px rgba(0,0,0,0.18)", borderRadius: "8px", padding: "14px", zIndex: 1000 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "grab" }} onPointerDown={(e) => setPropDragging({ startX: e.clientX, startY: e.clientY, posX: propPos.x, posY: propPos.y })}>
            <h3>Properties: {selectedElement.element_type}</h3>
            <button onClick={() => setIsPropertiesOpen(false)}>✕</button>
          </div>
          <div> X (mm): <input type="number" value={selectedElement.position_x_mm} onChange={(e) => updateElement({ ...selectedElement, position_x_mm: Math.max(0, parseFloat(e.target.value) || 0) })} /> </div>
          <div> Y (mm): <input type="number" value={selectedElement.position_y_mm} onChange={(e) => updateElement({ ...selectedElement, position_y_mm: Math.max(0, parseFloat(e.target.value) || 0) })} /> </div>
          <div> W (mm): <input type="number" value={selectedElement.width_mm} onChange={(e) => updateElement({ ...selectedElement, width_mm: Math.max(2, parseFloat(e.target.value) || 2) })} /> </div>
          <div> H (mm): <input type="number" value={selectedElement.height_mm} onChange={(e) => updateElement({ ...selectedElement, height_mm: Math.max(2, parseFloat(e.target.value) || 2) })} /> </div>
          <hr />
          {selectedElement.element_type === "Text" && (
            <>
              <div><textarea value={selectedElement.properties.content} onChange={(e) => updateElement({ ...selectedElement, properties: { ...selectedElement.properties, content: e.target.value } })} /></div>
              <div><input type="number" value={selectedElement.properties.font_size || 12} onChange={(e) => updateElement({ ...selectedElement, properties: { ...selectedElement.properties, font_size: parseFloat(e.target.value) || 12 } })} /> Font Size</div>
              <div>
                <input type="checkbox" checked={!!selectedElement.properties.is_bold} onChange={(e) => updateElement({ ...selectedElement, properties: { ...selectedElement.properties, is_bold: e.target.checked } })} /> Bold
                <input type="checkbox" checked={!!selectedElement.properties.is_italic} onChange={(e) => updateElement({ ...selectedElement, properties: { ...selectedElement.properties, is_italic: e.target.checked } })} /> Italic
                <input type="checkbox" checked={!!selectedElement.properties.is_underline} onChange={(e) => updateElement({ ...selectedElement, properties: { ...selectedElement.properties, is_underline: e.target.checked } })} /> Underline
              </div>
              <div>
                <select value={selectedElement.properties.alignment || "left"} onChange={(e) => updateElement({ ...selectedElement, properties: { ...selectedElement.properties, alignment: e.target.value } })}>
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select> Alignment
              </div>
            </>
          )}
          {selectedElement.element_type === "Select" && (
            <div>Options (comma separated):<br /><textarea value={(selectedElement.properties.options || []).join(", ")} onChange={(e) => updateElement({ ...selectedElement, properties: { ...selectedElement.properties, options: e.target.value.split(",").map((s: string) => s.trim()) } })} /></div>
          )}
          {selectedElement.element_type === "Checkbox" && (
            <div>Checked: <input type="checkbox" checked={!!selectedElement.properties.checked} onChange={(e) => updateElement({ ...selectedElement, properties: { ...selectedElement.properties, checked: e.target.checked } })} /></div>
          )}
          {selectedElement.element_type === "Image" && (
            <div>
              <ImageElement assetId={selectedElement.properties.asset_id} />
              <button onClick={() => { replaceImageElementId.current = selectedElement.id; fileInputRef.current?.click(); }}>Đổi ảnh khác</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
