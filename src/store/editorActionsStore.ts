import { create } from 'zustand';
import { Element } from '../App';
import { useDocumentStore } from './documentStore';
import { useViewportStore } from './viewportStore';
import { snapVal } from '../editor/utils';
import { pxToMm } from '../editor/coordinates';

export interface EditorActionsState {
  isAnalyzing: boolean;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  addElement: (type: "Text" | "Checkbox" | "Image", scrollContainer?: HTMLDivElement | null) => void;
  moveElement: (id: string, direction: "front" | "back" | "forward" | "backward") => void;
  updateElement: (el: Element) => void;
  setOrientation: (orientation: "portrait" | "landscape") => void;
}

export const useEditorActionsStore = create<EditorActionsState>()((set) => ({
    isAnalyzing: false,
    setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),

    addElement: (type, scrollContainer) => {
      const { content, setContent } = useDocumentStore.getState();
      const { zoom } = useViewportStore.getState();
      const snapEnabled = useViewportStore.getState().snapEnabled;
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
      let initialW = 50, initialH = 10;
      if (type === "Checkbox") {
        initialProps = { type: "Checkbox", checked: false };
        initialW = 10;
        initialH = 10;
      } else if (type === "Image") {
        initialProps = { type: "Image", asset_id: -1 };
        initialW = 50;
        initialH = 50;
      }

      let scrollYPx = scrollContainer ? scrollContainer.scrollTop : 0;
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

      setContent({ ...content, elements: [...content.elements, newEl] });
      useDocumentStore.getState().setSelectedElementId(newEl.id);
    },

    moveElement: (id, direction) => {
      const { content, setContent } = useDocumentStore.getState();
      const elements = [...content.elements];
      const index = elements.findIndex((e) => e.id === id);
      if (index === -1) return;

      const [el] = elements.splice(index, 1);

      if (direction === "front") elements.push(el);
      else if (direction === "back") elements.unshift(el);
      else if (direction === "forward") {
        const newIndex = Math.min(elements.length, index + 1);
        elements.splice(newIndex, 0, el);
      } else if (direction === "backward") {
        const newIndex = Math.max(0, index - 1);
        elements.splice(newIndex, 0, el);
      }
      setContent({ ...content, elements });
    },

    updateElement: (el) => {
      const { content, setContent } = useDocumentStore.getState();
      setContent({ ...content, elements: content.elements.map((e) => (e.id === el.id ? el : e)) });
    },

    setOrientation: (orientation) => {
      const { content, setContent } = useDocumentStore.getState();
      const isLandscape = content.page.width_mm > content.page.height_mm;
      if (
        (orientation === "landscape" && isLandscape) ||
        (orientation === "portrait" && !isLandscape)
      )
        return;
      setContent({
        ...content,
        page: {
          ...content.page,
          width_mm: content.page.height_mm,
          height_mm: content.page.width_mm,
        },
      });
    },
  })
);
