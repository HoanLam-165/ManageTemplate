import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorActionsStore } from '../editorActionsStore';
import { useDocumentStore } from '../documentStore';

describe('useEditorActionsStore', () => {
  beforeEach(() => {
    // Reset store state
    useDocumentStore.setState({
      mode: 'document',
      name: 'Untitled',
      content: { schema_version: '1.0', page: { width_mm: 210, height_mm: 297, margin_left_mm: 0, margin_right_mm: 0, margin_top_mm: 0, margin_bottom_mm: 0 }, elements: [] },
      selectedElementId: null,
      editingElementId: null,
    });
    
    // Reset temporal
    useDocumentStore.temporal.getState().pastStates = [];
    useDocumentStore.temporal.getState().futureStates = [];
  });

  it('should add Text and Checkbox elements correctly', () => {
    const { addElement } = useEditorActionsStore.getState();
    addElement('Text');
    
    const state = useDocumentStore.getState();
    expect(state.content.elements).toHaveLength(1);
    expect(state.content.elements[0].element_type).toBe('Text');
    expect(state.selectedElementId).toBe(state.content.elements[0].id);

    addElement('Checkbox');
    expect(useDocumentStore.getState().content.elements).toHaveLength(2);
    expect(useDocumentStore.getState().content.elements[1].element_type).toBe('Checkbox');
  });

  it('should update element immutably', () => {
    const { addElement, updateElement } = useEditorActionsStore.getState();
    addElement('Text');
    const el = useDocumentStore.getState().content.elements[0];
    
    const updatedEl = { ...el, properties: { ...el.properties, content: 'Updated Text' } };
    updateElement(updatedEl);
    
    expect(useDocumentStore.getState().content.elements[0].properties.content).toBe('Updated Text');
  });

  it('should move element using z-index logic', () => {
    const { addElement, moveElement } = useEditorActionsStore.getState();
    addElement('Text'); // id1
    addElement('Text'); // id2
    
    const id1 = useDocumentStore.getState().content.elements[0].id;
    
    moveElement(id1, 'front');
    expect(useDocumentStore.getState().content.elements[1].id).toBe(id1);
  });

  it('should handle undo/redo history', () => {
    const { addElement } = useEditorActionsStore.getState();
    const { temporal } = useDocumentStore;
    
    // Ban đầu history rỗng
    expect(temporal.getState().pastStates.length).toBe(0);
    
    addElement('Text'); // addElement gọi setContent của documentStore, temporal sẽ tự track
    
    // Sau khi thêm phần tử, pastStates cần tăng lên
    expect(temporal.getState().pastStates.length).toBeGreaterThan(0);
  });
});
