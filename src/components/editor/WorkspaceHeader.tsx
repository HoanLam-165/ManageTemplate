import {
  ArrowLeft,
  Menu,
  Type,
  CheckSquare,
  Image as ImageIcon,
  Sliders,
  Columns,
  Rows,
  Layers,
  RefreshCw,
} from "lucide-react";
import { ZOOM_PRESETS } from "../../editor/constants";
import { useDocumentStore } from "../../store/documentStore";
import { useViewportStore } from "../../store/viewportStore";
import { useEditorActionsStore } from "../../store/editorActionsStore";
import { useShallow } from "zustand/react/shallow";

interface WorkspaceHeaderProps {
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onScanDocument: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportPdf: () => Promise<void>;
  onExecuteSave: () => Promise<void>;
  onHandleBack: () => void;
  onSetOrientation: (orientation: "portrait" | "landscape") => void;
  onSaveAsNew?: () => void;
}

export const WorkspaceHeader = ({
  fileInputRef,
  onFileSelected,
  onScanDocument,
  onExportPdf,
  onExecuteSave,
  onHandleBack,
  onSetOrientation,
  onSaveAsNew,
}: WorkspaceHeaderProps) => {
  const { mode, name, setName } = useDocumentStore(
    useShallow((state) => ({
      mode: state.mode,
      name: state.name,
      setName: state.setName,
    })),
  );
  
  const { 
    showLeftSidebar, setShowLeftSidebar,
    showRightSidebar, setShowRightSidebar,
    showFileMenu, setShowFileMenu,
    zoom, handleZoomChange, handleFitToScreen, isLandscape
  } = useViewportStore(
    useShallow((state) => ({
      showLeftSidebar: state.showLeftSidebar,
      setShowLeftSidebar: state.setShowLeftSidebar,
      showRightSidebar: state.showRightSidebar,
      setShowRightSidebar: state.setShowRightSidebar,
      showFileMenu: state.showFileMenu,
      setShowFileMenu: state.setShowFileMenu,
      zoom: state.zoom,
      handleZoomChange: state.handleZoomChange,
      handleFitToScreen: state.handleFitToScreen,
      isLandscape: state.isLandscape,
    })),
  );

  const { addElement, isAnalyzing } = useEditorActionsStore(
    useShallow((state) => ({
      addElement: state.addElement,
      isAnalyzing: state.isAnalyzing,
    })),
  );

  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 16px",
        height: "48px",
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #e4e4e7",
        zIndex: 30,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          onClick={onHandleBack}
          style={{
            backgroundColor: "#f4f4f5",
            border: "1px solid #e4e4e7",
            padding: "6px 10px",
            borderRadius: "6px",
            color: "#18181b",
            cursor: "pointer",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <ArrowLeft size={16} /> Quay lại
        </button>
        <button
          onClick={() => setShowLeftSidebar(!showLeftSidebar)}
          style={{
            backgroundColor: showLeftSidebar ? "#f4f4f5" : "#ffffff",
            border: "1px solid #e4e4e7",
            padding: "6px 10px",
            borderRadius: "6px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
          }}
          title="Ẩn/Hiện danh sách lớp"
        >
          <Layers size={16} /> Lớp
        </button>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            fontWeight: 600,
            fontSize: "14px",
            color: "#18181b",
            border: "none",
            outline: "none",
            background: "transparent",
            width: "200px",
          }}
          placeholder="Tên tài liệu..."
        />
      </div>
      <div
        style={{
          display: "flex",
          gap: "4px",
          padding: "4px",
          borderRadius: "8px",
        }}
      >
        <button
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e4e4e7",
            padding: "6px 10px",
            borderRadius: "6px",
            fontSize: "13px",
            color: "#18181b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
          onClick={() => addElement("Text")}
        >
          <Type size={16} /> Văn bản
        </button>
        <button
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e4e4e7",
            padding: "6px 10px",
            borderRadius: "6px",
            fontSize: "13px",
            color: "#18181b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
          onClick={() => addElement("Checkbox")}
        >
          <CheckSquare size={16} /> Checkbox
        </button>
        <button
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e4e4e7",
            padding: "6px 10px",
            borderRadius: "6px",
            fontSize: "13px",
            color: "#18181b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
          onClick={() => {
            fileInputRef.current?.click();
          }}
        >
          <ImageIcon size={16} /> Hình ảnh
        </button>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          accept="image/png, image/jpeg, image/jpg, image/webp"
          onChange={onFileSelected}
        />

        <button
          disabled={isAnalyzing}
          style={{
            backgroundColor: isAnalyzing ? "#f4f4f5" : "#ffffff",
            border: "1px solid #e4e4e7",
            padding: "6px 10px",
            borderRadius: "6px",
            fontSize: "13px",
            color: isAnalyzing ? "#a1a1aa" : "#18181b",
            cursor: isAnalyzing ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = (e) => onScanDocument(e as any);
            input.click();
          }}
        >
          <RefreshCw size={16} /> {isAnalyzing ? "Đang phân tích..." : "Scan"}
        </button>

        <button
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e4e4e7",
            padding: "6px 10px",
            borderRadius: "6px",
            fontSize: "13px",
            color: "#18181b",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
          onClick={() => onSetOrientation(isLandscape ? "portrait" : "landscape")}
        >
          {isLandscape ? <Columns size={16} /> : <Rows size={16} />} Xoay
        </button>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: "#ffffff",
            border: "1px solid #e4e4e7",
            borderRadius: "6px",
            height: "31px",
            marginLeft: "8px",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => handleZoomChange(zoom - 0.1)}
            title="Thu nhỏ (Ctrl -)"
            style={{
              padding: "0 8px",
              border: "none",
              background: "none",
              cursor: zoom > 0.25 ? "pointer" : "not-allowed",
              color: "#18181b",
              height: "100%",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            -
          </button>

          <select
            value={zoom}
            onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
            style={{
              fontSize: "12px",
              fontWeight: 500,
              color: "#18181b",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: "0 4px",
              outline: "none",
              textAlign: "center",
            }}
          >
            {ZOOM_PRESETS.map((p) => (
              <option key={p} value={p}>
                {Math.round(p * 100)}%
              </option>
            ))}
            {!ZOOM_PRESETS.includes(zoom) && (
              <option value={zoom}>{Math.round(zoom * 100)}%</option>
            )}
          </select>

          <button
            onClick={() => handleZoomChange(zoom + 0.1)}
            title="Phóng to (Ctrl +)"
            style={{
              padding: "0 8px",
              border: "none",
              background: "none",
              cursor: zoom < 3.0 ? "pointer" : "not-allowed",
              color: "#18181b",
              height: "100%",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            +
          </button>

          <div
            style={{ width: "1px", height: "16px", backgroundColor: "#e4e4e7" }}
          />

          <button
            onClick={handleFitToScreen}
            title="Vừa màn hình (Shift + 1)"
            style={{
              padding: "0 8px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: 600,
              color: "#52525b",
              height: "100%",
            }}
          >
            Fit
          </button>
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={() => setShowRightSidebar(!showRightSidebar)}
          style={{
            backgroundColor: showRightSidebar ? "#f4f4f5" : "#ffffff",
            border: "1px solid #e4e4e7",
            padding: "6px 10px",
            borderRadius: "6px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
          }}
          title="Ẩn/Hiện bảng thiết lập"
        >
          <Sliders size={16} /> Thiết lập
        </button>
        <div style={{ position: "relative" }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowFileMenu(!showFileMenu);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "6px 12px",
              fontSize: "14px",
              fontWeight: 500,
              color: "white",
              backgroundColor: "#2563eb",
              borderRadius: "6px",
              cursor: "pointer",
              border: "none",
            }}
          >
            <Menu style={{ marginRight: "6px" }} size={16} />
            Tệp
          </button>
          {showFileMenu && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: "4px",
                width: "160px",
                backgroundColor: "white",
                border: "1px solid #e4e4e7",
                borderRadius: "6px",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                zIndex: 50,
                padding: "4px 0",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <button
                onClick={() => {
                  onExecuteSave();
                  setShowFileMenu(false);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 16px",
                  fontSize: "14px",
                  color: "#374151",
                  border: "none",
                  backgroundColor: "transparent",
                  cursor: "pointer",
                }}
              >
                Lưu
              </button>
              <button
                onClick={() => {
                  onExportPdf();
                  setShowFileMenu(false);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 16px",
                  fontSize: "14px",
                  color: "#374151",
                  border: "none",
                  backgroundColor: "transparent",
                  cursor: "pointer",
                }}
              >
                Xuất PDF
              </button>
              {mode === "template" && onSaveAsNew && (
                <button
                  onClick={() => {
                    onSaveAsNew();
                    setShowFileMenu(false);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 16px",
                    fontSize: "14px",
                    color: "#374151",
                    border: "none",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                  }}
                >
                  Save As
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
