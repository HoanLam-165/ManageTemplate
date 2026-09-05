import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  ArrowLeft,
  Menu,
  Type,
  CheckSquare,
  Image as ImageIcon,
  Copy,
  Trash2,
  Sliders,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Columns,
  Rows,
  Layers,
  RefreshCw,
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { mmToPx, pxToMm } from "./coordinates";
import { Element, DocumentContent } from "../App";
import { exportToPdf } from "./pdfExporter";
import { useToast } from "../components/Toast";

export interface SharedWorkspaceProps {
  mode: "template" | "document";
  name: string;
  setName: (name: string) => void;
  description?: string;
  setDescription?: (desc: string) => void;
  content: DocumentContent;
  setContent: React.Dispatch<React.SetStateAction<DocumentContent>>;
  onSave: () => Promise<boolean>;
  onSaveAsNew?: () => void;
  onClose: () => void;
  lastSavedStateRef: React.MutableRefObject<string>;
}

type HandleType = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

function snapVal(val: number, step: number = 5): number {
  return Math.round(val / step) * step;
}

function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (typeof obj1 !== "object" || typeof obj2 !== "object" || obj1 == null || obj2 == null) return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }
  return true;
}

function ImageElement({ assetId }: { assetId: number; width?: number; height?: number }) {
  const [src, setSrc] = useState<string>("");
  useEffect(() => {
    if (assetId) {
      invoke<string>("get_asset_base64", { id: assetId })
        .then(setSrc)
        .catch(console.error);
    }
  }, [assetId]);

  return src ? (
    <img
      src={src}
      draggable={false}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        pointerEvents: "none",
        userSelect: "none",
        display: "block",
      }}
    />
  ) : (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "#f8fafc",
        color: "#a1a1aa",
        fontSize: "11px",
        gap: "6px",
        pointerEvents: "none",
      }}
    >
      <ImageIcon size={20} /> Chưa có ảnh
    </div>
  );
}

