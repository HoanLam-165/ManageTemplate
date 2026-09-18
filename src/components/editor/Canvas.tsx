import { RefObject } from "react";
import { mmToPx, pxToMm } from "../../editor/coordinates";
import { ImageElement } from "./ImageElement";
import { Element } from "../../App";
import { useDocumentStore } from "../../store/documentStore";
import { useViewportStore } from "../../store/viewportStore";
import { useEditorActionsStore } from "../../store/editorActionsStore";
import { useShallow } from "zustand/react/shallow";

type HandleType = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

interface CanvasProps {
  canvasRef: RefObject<HTMLDivElement>;
  editingElementId: string | null;
  setEditingElementId: (id: string | null) => void;
  setDragInfo: (info: any) => void;
  setResizeInfo: (info: any) => void;
  setContextMenu: (info: any) => void;
}

export const Canvas = ({
  canvasRef,
  editingElementId,
  setEditingElementId,
  setDragInfo,
  setResizeInfo,
  setContextMenu,
}: CanvasProps) => {
  const {
    content,
    selectedElementId,
    setSelectedElementId,
  } = useDocumentStore(
    useShallow((state) => ({
      content: state.content,
      selectedElementId: state.selectedElementId,
      setSelectedElementId: state.setSelectedElementId,
    })),
  );
  
  const { zoom, showGrid } = useViewportStore(
    useShallow((state) => ({
      zoom: state.zoom,
      showGrid: state.showGrid,
    })),
  );

  const { updateElement } = useEditorActionsStore(
    useShallow((state) => ({
      updateElement: state.updateElement,
    })),
  );

  return (
    <div
      ref={canvasRef}
      style={{
        width: `${mmToPx(content.page.width_mm)}px`,
        height: `${mmToPx(content.page.height_mm)}px`,
        backgroundColor: "#ffffff",
        position: "absolute",
        top: 0,
        left: 0,
        transform: `scale(${zoom})`,
        transformOrigin: "top left",
        borderRadius: "2px",
        border: "1px solid #e4e4e7",
        boxShadow:
          "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        backgroundImage: showGrid
          ? "radial-gradient(#e4e4e7 1px, transparent 1px)"
          : "none",
        backgroundSize: `${mmToPx(5)}px ${mmToPx(5)}px`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedElementId(null);
      }}
    >
      {content.elements.map((el: Element, index: number) => {
        const props = (el.properties as any) || {};
        console.log(`Rendering element ${el.id}:`, {
          type: el.element_type,
          x: el.position_x_mm,
          y: el.position_y_mm,
          w: el.width_mm,
          h: el.height_mm,
          pxLeft: mmToPx(el.position_x_mm),
          pxTop: mmToPx(el.position_y_mm)
        });
        const isEditing = editingElementId === el.id;
        const isSelected = selectedElementId === el.id;

        return (
          <div
            key={el.id}
            id={`canvas-item-${el.id}`}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedElementId(el.id);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (el.element_type === "Text") setEditingElementId(el.id);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelectedElementId(el.id);
              setContextMenu({
                x: e.clientX,
                y: e.clientY,
                elementId: el.id,
              });
            }}
            style={{
              position: "absolute",
              zIndex: index + 1,
              left: `${mmToPx(el.position_x_mm)}px`,
              top: `${mmToPx(el.position_y_mm)}px`,
              width: `${mmToPx(el.width_mm)}px`,
              height: `${mmToPx(el.height_mm)}px`,
              border: isSelected
                ? "1.5px solid #18181b"
                : "1px solid transparent",
              cursor: isEditing ? "text" : "move",
              touchAction: "none",
              userSelect: "none",
            }}
            onMouseEnter={(e) => {
              if (!isSelected)
                (e.currentTarget as HTMLDivElement).style.border =
                  "1px dashed #a1a1aa";
            }}
            onMouseLeave={(e) => {
              if (!isSelected)
                (e.currentTarget as HTMLDivElement).style.border =
                  "1px solid transparent";
            }}
            onPointerDown={(e) => {
            if (isEditing) return;
            (document.activeElement as HTMLElement)?.blur();
            setEditingElementId(null);
            e.stopPropagation();
            setSelectedElementId(el.id);
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect)
            setDragInfo({
              elementId: el.id,
              offsetX:
                pxToMm((e.clientX - rect.left) / zoom) - el.position_x_mm,
              offsetY:
                pxToMm((e.clientY - rect.top) / zoom) - el.position_y_mm,
            });
            }}

          >
            {el.element_type === "Text" && (
              <textarea
                value={props.content || ""}
                onChange={(e) =>
                  updateElement({
                    ...el,
                    properties: { ...props, content: e.target.value },
                  })
                }
                onBlur={() => setEditingElementId(null)}
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  background: "transparent",
                  resize: "none",
                  outline: "none",
                  pointerEvents: isEditing ? "auto" : "none",
                  fontWeight: props.is_bold ? "bold" : "normal",
                  fontStyle: props.is_italic ? "italic" : "normal",
                  textDecoration: props.is_underline ? "underline" : "none",
                  textAlign: props.alignment || "left",
                  fontSize: props.font_size ? `${props.font_size}px` : "12px",
                }}
              />
            )}
            {el.element_type === "Checkbox" && (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <input
                  type="checkbox"
                  checked={!!props.checked}
                  onChange={(e) =>
                    updateElement({
                      ...el,
                      properties: {
                        ...props,
                        checked: e.target.checked,
                      },
                    })
                  }
                  onPointerDown={(e) => e.stopPropagation()}
                  style={{
                    cursor: "pointer",
                    width: "16px",
                    height: "16px",
                  }}
                />
              </div>
            )}
            {el.element_type === "Image" && (
              <ImageElement assetId={props.asset_id} />
            )}

            {isSelected &&
              (
                ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as HandleType[]
              ).map((h) => {
                const posStyle: React.CSSProperties = {
                  position: "absolute",
                  width: "6px",
                  height: "6px",
                  backgroundColor: "#fff",
                  border: "1px solid #18181b",
                  borderRadius: "1px",
                  zIndex: 50,
                };
                if (h === "nw")
                  Object.assign(posStyle, {
                    top: "-4px",
                    left: "-4px",
                    cursor: "nwse-resize",
                  });
                if (h === "n")
                  Object.assign(posStyle, {
                    top: "-4px",
                    left: "calc(50% - 4px)",
                    cursor: "ns-resize",
                  });
                if (h === "ne")
                  Object.assign(posStyle, {
                    top: "-4px",
                    right: "-4px",
                    cursor: "nesw-resize",
                  });
                if (h === "e")
                  Object.assign(posStyle, {
                    top: "calc(50% - 4px)",
                    right: "-4px",
                    cursor: "ew-resize",
                  });
                if (h === "se")
                  Object.assign(posStyle, {
                    bottom: "-4px",
                    right: "-4px",
                    cursor: "nwse-resize",
                  });
                if (h === "s")
                  Object.assign(posStyle, {
                    bottom: "-4px",
                    left: "calc(50% - 4px)",
                    cursor: "ns-resize",
                  });
                if (h === "sw")
                  Object.assign(posStyle, {
                    bottom: "-4px",
                    left: "-4px",
                    cursor: "nesw-resize",
                  });
                if (h === "w")
                  Object.assign(posStyle, {
                    top: "calc(50% - 4px)",
                    left: "-4px",
                    cursor: "ew-resize",
                  });
                return (
                  <div
                    key={h}
                    style={posStyle}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setResizeInfo({
                        elementId: el.id,
                        handle: h,
                        startX: e.clientX,
                        startY: e.clientY,
                        initX: el.position_x_mm,
                        initY: el.position_y_mm,
                        initW: el.width_mm,
                        initH: el.height_mm,
                      });
                    }}
                  />
                );
              })}
          </div>
        );
      })}
    </div>
  );
};
