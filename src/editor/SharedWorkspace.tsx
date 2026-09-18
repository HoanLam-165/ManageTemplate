import React, { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { emit } from "@tauri-apps/api/event";

import { Element } from "../App";
import { exportToPdf } from "./pdfExporter";
import { useDocumentAnalyzer } from "../hooks/useDocumentAnalyzer";
import { useFileHandler } from "../hooks/useFileHandler";
import { useToast } from "../components/Toast";
import { useDocumentStore } from "../store/documentStore";
import { useViewportStore } from "../store/viewportStore";
import { useEditorActionsStore } from "../store/editorActionsStore";
import { useElementInteraction } from "../hooks/useElementInteraction";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";

import { WorkspaceHeader } from "../components/editor/WorkspaceHeader";
import { WorkspaceSidebar } from "../components/editor/WorkspaceSidebar";
import { Canvas } from "../components/editor/Canvas";
import { ContextMenu } from "../components/editor/ContextMenu";
import { CloseModal } from "../components/editor/CloseModal";
import { deepEqual } from "./utils";
import { mmToPx } from "./coordinates";

export interface SharedWorkspaceProps {
  onSave: () => Promise<boolean>;
  onSaveAsNew?: () => void;
  onClose: () => void;
  lastSavedStateRef: React.MutableRefObject<string>;
}

export function SharedWorkspace({
  onSave,
  onSaveAsNew,
  onClose,
  lastSavedStateRef,
}: SharedWorkspaceProps) {
  const { showToast, ToastComponent } = useToast();
  const { analyzeImage } = useDocumentAnalyzer();
  const documentStore = useDocumentStore();
  const viewportStore = useViewportStore();
  const actionsStore = useEditorActionsStore();
  
  // Use selectors for needed state
  const mode = useDocumentStore((state) => state.mode);

  // 1. Dọn dẹp: Đã xóa useEffect đồng bộ props vào store (D02)

  // 2. Các Refs cục bộ quản lý DOM
  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceImageElementId = useRef<string | null>(null);
  const clipboardRef = useRef<Element | null>(null);
  const editingIdRef = useRef<string | null>(null);
  const isForceClosingRef = useRef(false);

  useEffect(() => {
    editingIdRef.current = documentStore.editingElementId;
  }, [documentStore.editingElementId]);
// 3. Tương tác kéo thả từ Hook
const { setDragInfo, setResizeInfo, contextMenu, setContextMenu } =
  useElementInteraction(
    { current: viewportStore.zoom }, // zoomRef
    viewportStore.snapEnabled,
    scrollContainerRef,
    canvasRef as React.RefObject<HTMLDivElement>,
  );

const { handleFileSelected, handleScanDocument } = useFileHandler(
  viewportStore.zoom,
  viewportStore.snapEnabled,
  scrollContainerRef,
  replaceImageElementId,
  analyzeImage,
  showToast
);
  // 4. Logic Zoom cuộn chuột
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
        const targetZoom = Math.min(
          3.0,
          Math.max(0.25, Math.round(viewportStore.zoom * zoomFactor * 100) / 100),
        );

        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const newScrollLeft =
          (container.scrollLeft + mouseX) * (targetZoom / viewportStore.zoom) - mouseX;
        const newScrollTop =
          (container.scrollTop + mouseY) * (targetZoom / viewportStore.zoom) - mouseY;

        viewportStore.handleZoomChange(targetZoom);

        requestAnimationFrame(() => {
          container.scrollLeft = newScrollLeft;
          container.scrollTop = newScrollTop;
        });
      }
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [viewportStore.zoom, viewportStore.handleZoomChange]);

  // 5. Logic Copy/Paste
  const copySelected = () => {
    const selectedElementId = useDocumentStore.getState().selectedElementId;
    if (!selectedElementId) return;
    const target = useDocumentStore.getState().content.elements.find(
      (el) => el.id === selectedElementId,
    );
    if (target) {
      clipboardRef.current = structuredClone(target);
      showToast("Đã sao chép phần tử!", "success");
    }
  };

  const pasteClipboard = () => {
    if (!clipboardRef.current) return;
    const source = clipboardRef.current;
    const newEl: Element = {
      ...structuredClone(source),
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      position_x_mm: source.position_x_mm + 5,
      position_y_mm: source.position_y_mm + 5,
    };
    clipboardRef.current = structuredClone(newEl);
    useDocumentStore.getState().setContent((prev) => ({ ...prev, elements: [...prev.elements, newEl] }));
    useDocumentStore.getState().setSelectedElementId(newEl.id);
    showToast("Đã dán phần tử!", "success");
  };

  const executeSave = async () => {
    try {
      const success = await onSave();
      if (success !== false) {
        lastSavedStateRef.current = JSON.stringify({
          name: useDocumentStore.getState().name,
          ...(mode === "template" ? { description: useDocumentStore.getState().description } : {}),
          content: useDocumentStore.getState().content,
        });
        await emit("item-saved");
        showToast("Đã lưu thành công!", "success");
      }
    } catch (err: any) {
      showToast("Lỗi khi lưu: " + (err?.message || String(err)), "error");
    }
  };

  // 8. Logic Save & Thoát
  useEffect(() => {
    const unlistenPromise = getCurrentWindow().onCloseRequested((event) => {
      if (!isForceClosingRef.current && checkIsDirty()) {
        event.preventDefault();
        viewportStore.setShowCloseModal(true);
      }
    });
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  const checkIsDirty = (): boolean => {
    const store = useDocumentStore.getState();
    const currentMeta = {
      name: store.name,
      ...(store.mode === "template" ? { description: store.description } : {}),
      content: store.content,
    };
    try {
      const lastSaved = JSON.parse(lastSavedStateRef.current);
      return !deepEqual(currentMeta, lastSaved);
    } catch (e) {
      return lastSavedStateRef.current !== JSON.stringify(currentMeta);
    }
  };

  const handleBack = () => {
    if (checkIsDirty()) {
      viewportStore.setShowCloseModal(true);
    } else {
      onClose();
    }
  };

  // 6. Hook Phím tắt
  useKeyboardShortcuts({
    viewportStore,
    actionsStore,
    editingIdRef,
    copySelected,
    pasteClipboard,
    executeSave,
    showToast,
  });

  const handleExportPdf = async () => {
    showToast("Đang khởi tạo và xuất PDF...", "loading");
    try {
      await exportToPdf(useDocumentStore.getState().content, useDocumentStore.getState().name);
      showToast("Xuất PDF thành công!", "success");
    } catch (err: any) {
      showToast("Xuất PDF thất bại: " + (err.message || String(err)), "error");
    }
  };

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

      <WorkspaceHeader
        fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
        onFileSelected={handleFileSelected}
        onScanDocument={handleScanDocument}
        onExportPdf={handleExportPdf}
        onExecuteSave={executeSave}
        onHandleBack={handleBack}
        onSetOrientation={actionsStore.setOrientation}
        onSaveAsNew={onSaveAsNew}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {viewportStore.showLeftSidebar && (
          <WorkspaceSidebar
            side="left"
            fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
            replaceImageElementId={replaceImageElementId}
          />
        )}

        <div
          ref={scrollContainerRef}
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "auto",
            backgroundColor: "#f4f4f5",
            cursor: viewportStore.isPanning
              ? "grabbing"
              : viewportStore.isSpacePressed
                ? "grab"
                : "default",
          }}
          onPointerDown={(e) => {
            if (viewportStore.isSpacePressed || e.button === 1) {
              e.preventDefault();
              viewportStore.setIsPanning(true);
            } else {
              useDocumentStore.getState().setSelectedElementId(null);
              setContextMenu(null);
            }
          }}
          onPointerUp={() => viewportStore.setIsPanning(false)}
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
                width: `${mmToPx(useDocumentStore.getState().content.page?.width_mm || 210) * viewportStore.zoom}px`,
                height: `${mmToPx(useDocumentStore.getState().content.page?.height_mm || 297) * viewportStore.zoom}px`,
                position: "relative",
              }}
            >
              <Canvas
                canvasRef={canvasRef as React.RefObject<HTMLDivElement>}
                editingElementId={useDocumentStore.getState().editingElementId}
                setEditingElementId={useDocumentStore.getState().setEditingElementId}
                setDragInfo={setDragInfo}
                setResizeInfo={setResizeInfo}
                setContextMenu={setContextMenu}
              />
            </div>
          </div>
        </div>

        {viewportStore.showRightSidebar && (
          <WorkspaceSidebar
            side="right"
            fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
            replaceImageElementId={replaceImageElementId}
          />
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          elementId={contextMenu.elementId}
          onClose={() => setContextMenu(null)}
          onMoveElement={(id, dir) => actionsStore.moveElement(id, dir)}
          onCopy={copySelected}
          onDelete={() => {
            useDocumentStore.getState().setContent((prev) => ({
              ...prev,
              elements: prev.elements.filter(
                (el) => el.id !== contextMenu.elementId,
              ),
            }));
            setContextMenu(null);
          }}
        />
      )}

      {viewportStore.showCloseModal && (
        <CloseModal
          onCancel={() => viewportStore.setShowCloseModal(false)}
          onDiscard={() => {
            isForceClosingRef.current = true;
            onClose();
          }}
          onSave={async () => {
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
        />
      )}
    </div>
  );
}
