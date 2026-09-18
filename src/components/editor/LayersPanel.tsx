import { Type, CheckSquare, Image as ImageIcon, ArrowUp, ArrowDown, Trash2, Layers } from "lucide-react";
import { Element, DocumentContent } from "../../App";

interface LayersPanelProps {
  elements: Element[];
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  moveElement: (id: string, direction: "front" | "back" | "forward" | "backward") => void;
  setContent: React.Dispatch<React.SetStateAction<DocumentContent>>;
}

export const LayersPanel = ({ elements, selectedElementId, setSelectedElementId, moveElement, setContent }: LayersPanelProps) => {
  return (
    <aside style={{ width: "240px", borderRight: "1px solid #e4e4e7", backgroundColor: "#ffffff", display: "flex", flexDirection: "column", zIndex: 20 }}>
      <style>{` .layer-actions { opacity: 0; transition: opacity 0.2s; } .layer-item:hover .layer-actions { opacity: 1; } `}</style>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #e4e4e7", fontWeight: 600, fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
        <Layers size={16} /> Lớp phần tử ({elements.length})
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {[...elements].reverse().map((el) => {
          const isSelected = selectedElementId === el.id;
          const Icon = el.element_type === "Text" ? Type : el.element_type === "Checkbox" ? CheckSquare : ImageIcon;
          return (
            <div 
              key={el.id} 
              className="layer-item" 
              onClick={() => {
                setSelectedElementId(el.id);
                const canvasItem = document.getElementById(`canvas-item-${el.id}`);
                if (canvasItem) {
                  canvasItem.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                    inline: "nearest",
                  });
                }
              }} 
              style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", backgroundColor: isSelected ? "#f4f4f5" : "transparent", borderLeft: isSelected ? "3px solid #18181b" : "3px solid transparent", borderBottom: "1px solid #f4f4f5" }}
            >
              <Icon color="#71717a" size={14} />
              <span style={{ fontSize: "13px", color: isSelected ? "#18181b" : "#4b5563", flex: 1 }}>{el.element_type}</span>
              <div style={{ fontSize: "11px", color: "#a1a1aa" }}>{el.position_x_mm}x{el.position_y_mm}</div>
              <div style={{ opacity: 0, display: "flex", gap: "4px" }} className="layer-actions">
                <button onClick={(e) => { e.stopPropagation(); moveElement(el.id, "forward"); }}><ArrowUp size={12} /></button>
                <button onClick={(e) => { e.stopPropagation(); moveElement(el.id, "backward"); }}><ArrowDown size={12} /></button>
                <button style={{ color: "#dc2626" }} onClick={(e) => { e.stopPropagation(); setContent((prev) => ({ ...prev, elements: prev.elements.filter((item) => item.id !== el.id) })); }}><Trash2 size={12} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
