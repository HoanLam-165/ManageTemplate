import { useEffect, MutableRefObject } from 'react';
import { useDocumentStore } from '../store/documentStore';
import { ViewportState } from '../store/viewportStore';
import { EditorActionsState } from '../store/editorActionsStore';

interface KeyboardShortcutParams {
  viewportStore: ViewportState;
  actionsStore: EditorActionsState;
  editingIdRef: MutableRefObject<string | null>;
  copySelected: () => void;
  pasteClipboard: () => void;
  executeSave: () => Promise<void>;
  showToast: (message: string, type: 'success' | 'error' | 'loading') => void;
}

export function useKeyboardShortcuts({
  viewportStore,
  actionsStore,
  editingIdRef,
  copySelected,
  pasteClipboard,
  executeSave,
  showToast,
}: KeyboardShortcutParams) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (
        editingIdRef.current !== null ||
        activeTag === "input" ||
        activeTag === "textarea"
      )
        return;

      const isCtrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (isCtrl && key === "s") {
        e.preventDefault();
        executeSave();
        return;
      }
      if (isCtrl && key === "z" && !e.shiftKey) {
        e.preventDefault();
        useDocumentStore.temporal.getState().undo();
        return;
      }
      if (isCtrl && ((key === "z" && e.shiftKey) || key === "y")) {
        e.preventDefault();
        useDocumentStore.temporal.getState().redo();
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
      if (
        (key === "delete" || key === "backspace") &&
        useDocumentStore.getState().selectedElementId
      ) {
        e.preventDefault();
        useDocumentStore.getState().setContent((prev) => ({
          ...prev,
          elements: prev.elements.filter(
            (el) => el.id !== useDocumentStore.getState().selectedElementId,
          ),
        }));
        useDocumentStore.getState().setSelectedElementId(null);
        showToast("Đã xóa phần tử!", "success");
        return;
      }
      if (
        ["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key) &&
        useDocumentStore.getState().selectedElementId
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        useDocumentStore.getState().setContent((prev) => ({
          ...prev,
          elements: prev.elements.map((el) => {
            if (el.id !== useDocumentStore.getState().selectedElementId) return el;
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
      if (isCtrl && (key === "=" || key === "+")) {
        e.preventDefault();
        viewportStore.handleZoomChange(viewportStore.zoom + 0.15);
      } else if (isCtrl && (key === "-" || key === "_")) {
        e.preventDefault();
        viewportStore.handleZoomChange(viewportStore.zoom - 0.15);
      } else if (isCtrl && key === "0") {
        e.preventDefault();
        viewportStore.handleZoomChange(1.0);
      } else if (e.shiftKey && key === "!") {
        e.preventDefault();
        viewportStore.handleFitToScreen();
      } else if (e.code === "Space" && !e.repeat && !viewportStore.isSpacePressed) {
        viewportStore.setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        viewportStore.setIsSpacePressed(false);
        viewportStore.setIsPanning(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    viewportStore.zoom,
    viewportStore.isSpacePressed,
    editingIdRef,
    viewportStore,
    actionsStore,
    copySelected,
    pasteClipboard,
    executeSave,
    showToast
  ]);
}
