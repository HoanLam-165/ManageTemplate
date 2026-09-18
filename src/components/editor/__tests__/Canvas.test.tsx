import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Canvas } from '../Canvas';

// Mock stores
vi.mock('../../../store/documentStore', () => ({
  useDocumentStore: vi.fn(),
}));
vi.mock('../../../store/viewportStore', () => ({
  useViewportStore: vi.fn(),
}));
vi.mock('../../../store/editorActionsStore', () => ({
  useEditorActionsStore: vi.fn(),
}));
vi.mock('zustand/react/shallow', () => ({
  useShallow: (selector: any) => selector,
}));

import { useDocumentStore } from '../../../store/documentStore';
import { useViewportStore } from '../../../store/viewportStore';
import { useEditorActionsStore } from '../../../store/editorActionsStore';

describe('Canvas', () => {
  const mockSetSelectedElementId = vi.fn();
  const mockCanvasRef = { current: document.createElement('div') };

  beforeEach(() => {
    vi.clearAllMocks();

    (useDocumentStore as any).mockImplementation((selector: any) => selector({
      content: {
        page: { width_mm: 210, height_mm: 297 },
        elements: [
          { id: '1', element_type: 'Text', position_x_mm: 10, position_y_mm: 20, width_mm: 50, height_mm: 10, properties: { content: 'Test Text' } },
          { id: '2', element_type: 'Checkbox', position_x_mm: 30, position_y_mm: 40, width_mm: 10, height_mm: 10, properties: { checked: false } }
        ]
      },
      selectedElementId: null,
      setSelectedElementId: mockSetSelectedElementId,
    }));

    (useViewportStore as any).mockImplementation((selector: any) => selector({
      zoom: 1,
      showGrid: false,
    }));

    (useEditorActionsStore as any).mockImplementation((selector: any) => selector({
      updateElement: vi.fn(),
    }));
  });

  it('renders elements on the canvas correctly based on the document store state', () => {
    render(
      <Canvas 
        canvasRef={mockCanvasRef} 
        editingElementId={null}
        setEditingElementId={vi.fn()}
        setDragInfo={vi.fn()}
        setResizeInfo={vi.fn()}
        setContextMenu={vi.fn()}
      />
    );

    // Text element (10, 20 mm * 3.7795275591 px/mm ≈ 37.795275591, 75.590551182)
    const textElement = document.getElementById('canvas-item-1');
    expect(textElement).toBeDefined();
    // Chấp nhận sai số nhỏ do floating point bằng cách match phần đầu
    expect(textElement?.style.left).toMatch(/37.79527559/);
    expect(textElement?.style.top).toMatch(/75.59055118/);

    // Checkbox element (30, 40 mm * 3.7795275591 px/mm ≈ 113.385826773, 151.181102364)
    const checkboxElement = document.getElementById('canvas-item-2');
    expect(checkboxElement).toBeDefined();
    expect(checkboxElement?.style.left).toMatch(/113.38582677/);
    expect(checkboxElement?.style.top).toMatch(/151.18110236/);
  });

  it('calls setSelectedElementId when an element is clicked', () => {
    render(
      <Canvas 
        canvasRef={mockCanvasRef} 
        editingElementId={null}
        setEditingElementId={vi.fn()}
        setDragInfo={vi.fn()}
        setResizeInfo={vi.fn()}
        setContextMenu={vi.fn()}
      />
    );

    const textElement = document.getElementById('canvas-item-1');
    fireEvent.click(textElement!);

    expect(mockSetSelectedElementId).toHaveBeenCalledWith('1');
  });
});
