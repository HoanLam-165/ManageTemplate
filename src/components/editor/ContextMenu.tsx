import React from 'react';
import { ArrowUpToLine, ArrowDownToLine, ArrowUp, ArrowDown, Copy, Trash2 } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  elementId: string;
  onClose: () => void;
  onMoveElement: (id: string, direction: "front" | "back" | "forward" | "backward") => void;
  onCopy: () => void;
  onDelete: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, elementId, onClose, onMoveElement, onCopy, onDelete }) => {
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top: y,
        left: x,
        backgroundColor: "white",
        border: "1px solid #e4e4e7",
        borderRadius: "8px",
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
        padding: "4px",
        zIndex: 100,
      }}
    >
      <button
        style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "8px", border: "none", background: "none", cursor: "pointer", fontSize: "13px" }}
        onClick={() => { onMoveElement(elementId, "front"); onClose(); }}
      >
        <ArrowUpToLine size={14} /> Lên trên cùng
      </button>
      <button
        style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "8px", border: "none", background: "none", cursor: "pointer", fontSize: "13px" }}
        onClick={() => { onMoveElement(elementId, "forward"); onClose(); }}
      >
        <ArrowUp size={14} /> Lên một lớp
      </button>
      <button
        style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "8px", border: "none", background: "none", cursor: "pointer", fontSize: "13px" }}
        onClick={() => { onMoveElement(elementId, "backward"); onClose(); }}
      >
        <ArrowDown size={14} /> Xuống một lớp
      </button>
      <button
        style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "8px", border: "none", background: "none", cursor: "pointer", fontSize: "13px" }}
        onClick={() => { onMoveElement(elementId, "back"); onClose(); }}
      >
        <ArrowDownToLine size={14} /> Xuống dưới cùng
      </button>
      <div style={{ height: "1px", backgroundColor: "#e4e4e7", margin: "4px 0" }}></div>
      <button
        style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "8px", border: "none", background: "none", cursor: "pointer", fontSize: "13px" }}
        onClick={() => { onCopy(); onClose(); }}
      >
        <Copy size={14} /> Sao chép
      </button>
      <button
        style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "8px", border: "none", background: "none", cursor: "pointer", fontSize: "13px", color: "red" }}
        onClick={() => { onDelete(); onClose(); }}
      >
        <Trash2 size={14} /> Xóa
      </button>
    </div>
  );
};
