import { useState, useRef, useEffect, useCallback } from "react";
import { DocumentContent } from "../App";
import { mmToPx } from "../editor/coordinates";

export function useViewport(
  content: DocumentContent,
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
) {
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [showLeftSidebar, setShowLeftSidebar] = useState<boolean>(true);
  const [showRightSidebar, setShowRightSidebar] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1);
  const zoomRef = useRef(zoom);
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);

  const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0];

  const handleZoomChange = useCallback((newZoom: number, focalPoint?: { x: number; y: number }) => {
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
  }, [scrollContainerRef]);

  const handleFitToScreen = useCallback(() => {
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
  }, [content.page?.height_mm, content.page?.width_mm, scrollContainerRef]);

  // Zoom with scrollwheel
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
  }, [scrollContainerRef]);

  return {
    showGrid, setShowGrid,
    snapEnabled, setSnapEnabled,
    showLeftSidebar, setShowLeftSidebar,
    showRightSidebar, setShowRightSidebar,
    zoom, zoomRef,
    isSpacePressed, setIsSpacePressed,
    isPanning, setIsPanning,
    ZOOM_PRESETS,
    handleZoomChange,
    handleFitToScreen
  };
}
