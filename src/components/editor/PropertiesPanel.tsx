import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, RefreshCw, Sliders } from "lucide-react";
import { Element } from "../../App";
import { ImageElement } from "./ImageElement";

interface PropertiesPanelProps {
  selectedElement?: Element;
  updateElement: (el: Element) => void;
  mode: "template" | "document";
  description?: string;
  setDescription?: (desc: string) => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  snapEnabled: boolean;
  setSnapEnabled: (enabled: boolean) => void;
  contentElementsLength: number;
  setSelectedElementId: (id: string | null) => void;
  replaceImageElementId: React.MutableRefObject<string | null>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  isLandscape: boolean;
  setOrientation: (orientation: "portrait" | "landscape") => void;
}

export const PropertiesPanel = ({
  selectedElement, updateElement, mode, description, setDescription, 
  showGrid, setShowGrid, snapEnabled, setSnapEnabled, contentElementsLength,
  setSelectedElementId, replaceImageElementId, fileInputRef,
  isLandscape, setOrientation
}: PropertiesPanelProps) => {
  return (
    <aside
      style={{
        width: "290px",
        borderLeft: "1px solid #e4e4e7",
        backgroundColor: "#ffffff",
        display: "flex",
        flexDirection: "column",
        zIndex: 20,
        padding: "16px",
        overflowY: "auto",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {selectedElement ? (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              borderBottom: "1px solid #e4e4e7",
              paddingBottom: "8px",
            }}
          >
            <span
              style={{
                fontWeight: 600,
                fontSize: "13px",
                color: "#18181b",
              }}
            >
              {selectedElement.element_type}
            </span>
            <button
              onClick={() => setSelectedElementId(null)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#a1a1aa",
              }}
            >
              ×
            </button>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#71717a",
                textTransform: "uppercase",
              }}
            >
              Vị trí & Kích thước
            </span>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                marginTop: "8px",
              }}
            >
              <div>
                <label style={{ fontSize: "11px", color: "#71717a" }}>
                  X (mm):
                </label>
                <input
                  type="number"
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    border: "1px solid #e4e4e7",
                    fontSize: "12px",
                    boxSizing: "border-box",
                  }}
                  value={selectedElement.position_x_mm}
                  onChange={(e) => {
                    updateElement({
                      ...selectedElement,
                      position_x_mm: Math.max(
                        0,
                        parseFloat(e.target.value) || 0,
                      ),
                    });
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", color: "#71717a" }}>
                  Y (mm):
                </label>
                <input
                  type="number"
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    border: "1px solid #e4e4e7",
                    fontSize: "12px",
                    boxSizing: "border-box",
                  }}
                  value={selectedElement.position_y_mm}
                  onChange={(e) => {
                    updateElement({
                      ...selectedElement,
                      position_y_mm: Math.max(
                        0,
                        parseFloat(e.target.value) || 0,
                      ),
                    });
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", color: "#71717a" }}>
                  W (mm):
                </label>
                <input
                  type="number"
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    border: "1px solid #e4e4e7",
                    fontSize: "12px",
                    boxSizing: "border-box",
                  }}
                  value={selectedElement.width_mm}
                  onChange={(e) => {
                    updateElement({
                      ...selectedElement,
                      width_mm: Math.max(
                        2,
                        parseFloat(e.target.value) || 2,
                      ),
                    });
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", color: "#71717a" }}>
                  H (mm):
                </label>
                <input
                  type="number"
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    border: "1px solid #e4e4e7",
                    fontSize: "12px",
                    boxSizing: "border-box",
                  }}
                  value={selectedElement.height_mm}
                  onChange={(e) => {
                    updateElement({
                      ...selectedElement,
                      height_mm: Math.max(
                        2,
                        parseFloat(e.target.value) || 2,
                      ),
                    });
                  }}
                />
              </div>
            </div>
          </div>

          {selectedElement.element_type === "Text" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#71717a",
                    textTransform: "uppercase",
                  }}
                >
                  Nội dung
                </label>
                <textarea
                  style={{
                    width: "100%",
                    height: "60px",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    border: "1px solid #e4e4e7",
                    fontSize: "12px",
                    marginTop: "4px",
                    boxSizing: "border-box",
                    resize: "vertical",
                  }}
                  value={(selectedElement.properties as any).content || ""}
                  onChange={(e) => {
                    updateElement({
                      ...selectedElement,
                      properties: {
                        ...selectedElement.properties,
                        content: e.target.value,
                      },
                    });
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#71717a",
                    textTransform: "uppercase",
                  }}
                >
                  Định dạng
                </label>
                <div
                  style={{
                    display: "flex",
                    gap: "4px",
                    marginTop: "6px",
                  }}
                >
                  <button
                    style={{
                      flex: 1,
                      padding: "6px",
                      borderRadius: "6px",
                      border: "1px solid #e4e4e7",
                      background: (selectedElement.properties as any).is_bold
                        ? "#f4f4f5"
                        : "#ffffff",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      updateElement({
                        ...selectedElement,
                        properties: {
                          ...selectedElement.properties,
                          is_bold: !(selectedElement.properties as any).is_bold,
                        },
                      });
                    }}
                  >
                    <Bold size={16} />
                  </button>
                  <button
                    style={{
                      flex: 1,
                      padding: "6px",
                      borderRadius: "6px",
                      border: "1px solid #e4e4e7",
                      background: (selectedElement.properties as any).is_italic
                        ? "#f4f4f5"
                        : "#ffffff",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      updateElement({
                        ...selectedElement,
                        properties: {
                          ...selectedElement.properties,
                          is_italic:
                            !(selectedElement.properties as any).is_italic,
                        },
                      });
                    }}
                  >
                    <Italic size={16} />
                  </button>
                  <button
                    style={{
                      flex: 1,
                      padding: "6px",
                      borderRadius: "6px",
                      border: "1px solid #e4e4e7",
                      background: (selectedElement.properties as any).is_underline
                        ? "#f4f4f5"
                        : "#ffffff",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      updateElement({
                        ...selectedElement,
                        properties: {
                          ...selectedElement.properties,
                          is_underline:
                            !(selectedElement.properties as any).is_underline,
                        },
                      });
                    }}
                  >
                    <Underline size={16} />
                  </button>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "4px",
                    marginTop: "6px",
                  }}
                >
                  <button
                    style={{
                      flex: 1,
                      padding: "6px",
                      borderRadius: "6px",
                      border: "1px solid #e4e4e7",
                      background:
                        ((selectedElement.properties as any).alignment ||
                          "left") === "left"
                          ? "#f4f4f5"
                          : "#ffffff",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      updateElement({
                        ...selectedElement,
                        properties: {
                          ...selectedElement.properties,
                          alignment: "left",
                        },
                      });
                    }}
                  >
                    <AlignLeft size={16} />
                  </button>
                  <button
                    style={{
                      flex: 1,
                      padding: "6px",
                      borderRadius: "6px",
                      border: "1px solid #e4e4e7",
                      background:
                        ((selectedElement.properties as any).alignment ||
                          "left") === "center"
                          ? "#f4f4f5"
                          : "#ffffff",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      updateElement({
                        ...selectedElement,
                        properties: {
                          ...selectedElement.properties,
                          alignment: "center",
                        },
                      });
                    }}
                  >
                    <AlignCenter size={16} />
                  </button>
                  <button
                    style={{
                      flex: 1,
                      padding: "6px",
                      borderRadius: "6px",
                      border: "1px solid #e4e4e7",
                      background:
                        ((selectedElement.properties as any).alignment ||
                          "left") === "right"
                          ? "#f4f4f5"
                          : "#ffffff",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      updateElement({
                        ...selectedElement,
                        properties: {
                          ...selectedElement.properties,
                          alignment: "right",
                        },
                      });
                    }}
                  >
                    <AlignRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedElement.element_type === "Checkbox" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 0",
              }}
            >
              <input
                type="checkbox"
                id="chk-prop-doc"
                checked={!!(selectedElement.properties as any).checked}
                onChange={(e) => {
                  updateElement({
                    ...selectedElement,
                    properties: {
                      ...selectedElement.properties,
                      checked: e.target.checked,
                    },
                  });
                }}
              />
              <label
                htmlFor="chk-prop-doc"
                style={{
                  fontSize: "13px",
                  color: "#18181b",
                  cursor: "pointer",
                }}
              >
                {mode === "template"
                  ? "Mặc định đánh dấu"
                  : "Đã đánh dấu"}
              </label>
            </div>
          )}

          {selectedElement.element_type === "Image" && (
            <div>
              <div
                style={{
                  height: "120px",
                  border: "1px solid #e4e4e7",
                  borderRadius: "6px",
                  overflow: "hidden",
                  marginBottom: "8px",
                }}
              >
                <ImageElement
                  assetId={(selectedElement.properties as any).asset_id}
                />
              </div>
              <button
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "6px",
                  border: "1px solid #e4e4e7",
                  background: "#f4f4f5",
                  fontSize: "12px",
                  cursor: "pointer",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
                onClick={() => {
                  replaceImageElementId.current = selectedElement.id;
                  fileInputRef.current?.click();
                }}
              >
                <RefreshCw size={14} /> Thay đổi ảnh khác...
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: 600,
              fontSize: "13px",
              color: "#18181b",
              marginBottom: "16px",
            }}
          >
            <Sliders size={16} /> Thiết lập{" "}
            {mode === "template" ? "Template" : "Trang"}
          </div>
          {mode === "template" && (
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#71717a",
                  textTransform: "uppercase",
                }}
              >
                Mô tả Template
              </label>
              <textarea
                style={{
                  width: "100%",
                  height: "60px",
                  padding: "6px 8px",
                  borderRadius: "6px",
                  border: "1px solid #e4e4e7",
                  fontSize: "12px",
                  marginTop: "4px",
                  boxSizing: "border-box",
                  resize: "vertical",
                }}
                value={description || ""}
                onChange={(e) => setDescription?.(e.target.value)}
                placeholder="Nhập mô tả..."
              />
            </div>
          )}
          <div style={{ marginBottom: "16px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#71717a",
                textTransform: "uppercase",
              }}
            >
              Khổ giấy & Hướng
            </span>
            <div
              style={{ display: "flex", gap: "6px", marginTop: "8px" }}
            >
              <button
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "6px",
                  border: "1px solid #e4e4e7",
                  background: !isLandscape ? "#f4f4f5" : "#ffffff",
                  fontSize: "12px",
                  cursor: "pointer",
                  fontWeight: !isLandscape ? 600 : 400,
                }}
                onClick={() => setOrientation("portrait")}
              >
                A4 Dọc
              </button>
              <button
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "6px",
                  border: "1px solid #e4e4e7",
                  background: isLandscape ? "#f4f4f5" : "#ffffff",
                  fontSize: "12px",
                  cursor: "pointer",
                  fontWeight: isLandscape ? 600 : 400,
                }}
                onClick={() => setOrientation("landscape")}
              >
                A4 Ngang
              </button>
            </div>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#71717a",
                textTransform: "uppercase",
              }}
            >
              Lưới & Cân chỉnh
            </span>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                marginTop: "8px",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "13px",
                  color: "#18181b",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                />{" "}
                Hiện lưới chấm (5mm)
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "13px",
                  color: "#18181b",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={snapEnabled}
                  onChange={(e) => setSnapEnabled(e.target.checked)}
                />{" "}
                Hít tọa độ Snap (5mm)
              </label>
              <span style={{ fontSize: "11px", color: "#a1a1aa" }}>
                Giữ phím <b>Alt</b> khi kéo để di chuyển tự do.
              </span>
            </div>
          </div>
          <p style={{ fontSize: "12px", color: "#71717a" }}>
            Tổng phần tử: {contentElementsLength}
          </p>
        </div>
      )}
    </aside>
  );
};
