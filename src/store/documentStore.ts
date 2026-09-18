import { create } from 'zustand';
import { temporal } from 'zundo';
import { DocumentContent } from '../App';

export interface DocumentState {
  mode: "template" | "document";
  setMode: (mode: "template" | "document") => void;
  name: string;
  setName: (name: string) => void;
  description?: string;
  setDescription: (description: string) => void;
  content: DocumentContent;
  setContent: (content: DocumentContent | ((prev: DocumentContent) => DocumentContent)) => void;
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  editingElementId: string | null;
  setEditingElementId: (id: string | null) => void;
}

export const useDocumentStore = create<DocumentState>()(
  temporal(
    (set) => ({
      mode: "document",
      setMode: (mode) => set({ mode }),
      name: "Untitled",
      setName: (name) => set({ name }),
      description: "",
      setDescription: (description) => set({ description }),
      content: { schema_version: "1.0", page: { width_mm: 210, height_mm: 297, margin_left_mm: 20, margin_right_mm: 20, margin_top_mm: 20, margin_bottom_mm: 20 }, elements: [] },
      setContent: (content) => set((state) => ({ 
        content: typeof content === 'function' ? content(state.content) : content 
      })),
      selectedElementId: null,
      setSelectedElementId: (selectedElementId) => set({ selectedElementId }),
      editingElementId: null,
      setEditingElementId: (editingElementId) => set({ editingElementId }),
    }),
    { 
      partialize: (state) => ({ content: state.content, selectedElementId: state.selectedElementId }) 
    }
  )
);
