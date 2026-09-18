import { LayersPanel } from "./LayersPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { useDocumentStore } from "../../store/documentStore";
import { useViewportStore } from "../../store/viewportStore";
import { useEditorActionsStore } from "../../store/editorActionsStore";
import { useShallow } from "zustand/react/shallow";

export const WorkspaceSidebar = ({ 
  fileInputRef, 
  replaceImageElementId, 
  side 
}: { 
  fileInputRef: React.RefObject<HTMLInputElement>, 
  replaceImageElementId: React.MutableRefObject<string | null>,
  side: 'left' | 'right'
}) => {
  const {
    content,
    selectedElementId,
    setSelectedElementId,
    setContent,
    mode,
    description,
    setDescription,
  } = useDocumentStore(
    useShallow((state) => ({
      content: state.content,
      selectedElementId: state.selectedElementId,
      setSelectedElementId: state.setSelectedElementId,
      setContent: state.setContent,
      mode: state.mode,
      description: state.description,
      setDescription: state.setDescription,
    })),
  );
  
  const {
    showGrid,
    setShowGrid,
    snapEnabled,
    setSnapEnabled,
    isLandscape,
  } = useViewportStore(
    useShallow((state) => ({
      showGrid: state.showGrid,
      setShowGrid: state.setShowGrid,
      snapEnabled: state.snapEnabled,
      setSnapEnabled: state.setSnapEnabled,
      isLandscape: state.isLandscape,
    })),
  );

  const {
    moveElement,
    updateElement,
    setOrientation,
  } = useEditorActionsStore(
    useShallow((state) => ({
      moveElement: state.moveElement,
      updateElement: state.updateElement,
      setOrientation: state.setOrientation,
    })),
  );

  const selectedElement = content.elements.find(
    (e: any) => e.id === selectedElementId,
  );

  if (side === 'left') {
    return (
      <LayersPanel
        elements={content.elements}
        selectedElementId={selectedElementId}
        setSelectedElementId={setSelectedElementId}
        moveElement={moveElement}
        setContent={setContent}
      />
    );
  }

  return (
    <PropertiesPanel
      selectedElement={selectedElement}
      updateElement={updateElement}
      mode={mode}
      description={description}
      setDescription={setDescription}
      showGrid={showGrid}
      setShowGrid={setShowGrid}
      snapEnabled={snapEnabled}
      setSnapEnabled={setSnapEnabled}
      contentElementsLength={content.elements.length}
      setSelectedElementId={setSelectedElementId}
      replaceImageElementId={replaceImageElementId}
      fileInputRef={fileInputRef}
      isLandscape={isLandscape}
      setOrientation={setOrientation}
    />
  );
};
