import { invoke } from "@tauri-apps/api/core";
import { Element } from "../App";
import { pxToMm } from "../editor/coordinates";
import { snapVal } from "../editor/utils";
import { useDocumentStore } from "../store/documentStore";
import { useEditorActionsStore } from "../store/editorActionsStore";

export function useFileHandler(
  zoom: number,
  snapEnabled: boolean,
  scrollContainerRef: React.RefObject<HTMLDivElement | null>,
  replaceImageElementId: React.MutableRefObject<string | null>,
  analyzeImage: (file: File) => Promise<Element[] | null>,
  showToast: (message: string, type: "success" | "error" | "loading") => void,
) {
  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const existingElementId = replaceImageElementId.current;
    replaceImageElementId.current = null;
    showToast("Đang tải ảnh...", "loading");
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const assetId: number = await invoke("upload_asset_base64", {
          dataUrl,
          fileName: `${Date.now()}_${file.name}`,
        });
        const content = useDocumentStore.getState().content;
        if (existingElementId) {
          const img = new Image();
          img.src = dataUrl;
          img.onload = () => {
            const el = content.elements.find((e) => e.id === existingElementId);
            if (el) {
              const newHeight =
                Math.round(
                  el.width_mm * (img.naturalHeight / img.naturalWidth) * 10,
                ) / 10;
              useEditorActionsStore.getState().updateElement({
                ...el,
                properties: { ...el.properties, asset_id: assetId },
                height_mm: newHeight,
              });
              showToast("Đã đổi ảnh thành công!", "success");
            }
          };
        } else {
          const pageWidth = content.page?.width_mm || 210;

          let scrollYPx = scrollContainerRef.current
            ? scrollContainerRef.current.scrollTop
            : 0;
          let targetYPx = Math.max(0, scrollYPx - 48) + 80;
          let posY = pxToMm(targetYPx / zoom);
          let posX = (pageWidth - 40) / 2;

          if (snapEnabled) {
            posX = snapVal(posX, 5);
            posY = snapVal(posY, 5);
          } else {
            posX = Math.round(posX * 10) / 10;
            posY = Math.round(posY * 10) / 10;
          }

          const newEl: Element = {
            id:
              Date.now().toString() +
              "_" +
              Math.random().toString(36).substring(2, 7),
            element_type: "Image",
            position_x_mm: posX,
            position_y_mm: posY,
            width_mm: 40,
            height_mm: 40,
            properties: { type: "Image", asset_id: assetId },
          };
          useDocumentStore.getState().setContent((prev) => ({
            ...prev,
            elements: [...prev.elements, newEl],
          }));
          useDocumentStore.getState().setSelectedElementId(newEl.id);
          showToast("Đã thêm ảnh thành công!", "success");
        }
      } catch (err: any) {
        showToast(
          "Thêm ảnh thất bại: " + (err.message || String(err)),
          "error",
        );
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleScanDocument(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const scannedElements = await analyzeImage(file);
    if (scannedElements && scannedElements.length > 0) {
      
      // Nối elements mới vào (Append)
      useDocumentStore.getState().setContent((prev) => ({
        ...prev,
        elements: [...prev.elements, ...scannedElements]
      }));
      showToast("Đã phân tích tài liệu thành công!", "success");
    }
    
    // Reset file input
    e.target.value = '';
  }

  return { handleFileSelected, handleScanDocument };
}
