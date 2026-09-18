import { useState, useRef, useEffect } from "react";
import { pxToMm, mmToPx } from "../editor/coordinates";
import { snapVal } from "../editor/utils";
import { useViewportStore } from "../store/viewportStore";
import { useDocumentStore } from "../store/documentStore";

type HandleType = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export function useElementInteraction(
  zoomRef: React.MutableRefObject<number>,
  snapEnabled: boolean,
  scrollContainerRef: React.RefObject<HTMLDivElement | null>,
  canvasRef: React.RefObject<HTMLDivElement | null>,
) {
  const setIsDragging = useViewportStore((state) => state.setIsDragging);

  const [dragInfo, setDragInfo] = useState<{
    elementId: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  
  useEffect(() => {
    setIsDragging(!!dragInfo);
  }, [dragInfo, setIsDragging]);

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

  useEffect(() => {
    setIsDragging(!!resizeInfo);
  }, [resizeInfo, setIsDragging]);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    elementId: string;
  } | null>(null);
  const tempStateRef = useRef<{
    id: string;
    x: number;
    y: number;
    w?: number;
    h?: number;
  } | null>(null);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const isAlt = e.altKey;
      const currentZoom = zoomRef.current;

      if (dragInfo && !resizeInfo) {
        if (scrollContainerRef.current) {
          const sRect = scrollContainerRef.current.getBoundingClientRect();
          const threshold = 60;
          const speed = 12;
          if (e.clientY < sRect.top + threshold)
            scrollContainerRef.current.scrollTop -= speed;
          else if (e.clientY > sRect.bottom - threshold)
            scrollContainerRef.current.scrollTop += speed;
        }

        const curX = pxToMm((e.clientX - rect.left) / currentZoom);
        const curY = pxToMm((e.clientY - rect.top) / currentZoom);
        let newX = Math.max(0, curX - dragInfo.offsetX);
        let newY = Math.max(0, curY - dragInfo.offsetY);

        if (snapEnabled && !isAlt) {
          newX = snapVal(newX, 5);
          newY = snapVal(newY, 5);
        } else {
          newX = Math.round(newX * 10) / 10;
          newY = Math.round(newY * 10) / 10;
        }

        const node = document.getElementById(
          `canvas-item-${dragInfo.elementId}`,
        );
        if (node) {
          node.style.left = `${mmToPx(newX)}px`;
          node.style.top = `${mmToPx(newY)}px`;
        }

        tempStateRef.current = { id: dragInfo.elementId, x: newX, y: newY };
      } else if (resizeInfo) {
        const totalDeltaX = pxToMm(
          (e.clientX - resizeInfo.startX) / currentZoom,
        );
        const totalDeltaY = pxToMm(
          (e.clientY - resizeInfo.startY) / currentZoom,
        );
        const { handle, elementId, initX, initY, initW, initH } = resizeInfo;
        const minW = 5,
          minH = 5;

        const currentEl = useDocumentStore.getState().content.elements.find(
          (el) => el.id === elementId,
        );
        const isImage = currentEl?.element_type === "Image";
        const lockAspect = isImage || e.shiftKey;
        const aspectRatio = initW / (initH || 1);

        let newX = initX,
          newY = initY,
          newW = initW,
          newH = initH;

        if (lockAspect && ["nw", "ne", "se", "sw"].includes(handle)) {
          let delta =
            Math.abs(totalDeltaX) > Math.abs(totalDeltaY)
              ? totalDeltaX
              : totalDeltaY;
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
          if (handle.includes("e")) {
            const rawW = initW + totalDeltaX;
            newW = Math.max(
              minW,
              snapEnabled && !isAlt ? snapVal(initX + rawW, 5) - initX : rawW,
            );
          } else if (handle.includes("w")) {
            const rightEdge = initX + initW;
            const rawX = initX + totalDeltaX;
            newX = Math.min(
              rightEdge - minW,
              snapEnabled && !isAlt ? snapVal(rawX, 5) : rawX,
            );
            newW = rightEdge - newX;
          }
          if (handle.includes("s")) {
            const rawH = initH + totalDeltaY;
            newH = Math.max(
              minH,
              snapEnabled && !isAlt ? snapVal(initY + rawH, 5) - initY : rawH,
            );
          } else if (handle.includes("n")) {
            const bottomEdge = initY + initH;
            const rawY = initY + totalDeltaY;
            newY = Math.min(
              bottomEdge - minH,
              snapEnabled && !isAlt ? snapVal(rawY, 5) : rawY,
            );
            newH = bottomEdge - newY;
          }
        }

        newX = Math.round(newX * 10) / 10;
        newY = Math.round(newY * 10) / 10;
        newW = Math.round(newW * 10) / 10;
        newH = Math.round(newH * 10) / 10;

        const node = document.getElementById(`canvas-item-${elementId}`);
        if (node) {
          node.style.left = `${mmToPx(newX)}px`;
          node.style.top = `${mmToPx(newY)}px`;
          node.style.width = `${mmToPx(newW)}px`;
          node.style.height = `${mmToPx(newH)}px`;
        }

        tempStateRef.current = {
          id: elementId,
          x: newX,
          y: newY,
          w: newW,
          h: newH,
        };
      }
    };

    const handlePointerUp = () => {
      if (tempStateRef.current) {
        const { id, x, y, w, h } = tempStateRef.current;
        useDocumentStore.getState().setContent((prev) => ({
          ...prev,
          elements: prev.elements.map((el) => 
            el.id === id ? { ...el, position_x_mm: x, position_y_mm: y, width_mm: w ?? el.width_mm, height_mm: h ?? el.height_mm } : el
          )
        }));
      }
      setDragInfo(null);
      setResizeInfo(null);
      tempStateRef.current = null;
    };

    if (dragInfo || resizeInfo) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    }
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragInfo, resizeInfo, snapEnabled, canvasRef, scrollContainerRef, zoomRef]);

  return { dragInfo, setDragInfo, resizeInfo, setResizeInfo, contextMenu, setContextMenu };
}
