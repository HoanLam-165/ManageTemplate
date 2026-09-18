import { create } from 'zustand';

export interface ViewportState {
  showLeftSidebar: boolean;
  setShowLeftSidebar: (show: boolean) => void;
  showRightSidebar: boolean;
  setShowRightSidebar: (show: boolean) => void;
  showFileMenu: boolean;
  setShowFileMenu: (show: boolean) => void;
  showCloseModal: boolean;
  setShowCloseModal: (show: boolean) => void;
  zoom: number;
  handleZoomChange: (newZoom: number) => void;
  handleFitToScreen: () => void;
  isLandscape: boolean;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  snapEnabled: boolean;
  setSnapEnabled: (enabled: boolean) => void;
  isPanning: boolean;
  setIsPanning: (isPanning: boolean) => void;
  isDragging: boolean;
  setIsDragging: (isDragging: boolean) => void;
  isSpacePressed: boolean;
  setIsSpacePressed: (isSpacePressed: boolean) => void;
}

export const useViewportStore = create<ViewportState>((set) => ({
  showLeftSidebar: true,
  setShowLeftSidebar: (showLeftSidebar) => set({ showLeftSidebar }),
  showRightSidebar: true,
  setShowRightSidebar: (showRightSidebar) => set({ showRightSidebar }),
  showFileMenu: false,
  setShowFileMenu: (showFileMenu) => set({ showFileMenu }),
  showCloseModal: false,
  setShowCloseModal: (showCloseModal) => set({ showCloseModal }),
  zoom: 1,
  handleZoomChange: (zoom) => set({ zoom: Math.max(0.25, Math.min(3.0, zoom)) }),
  handleFitToScreen: () => set({ zoom: 1 }),
  isLandscape: false,
  showGrid: false,
  setShowGrid: (showGrid) => set({ showGrid }),
  snapEnabled: true,
  setSnapEnabled: (snapEnabled) => set({ snapEnabled }),
  isPanning: false,
  setIsPanning: (isPanning) => set({ isPanning }),
  isDragging: false,
  setIsDragging: (isDragging) => set({ isDragging }),
  isSpacePressed: false,
  setIsSpacePressed: (isSpacePressed) => set({ isSpacePressed }),
}));