export function SharedWorkspace({
  mode,
  name,
  setName,
  description,
  setDescription,
  content,
  setContent,
  onSave,
  onSaveAsNew,
  onClose,
  lastSavedStateRef,
}: SharedWorkspaceProps) {
  const { showToast, ToastComponent } = useToast();
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null,
  );
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [showLeftSidebar, setShowLeftSidebar] = useState<boolean>(true);
  const [showRightSidebar, setShowRightSidebar] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1);
  const zoomRef = useRef(zoom);
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number }>({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // Danh sách các mốc zoom chuẩn
  const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0];

  const handleZoomChange = (newZoom: number, focalPoint?: { x: number; y: number }) => {
    const clampedZoom = Math.min(3.0, Math.max(0.25, Math.round(newZoom * 100) / 100));
    const container = scrollContainerRef.current;

    if (container && focalPoint) {
      const prevZoom = zoomRef.current;
      const rect = container.getBoundingClientRect();
      const mouseX = focalPoint.x - rect.left;
      const mouseY = focalPoint.y - rect.top;

      const newScrollLeft = (container.scrollLeft + mouseX) * (clampedZoom / prevZoom) - mouseX;
      const newScrollTop = (container.scrollTop + mouseY) * (clampedZoom / prevZoom) - mouseY;

      setZoom(clampedZoom);
      zoomRef.current = clampedZoom;

      requestAnimationFrame(() => {
        container.scrollLeft = newScrollLeft;
        container.scrollTop = newScrollTop;
      });
    } else {
      setZoom(clampedZoom);
      zoomRef.current = clampedZoom;
    }
  };

  const handleFitToScreen = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const paddingX = 64;
    const paddingY = 96;
    const availW = container.clientWidth - paddingX;
    const availH = container.clientHeight - paddingY;
    const pageW = mmToPx(content.page?.width_mm || 210);
    const pageH = mmToPx(content.page?.height_mm || 297);

    const fitScale = Math.min(availW / pageW, availH / pageH);
    const targetZoom = Math.min(2.0, Math.max(0.25, Math.round(fitScale * 100) / 100));
    setZoom(targetZoom);
    zoomRef.current = targetZoom;

    requestAnimationFrame(() => {
      container.scrollLeft = (container.scrollWidth - container.clientWidth) / 2;
      container.scrollTop = 0;
    });
  };

  // Xử lý Ctrl + Lăn chuột để zoom vào vị trí con trỏ chuột
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
        const targetZoom = zoomRef.current * zoomFactor;
        handleZoomChange(targetZoom, { x: e.clientX, y: e.clientY });
      }
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", onWheel);
    };
  }, []);

  // Xử lý phím tắt Zoom (Ctrl +, Ctrl -, Ctrl 0, Shift 1) và giữ phím Space
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (editingIdRef.current !== null || activeTag === "input" || activeTag === "textarea") return;

      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        handleZoomChange(zoomRef.current + 0.15);
      } else if (isCtrl && (e.key === "-" || e.key === "_")) {
        e.preventDefault();
        handleZoomChange(zoomRef.current - 0.15);
      } else if (isCtrl && e.key === "0") {
        e.preventDefault();
        handleZoomChange(1.0);
      } else if (e.shiftKey && e.key === "!") { // Shift + 1
        e.preventDefault();
        handleFitToScreen();
      } else if (e.code === "Space" && !e.repeat && !isSpacePressed) {
        setIsSpacePressed(true);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [isSpacePressed]);

  const [dragInfo, setDragInfo] = useState<{
    elementId: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [resizeInfo, setResizeInfo] = useState<{
    elementId: string;
    handle: HandleType;
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    initW: number;
    initH: number;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    elementId: string;
  } | null>(null);
  const [showCloseModal, setShowCloseModal] = useState<boolean>(false);
  const [showFileMenu, setShowFileMenu] = useState<boolean>(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceImageElementId = useRef<string | null>(null);

  const contentRef = useRef(content);
  const nameRef = useRef(name);
  const selectedIdRef = useRef(selectedElementId);
  const editingIdRef = useRef(editingElementId);
  const snapEnabledRef = useRef(snapEnabled);
  const clipboardRef = useRef<Element | null>(null);
  const historyRef = useRef<DocumentContent[]>([]);
  const isForceClosingRef = useRef(false);

  useEffect(() => {
    contentRef.current = content;
    nameRef.current = name;
    selectedIdRef.current = selectedElementId;
    editingIdRef.current = editingElementId;
    snapEnabledRef.current = snapEnabled;
    zoomRef.current = zoom;
  }, [content, name, selectedElementId, editingElementId, snapEnabled, zoom]);

  const checkIsDirty = (): boolean => {
    const currentMeta = {
      name: nameRef.current,
      ...(mode === "template" ? { description } : {}),
      content: contentRef.current,
    };
    try {
      const lastSaved = JSON.parse(lastSavedStateRef.current);
      return !deepEqual(currentMeta, lastSaved);
    } catch (e) {
      return lastSavedStateRef.current !== JSON.stringify(currentMeta);
    }
  };

  useEffect(() => {
    const unlistenPromise = getCurrentWindow().onCloseRequested((event) => {
      if (!isForceClosingRef.current && checkIsDirty()) {
        event.preventDefault();
        setShowCloseModal(true);
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  const handleBack = () => {
    if (checkIsDirty()) {
      setShowCloseModal(true);
    } else {
      onClose();
    }
  };

  const handleExportPdf = async () => {
    showToast("Đang khởi tạo và xuất PDF...", "loading");
    try {
      await exportToPdf(content, name);
      showToast("Xuất PDF thành công!", "success");
    } catch (err: any) {
      showToast("Xuất PDF thất bại: " + (err.message || String(err)), "error");
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
        showToast("Đã hoàn tác", "success");
      }
    } else {
      showToast("Không còn thao tác để hoàn tác", "error");
    }
  };

  const copySelected = () => {
    if (!selectedIdRef.current) return;
    const target = contentRef.current.elements.find(
      (el) => el.id === selectedIdRef.current,
    );
    if (target) {
      clipboardRef.current = structuredClone(target);
      showToast("Đã sao chép phần tử!", "success");
    }
  };

  const pasteClipboard = () => {
    if (!clipboardRef.current) return;
    saveSnapshot();
    const source = clipboardRef.current;

    const newEl: Element = {
      ...structuredClone(source),
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      position_x_mm: source.position_x_mm + 5,
      position_y_mm: source.position_y_mm + 5,
    };
    clipboardRef.current = structuredClone(newEl);
    setContent((prev) => ({ ...prev, elements: [...prev.elements, newEl] }));
    setSelectedElementId(newEl.id);
    showToast("Đã dán phần tử!", "success");
  };

  const setOrientation = (orientation: "portrait" | "landscape") => {
    saveSnapshot();
    setContent((prev) => {
      const isLandscape = prev.page.width_mm > prev.page.height_mm;
      if (
        (orientation === "landscape" && isLandscape) ||
        (orientation === "portrait" && !isLandscape)
      )
        return prev;
      return {
        ...prev,
        page: {
          ...prev.page,
          width_mm: prev.page.height_mm,
          height_mm: prev.page.width_mm,
        },
      };
    });
    showToast(
      orientation === "landscape"
        ? "Đã chuyển sang khổ Ngang"
        : "Đã chuyển sang khổ Dọc",
      "success",
    );
  };

  const executeSave = async () => {
    try {
      const success = await onSave();
      if (success !== false) {
        lastSavedStateRef.current = JSON.stringify({
          name: nameRef.current,
          ...(mode === "template" ? { description } : {}),
          content: contentRef.current,
        });
        await emit("item-saved");
        showToast("Đã lưu thành công!", "success");
      }
    } catch (err: any) {
      showToast("Lỗi khi lưu: " + (err?.message || String(err)), "error");
    }
  };

  useEffect(() => {
    const closeMenu = () => {
      setContextMenu(null);
      setShowFileMenu(false);
    };
    window.addEventListener("pointerdown", closeMenu);

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (isCtrl && key === "s") {
        e.preventDefault();
        executeSave();
        return;
      }
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (
        editingIdRef.current !== null ||
        activeTag === "input" ||
        activeTag === "textarea"
      )
        return;
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
        setContent((prev) => ({
          ...prev,
          elements: prev.elements.filter((el) => el.id !== idToDelete),
        }));
        setSelectedElementId(null);
        showToast("Đã xóa phần tử!", "success");
        return;
      }
      if (
        ["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key) &&
        selectedIdRef.current
      ) {
        e.preventDefault();
        saveSnapshot();
        const step = e.shiftKey ? 5 : 1;
        const idToMove = selectedIdRef.current;
        setContent((prev) => ({
          ...prev,
          elements: prev.elements.map((el) => {
            if (el.id !== idToMove) return el;
            let nx = el.position_x_mm,
              ny = el.position_y_mm;
            if (key === "arrowup") ny = Math.max(0, ny - step);
            else if (key === "arrowdown") ny += step;
            else if (key === "arrowleft") nx = Math.max(0, nx - step);
            else if (key === "arrowright") nx += step;
            return {
              ...el,
              position_x_mm: Math.round(nx * 10) / 10,
              position_y_mm: Math.round(ny * 10) / 10,
            };
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
  }, [onSave]);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const isAlt = e.altKey;
      if (dragInfo && !resizeInfo) {
        if (scrollContainerRef.current) {
          const sRect = scrollContainerRef.current.getBoundingClientRect();
          const threshold = 60,
            speed = 12;
          if (e.clientY < sRect.top + threshold)
            scrollContainerRef.current.scrollTop -= speed;
          else if (e.clientY > sRect.bottom - threshold)
            scrollContainerRef.current.scrollTop += speed;
        }
        const currentZoom = zoomRef.current;
        const curX = pxToMm((e.clientX - rect.left) / currentZoom);
        const curY = pxToMm((e.clientY - rect.top) / currentZoom);
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
              : item,
          ),
        }));
      } else if (resizeInfo) {
        const currentZoom = zoomRef.current;
        const totalDeltaX = pxToMm((e.clientX - resizeInfo.startX) / currentZoom);
        const totalDeltaY = pxToMm((e.clientY - resizeInfo.startY) / currentZoom);
        const { handle, elementId, initX, initY, initW, initH } = resizeInfo;
        const minW = 5;
        const minH = 5;

        const currentEl = contentRef.current.elements.find(el => el.id === elementId);
        const isImage = currentEl?.element_type === "Image";
        const lockAspect = isImage || e.shiftKey;
        const aspectRatio = initW / (initH || 1);

        let newX = initX;
        let newY = initY;
        let newW = initW;
        let newH = initH;

        if (lockAspect && ["nw", "ne", "se", "sw"].includes(handle)) {
          // Khóa tỷ lệ khi kéo các điểm góc
          let delta = Math.abs(totalDeltaX) > Math.abs(totalDeltaY) ? totalDeltaX : totalDeltaY;
          if (handle === "se") {
            newW = Math.max(minW, initW + delta);
            newH = newW / aspectRatio;
          } else if (handle === "sw") {
            newW = Math.max(minW, initW - delta);
            newH = newW / aspectRatio;
            newX = initX + (initW - newW);
          } else if (handle === "ne") {
            newW = Math.max(minW, initW + delta);
            newH = newW / aspectRatio;
            newY = initY + (initH - newH);
          } else if (handle === "nw") {
            newW = Math.max(minW, initW - delta);
            newH = newW / aspectRatio;
            newX = initX + (initW - newW);
            newY = initY + (initH - newH);
          }
        } else {
          // Kéo tự do theo các cạnh
          if (handle.includes("e")) {
            const rawW = initW + totalDeltaX;
            newW = Math.max(minW, snapEnabledRef.current && !isAlt ? snapVal(initX + rawW, 5) - initX : rawW);
          } else if (handle.includes("w")) {
            const rightEdge = initX + initW;
            const rawX = initX + totalDeltaX;
            newX = Math.min(rightEdge - minW, snapEnabledRef.current && !isAlt ? snapVal(rawX, 5) : rawX);
            newW = rightEdge - newX;
          }

          if (handle.includes("s")) {
            const rawH = initH + totalDeltaY;
            newH = Math.max(minH, snapEnabledRef.current && !isAlt ? snapVal(initY + rawH, 5) - initY : rawH);
          } else if (handle.includes("n")) {
            const bottomEdge = initY + initH;
            const rawY = initY + totalDeltaY;
            newY = Math.min(bottomEdge - minH, snapEnabledRef.current && !isAlt ? snapVal(rawY, 5) : rawY);
            newH = bottomEdge - newY;
          }
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
              : item,
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
    showToast("Đang tải ảnh...", "loading");
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const assetId: number = await invoke("upload_asset_base64", {
          dataUrl,
          fileName: `${Date.now()}_${file.name}`,
        });
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
              updateElement({
                ...el,
                properties: { ...el.properties, asset_id: assetId },
                height_mm: newHeight,
              });
              showToast("Đã đổi ảnh thành công!", "success");
            }
          };
        } else {
          saveSnapshot();
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
          setContent((prev) => ({
            ...prev,
            elements: [...prev.elements, newEl],
          }));
          setSelectedElementId(newEl.id);
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

  function updateElement(el: Element) {
    setContent((prev) => ({
      ...prev,
      elements: prev.elements.map((e) => (e.id === el.id ? el : e)),
    }));
  }

  function addElement(type: "Text" | "Checkbox") {
    saveSnapshot();
    const pageWidth = content.page?.width_mm || 210;
    let initialProps: any = {
      type: "Text",
      content: "Văn bản mới",
      font_family: "Arial",
      font_size: 12,
      is_bold: false,
      is_italic: false,
      is_underline: false,
      alignment: "left",
    };
    let initialW = 50,
      initialH = 10;
    if (type === "Checkbox") {
      initialProps = { type: "Checkbox", checked: false };
      initialW = 10;
      initialH = 10;
    }

    let scrollYPx = scrollContainerRef.current
      ? scrollContainerRef.current.scrollTop
      : 0;
    let targetYPx = Math.max(0, scrollYPx - 48) + 80;
    let posY = pxToMm(targetYPx / zoom);
    let posX = (pageWidth - initialW) / 2;

    if (snapEnabled) {
      posX = snapVal(posX, 5);
      posY = snapVal(posY, 5);
    } else {
      posX = Math.round(posX * 10) / 10;
      posY = Math.round(posY * 10) / 10;
    }

    const newEl: Element = {
      id: Date.now().toString(),
      element_type: type,
      position_x_mm: posX,
      position_y_mm: posY,
      width_mm: initialW,
      height_mm: initialH,
      properties: initialProps,
    };
    setContent((prev) => ({ ...prev, elements: [...prev.elements, newEl] }));
    setSelectedElementId(newEl.id);
  }

  const moveElement = (
    id: string,
    direction: "front" | "back" | "forward" | "backward",
  ) => {
    saveSnapshot();
    setContent((prev) => {
      const elements = [...prev.elements];
      const index = elements.findIndex((e) => e.id === id);
      if (index === -1) return prev;

      const [el] = elements.splice(index, 1);

      if (direction === "front") {
        elements.push(el);
      } else if (direction === "back") {
        elements.unshift(el);
      } else if (direction === "forward") {
        const newIndex = Math.min(elements.length, index + 1);
        elements.splice(newIndex, 0, el);
      } else if (direction === "backward") {
        const newIndex = Math.max(0, index - 1);
        elements.splice(newIndex, 0, el);
      }
      return { ...prev, elements };
    });
    setContextMenu(null);
  };

  const selectedElement = content.elements.find(
    (e) => e.id === selectedElementId,
  );
  const isLandscape = content.page.width_mm > content.page.height_mm;

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        overflow: "hidden",
      }}
    >
      <style>{` .layer-actions { opacity: 0; transition: opacity 0.2s; } .layer-item:hover .layer-actions { opacity: 1; } `}</style>
      {ToastComponent}
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
            onClick={handleBack}
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
              replaceImageElementId.current = null;
              fileInputRef.current?.click();
            }}
          >
            <ImageIcon size={16} /> Hình ảnh
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
            onClick={() =>
              setOrientation(isLandscape ? "portrait" : "landscape")
            }
          >
            {isLandscape ? <Columns size={16} /> : <Rows size={16} />} Xoay
          </button>
          <div style={{ display: "flex", alignItems: "center", backgroundColor: "#ffffff", border: "1px solid #e4e4e7", borderRadius: "6px", height: "31px", marginLeft: "8px", overflow: "hidden", flexShrink: 0 }}>
            <button 
              onClick={() => handleZoomChange(zoom - 0.1)} 
              title="Thu nhỏ (Ctrl -)"
              style={{ padding: "0 8px", border: "none", background: "none", cursor: zoom > 0.25 ? "pointer" : "not-allowed", color: "#18181b", height: "100%", fontSize: "14px", fontWeight: 600 }}
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
                textAlign: "center"
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
              style={{ padding: "0 8px", border: "none", background: "none", cursor: zoom < 3.0 ? "pointer" : "not-allowed", color: "#18181b", height: "100%", fontSize: "14px", fontWeight: 600 }}
            >
              +
            </button>

            <div style={{ width: "1px", height: "16px", backgroundColor: "#e4e4e7" }} />

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
                height: "100%"
              }}
            >
              Fit
            </button>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept="image/png, image/jpeg, image/jpg, image/webp"
            onChange={handleFileSelected}
          />
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
              onClick={(e) => { e.stopPropagation(); setShowFileMenu(!showFileMenu); }}
              style={{ display: "flex", alignItems: "center", padding: "6px 12px", fontSize: "14px", fontWeight: 500, color: "white", backgroundColor: "#2563eb", borderRadius: "6px", cursor: "pointer", border: "none" }}
            >
              <Menu style={{ marginRight: "6px" }} size={16}/>
              Tệp
            </button>
            {showFileMenu && (
              <div 
                onPointerDown={(e) => e.stopPropagation()}
                style={{ position: "absolute", top: "100%", right: 0, marginTop: "4px", width: "160px", backgroundColor: "white", border: "1px solid #e4e4e7", borderRadius: "6px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", zIndex: 50, padding: "4px 0", display: "flex", flexDirection: "column" }}>
                <button
                  onClick={() => { executeSave(); setShowFileMenu(false); }}
                  style={{ width: "100%", textAlign: "left", padding: "8px 16px", fontSize: "14px", color: "#374151", border: "none", backgroundColor: "transparent", cursor: "pointer" }}
                >
                  Lưu
                </button>
                <button
                  onClick={() => { handleExportPdf(); setShowFileMenu(false); }}
                  style={{ width: "100%", textAlign: "left", padding: "8px 16px", fontSize: "14px", color: "#374151", border: "none", backgroundColor: "transparent", cursor: "pointer" }}
                >
                  Xuất PDF
                </button>
                {mode === "template" && onSaveAsNew && (
                  <button
                    onClick={() => { onSaveAsNew(); setShowFileMenu(false); }}
                    style={{ width: "100%", textAlign: "left", padding: "8px 16px", fontSize: "14px", color: "#374151", border: "none", backgroundColor: "transparent", cursor: "pointer" }}
                  >
                    Save As
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {showLeftSidebar && (
          <aside
            style={{
              width: "240px",
              borderRight: "1px solid #e4e4e7",
              backgroundColor: "#ffffff",
              display: "flex",
              flexDirection: "column",
              zIndex: 20,
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid #e4e4e7",
                fontWeight: 600,
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Layers size={16} /> Lớp phần tử ({content.elements.length})
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {[...content.elements].reverse().map((el) => {
                const isSelected = selectedElementId === el.id;
                const Icon =
                  el.element_type === "Text"
                    ? Type
                    : el.element_type === "Checkbox"
                      ? CheckSquare
                      : ImageIcon;
                return (
                  <div
                    key={el.id}
                    id={`layer-item-${el.id}`}
                    className="layer-item"
                    onClick={() => {
                      setSelectedElementId(el.id);
                      const canvasItem = document.getElementById(
                        `canvas-item-${el.id}`,
                      );
                      if (canvasItem) {
                        canvasItem.scrollIntoView({
                          behavior: "smooth",
                          block: "nearest",
                          inline: "nearest",
                        });
                      }
                    }}
                    style={{
                      padding: "10px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      cursor: "pointer",
                      backgroundColor: isSelected ? "#f4f4f5" : "transparent",
                      borderLeft: isSelected
                        ? "3px solid #18181b"
                        : "3px solid transparent",
                      borderBottom: "1px solid #f4f4f5",
                    }}
                  >
                    <Icon color="#71717a" size={14} />
                    <span
                      style={{
                        fontSize: "13px",
                        color: isSelected ? "#18181b" : "#4b5563",
                        flex: 1,
                      }}
                    >
                      {el.element_type}
                    </span>
                    <div style={{ fontSize: "11px", color: "#a1a1aa" }}>
                      {el.position_x_mm}x{el.position_y_mm}
                    </div>
                    <div
                      style={{ opacity: 0, display: "flex", gap: "4px" }}
                      className="layer-actions"
                    >
                      <button
                        style={{
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                        }}
                        title="Lên 1 lớp"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveElement(el.id, "forward");
                        }}
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        style={{
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                        }}
                        title="Xuống 1 lớp"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveElement(el.id, "backward");
                        }}
                      >
                        <ArrowDown size={12} />
                      </button>
                      <button
                        style={{
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          color: "#dc2626",
                        }}
                        title="Xóa"
                        onClick={(e) => {
                          e.stopPropagation();
                          saveSnapshot();
                          setContent((prev) => ({
                            ...prev,
                            elements: prev.elements.filter(
                              (item) => item.id !== el.id,
                            ),
                          }));
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <style>{` .layer-actions { opacity: 0; } div:hover .layer-actions { opacity: 1; } `}</style>
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        <div
          ref={scrollContainerRef}
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "auto",
            backgroundColor: "#f4f4f5",
            cursor: isPanning ? "grabbing" : isSpacePressed ? "grab" : "default",
          }}
          onPointerDown={(e) => {
            if (isSpacePressed || e.button === 1) { // Phím space hoặc chuột giữa
              e.preventDefault();
              setIsPanning(true);
              panStartRef.current = {
                x: e.clientX,
                y: e.clientY,
                scrollLeft: scrollContainerRef.current?.scrollLeft || 0,
                scrollTop: scrollContainerRef.current?.scrollTop || 0,
              };
            } else {
              setSelectedElementId(null);
            }
          }}
          onPointerMove={(e) => {
            if (isPanning && scrollContainerRef.current) {
              const dx = e.clientX - panStartRef.current.x;
              const dy = e.clientY - panStartRef.current.y;
              scrollContainerRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
              scrollContainerRef.current.scrollTop = panStartRef.current.scrollTop - dy;
            }
          }}
          onPointerUp={() => {
            if (isPanning) setIsPanning(false);
          }}
        >
          <div
            style={{
              minWidth: "max-content",
              minHeight: "max-content",
              padding: "48px 32px 80px 32px",
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: `${mmToPx(content.page?.width_mm || 210) * zoom}px`,
                height: `${mmToPx(content.page?.height_mm || 297) * zoom}px`,
                position: "relative",
              }}
            >
              <div
                ref={canvasRef}
                style={{
                  width: `${mmToPx(content.page?.width_mm || 210)}px`,
                  height: `${mmToPx(content.page?.height_mm || 297)}px`,
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
                {content.elements.map((el, index) => {
                const props = (el.properties as any) || {};
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
                      if (el.element_type === "Text")
                        setEditingElementId(el.id);
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
                      saveSnapshot();
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
                          textDecoration: props.is_underline
                            ? "underline"
                            : "none",
                          textAlign: props.alignment || "left",
                          fontSize: props.font_size
                            ? `${props.font_size}px`
                            : "12px",
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
                      <ImageElement
                        assetId={props.asset_id}
                        width={el.width_mm}
                        height={el.height_mm}
                      />
                    )}

                    {isSelected &&
                      (
                        [
                          "nw",
                          "n",
                          "ne",
                          "e",
                          "se",
                          "s",
                          "sw",
                          "w",
                        ] as HandleType[]
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
                              saveSnapshot();
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
            </div>
          </div>
        </div>

        {showRightSidebar && (
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
                    ✕
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
                          saveSnapshot();
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
                          saveSnapshot();
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
                          saveSnapshot();
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
                          saveSnapshot();
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
                        value={selectedElement.properties.content || ""}
                        onChange={(e) => {
                          saveSnapshot();
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
                            background: selectedElement.properties.is_bold
                              ? "#f4f4f5"
                              : "#ffffff",
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            saveSnapshot();
                            updateElement({
                              ...selectedElement,
                              properties: {
                                ...selectedElement.properties,
                                is_bold: !selectedElement.properties.is_bold,
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
                            background: selectedElement.properties.is_italic
                              ? "#f4f4f5"
                              : "#ffffff",
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            saveSnapshot();
                            updateElement({
                              ...selectedElement,
                              properties: {
                                ...selectedElement.properties,
                                is_italic:
                                  !selectedElement.properties.is_italic,
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
                            background: selectedElement.properties.is_underline
                              ? "#f4f4f5"
                              : "#ffffff",
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            saveSnapshot();
                            updateElement({
                              ...selectedElement,
                              properties: {
                                ...selectedElement.properties,
                                is_underline:
                                  !selectedElement.properties.is_underline,
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
                              (selectedElement.properties.alignment ||
                                "left") === "left"
                                ? "#f4f4f5"
                                : "#ffffff",
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            saveSnapshot();
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
                              (selectedElement.properties.alignment ||
                                "left") === "center"
                                ? "#f4f4f5"
                                : "#ffffff",
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            saveSnapshot();
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
                              (selectedElement.properties.alignment ||
                                "left") === "right"
                                ? "#f4f4f5"
                                : "#ffffff",
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            saveSnapshot();
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
                      checked={!!selectedElement.properties.checked}
                      onChange={(e) => {
                        saveSnapshot();
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
                        assetId={selectedElement.properties.asset_id}
                        width={selectedElement.width_mm}
                        height={selectedElement.height_mm}
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
                    Lưới & Căn chỉnh
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
                      Hiển thị lưới chấm (5mm)
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
                  Tổng phần tử: {content.elements.length}
                </p>
              </div>
            )}
          </aside>
        )}
      </div>

      {contextMenu && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: "white",
            border: "1px solid #e4e4e7",
            borderRadius: "8px",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
            padding: "4px",
            zIndex: 100,
          }}
        >
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "100%",
              padding: "8px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: "13px",
            }}
            onClick={() => moveElement(contextMenu.elementId, "front")}
          >
            <ArrowUpToLine size={14} /> Lên trên cùng
          </button>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "100%",
              padding: "8px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: "13px",
            }}
            onClick={() => moveElement(contextMenu.elementId, "forward")}
          >
            <ArrowUp size={14} /> Lên một lớp
          </button>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "100%",
              padding: "8px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: "13px",
            }}
            onClick={() => moveElement(contextMenu.elementId, "backward")}
          >
            <ArrowDown size={14} /> Xuống một lớp
          </button>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "100%",
              padding: "8px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: "13px",
            }}
            onClick={() => moveElement(contextMenu.elementId, "back")}
          >
            <ArrowDownToLine size={14} /> Xuống dưới cùng
          </button>
          <div
            style={{
              height: "1px",
              backgroundColor: "#e4e4e7",
              margin: "4px 0",
            }}
          ></div>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "100%",
              padding: "8px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: "13px",
            }}
            onClick={() => {
              copySelected();
              setContextMenu(null);
            }}
          >
            <Copy size={14} /> Sao chép
          </button>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "100%",
              padding: "8px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: "13px",
              color: "red",
            }}
            onClick={() => {
              saveSnapshot();
              setContent((prev) => ({
                ...prev,
                elements: prev.elements.filter(
                  (el) => el.id !== contextMenu.elementId,
                ),
              }));
              setContextMenu(null);
            }}
          >
            <Trash2 size={14} /> Xóa
          </button>
        </div>
      )}

      {showCloseModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "24px",
              borderRadius: "12px",
              width: "320px",
              border: "1px solid #e4e4e7",
            }}
          >
            <h3
              style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 16px" }}
            >
              Chưa lưu thay đổi
            </h3>
            <p
              style={{
                fontSize: "14px",
                color: "#71717a",
                marginBottom: "24px",
              }}
            >
              Bạn có muốn lưu các thay đổi trước khi thoát không?
            </p>
            <div
              style={{
                display: "flex",
                gap: "8px",
                justifyContent: "flex-end",
              }}
            >
              <button
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #e4e4e7",
                  background: "white",
                  cursor: "pointer",
                }}
                onClick={() => setShowCloseModal(false)}
              >
                Hủy
              </button>
              <button
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#fef2f2",
                  color: "#991b1b",
                  cursor: "pointer",
                }}
                onClick={() => {
                  isForceClosingRef.current = true;
                  onClose();
                }}
              >
                Không lưu
              </button>
              <button
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#18181b",
                  color: "white",
                  cursor: "pointer",
                }}
                onClick={async () => {
                  try {
                    const success = await onSave();
                    if (success) {
                      isForceClosingRef.current = true;
                      onClose();
                    } else {
                      showToast("Lưu thất bại, không thể thoát!", "error");
                    }
                  } catch (err: any) {
                    showToast(
                      "Lỗi khi lưu: " + (err?.message || String(err)),
                      "error",
                    );
                  }
                }}
              >
                Lưu và thoát
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
