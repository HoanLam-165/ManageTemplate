import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { mmToPx, pxToMm } from "./editor/coordinates";
import { Element, ElementType, DocumentContent } from "./App";
import { PRESETS, generateElementsFromPreset } from "./editor/presets";
import { exportToPdf } from "./editor/pdfExporter";

interface TemplateEditorProps {
  templateId?: number;
  onClose: () => void;
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
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const [dragInfo, setDragInfo] = useState<{ elementId: string, offsetX: number, offsetY: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadTemplate() {
      if (templateId) {
        const templates: any[] = await invoke("get_templates");
        const template = templates.find((t) => t.id === templateId);
        if (template) {
          setName(template.name);
          setDescription(template.description || "");
          setContent(JSON.parse(template.metadata));
        }
      }
    }
    loadTemplate();
  }, [templateId]);

  useEffect(() => {
    if (!dragInfo) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = Math.max(0, pxToMm(e.clientX - rect.left - dragInfo.offsetX));
      const y = Math.max(0, pxToMm(e.clientY - rect.top - dragInfo.offsetY));
      
      const el = content.elements.find(el => el.id === dragInfo.elementId);
      if (el) {
        updateElement({
          ...el, 
          position_x_mm: Math.round(x * 10) / 10, 
          position_y_mm: Math.round(y * 10) / 10
        });
      }
    };

    const handlePointerUp = () => setDragInfo(null);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragInfo, content.elements]);

  async function save(overwrite: boolean) {
    if (templateId && overwrite) {
      await invoke("update_template", { 
        id: templateId, 
        name, 
        description, 
        metadata: JSON.stringify(content) 
      });
    } else {
      await invoke("create_template", { 
        name, 
        description: description || null,
        metadata: JSON.stringify(content) 
      });
    }
    onClose();
  }

  function updateElement(el: Element) {
    setContent({
      ...content,
      elements: content.elements.map((e) => (e.id === el.id ? el : e)),
    });
  }

  function addElement(type: ElementType) {
    const newEl: Element = {
      id: Date.now().toString(),
      element_type: type,
      position_x_mm: 10,
      position_y_mm: 10,
      width_mm: 40,
      height_mm: 10,
      properties: type === "Text" ? { type: "Text", content: "New Text", font_family: "Arial", font_size: 12, is_bold: false, is_italic: false, is_underline: false, alignment: "left" } 
        : type === "Number" ? { type: "Number", value: 0 }
        : type === "Date" ? { type: "Date", value: "", format: "DD/MM/YYYY" }
        : type === "Select" ? { type: "Select", options: [], selected: null }
        : type === "Checkbox" ? { type: "Checkbox", checked: false }
        : { type: "Image", asset_id: 0 },
    };
    setContent({ ...content, elements: [...content.elements, newEl] });
  }

  function addPreset(presetId: string) {
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    const newElements = generateElementsFromPreset(preset, 10, 10);
    setContent({ ...content, elements: [...content.elements, ...newElements] });
  }

  const selectedElement = content.elements.find((e) => e.id === selectedElementId);
  const canvasWidth = mmToPx(content.page.width_mm);
  const canvasHeight = mmToPx(content.page.height_mm);

  return (
    <div style={{ display: "flex", height: "100vh" }}>
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
        
        <div style={{ margin: "10px 0", display: "flex", gap: "5px", flexWrap: "wrap" }}>
          {(["Text", "Number", "Date", "Select", "Checkbox", "Image"] as ElementType[]).map(type => (
            <button key={type} onClick={() => addElement(type)}>Add {type}</button>
          ))}
          {PRESETS.map(p => (
            <button key={p.id} onClick={() => addPreset(p.id)}>Add {p.label}</button>
          ))}
        </div>

        <div ref={canvasRef} style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px`, border: "1px solid black", position: "relative", backgroundColor: "white", marginTop: "10px" }}>
          {content.elements.map((el) => {
            const props = el.properties as any;
            return (
              <div
                key={el.id}
                onClick={() => setSelectedElementId(el.id)}
                style={{
                  position: "absolute",
                  left: `${mmToPx(el.position_x_mm)}px`,
                  top: `${mmToPx(el.position_y_mm)}px`,
                  width: `${mmToPx(el.width_mm)}px`,
                  height: `${mmToPx(el.height_mm)}px`,
                  border: selectedElementId === el.id ? "2px solid blue" : "1px dashed gray",
                  touchAction: "none",
                  overflow: "hidden",
                  wordBreak: "break-word",
                  userSelect: "none"
                }}
                onPointerDown={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setDragInfo({
                      elementId: el.id,
                      offsetX: e.clientX - rect.left,
                      offsetY: e.clientY - rect.top
                  });
                  setSelectedElementId(el.id);
                }}
              >
                {el.element_type === "Text" && (
                  <div style={{
                    fontWeight: props.is_bold ? 'bold' : 'normal',
                    fontStyle: props.is_italic ? 'italic' : 'normal',
                    textDecoration: props.is_underline ? 'underline' : 'none',
                    textAlign: props.alignment || 'left',
                    fontSize: props.font_size ? `${props.font_size}px` : '12px'
                  }}>
                    {props.content || "Văn bản..."}
                  </div>
                )}
                {el.element_type === "Number" && <div>{props.value ?? 0}</div>}
                {el.element_type === "Date" && <div>{props.value || "DD/MM/YYYY"}</div>}
                {el.element_type === "Select" && <div>{props.selected || "-- Chọn --"}</div>}
                {el.element_type === "Checkbox" && <div>{props.checked ? "☑" : "☐"}</div>}
                {el.element_type === "Image" && <div>🖼 [Ảnh: Asset #{props.asset_id || 0}]</div>}
              </div>
            );
          })}
        </div>
      </div>
      
      {selectedElement && (
        <div style={{ width: "300px", borderLeft: "1px solid gray", padding: "10px" }}>
          <h3>Properties: {selectedElement.element_type}</h3>
          <div>
            X (mm): <input type="number" value={selectedElement.position_x_mm} onChange={(e) => updateElement({...selectedElement, position_x_mm: Math.max(0, parseFloat(e.target.value) || 0)})} />
          </div>
          <div>
            Y (mm): <input type="number" value={selectedElement.position_y_mm} onChange={(e) => updateElement({...selectedElement, position_y_mm: Math.max(0, parseFloat(e.target.value) || 0)})} />
          </div>
          <div>
            W (mm): <input type="number" value={selectedElement.width_mm} onChange={(e) => updateElement({...selectedElement, width_mm: Math.max(2, parseFloat(e.target.value) || 2)})} />
          </div>
          <div>
            H (mm): <input type="number" value={selectedElement.height_mm} onChange={(e) => updateElement({...selectedElement, height_mm: Math.max(2, parseFloat(e.target.value) || 2)})} />
          </div>
          <hr />
          {selectedElement.element_type === "Text" && (
            <input value={selectedElement.properties.content} onChange={(e) => updateElement({...selectedElement, properties: {...selectedElement.properties, content: e.target.value}})} />
          )}
          {selectedElement.element_type === "Number" && (
            <input type="number" value={selectedElement.properties.value} onChange={(e) => updateElement({...selectedElement, properties: {...selectedElement.properties, value: parseFloat(e.target.value) || 0}})} />
          )}
          {selectedElement.element_type === "Date" && (
            <input type="date" value={selectedElement.properties.value} onChange={(e) => updateElement({...selectedElement, properties: {...selectedElement.properties, value: e.target.value}})} />
          )}
          {selectedElement.element_type === "Select" && (
            <textarea value={selectedElement.properties.options.join(", ")} onChange={(e) => updateElement({...selectedElement, properties: {...selectedElement.properties, options: e.target.value.split(",").map(s => s.trim())}})} />
          )}
          {selectedElement.element_type === "Checkbox" && (
            <input type="checkbox" checked={selectedElement.properties.checked} onChange={(e) => updateElement({...selectedElement, properties: {...selectedElement.properties, checked: e.target.checked}})} />
          )}
          {selectedElement.element_type === "Image" && (
            <input type="number" value={selectedElement.properties.asset_id} onChange={(e) => updateElement({...selectedElement, properties: {...selectedElement.properties, asset_id: parseFloat(e.target.value) || 0}})} />
          )}
          <br /><br />
          <button onClick={() => {
            setContent({...content, elements: content.elements.filter(e => e.id !== selectedElement.id)});
            setSelectedElementId(null);
          }}>Delete Element</button>
        </div>
      )}
    </div>
  );
}
