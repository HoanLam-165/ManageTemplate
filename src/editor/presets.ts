import { Element, ElementType } from "../App";

export interface Preset {
  id: string;
  label: string;
  elements: {
    element_type: ElementType;
    properties: any;
    width_mm?: number;
    height_mm?: number;
  }[];
}

export const PRESETS: Preset[] = [
  {
    id: "label-value",
    label: "Nhãn + nội dung",
    elements: [
      {
        element_type: "Text",
        properties: { type: "Text", content: "Nhãn:", font_family: "Arial", font_size: 12, is_bold: true, is_italic: false, is_underline: false, alignment: "left" },
        width_mm: 30,
        height_mm: 10,
      },
      {
        element_type: "Text",
        properties: { type: "Text", content: "", font_family: "Arial", font_size: 12, is_bold: false, is_italic: false, is_underline: false, alignment: "left" },
        width_mm: 50,
        height_mm: 10,
      },
    ],
  },
];

export function generateElementsFromPreset(preset: Preset, startX: number, startY: number): Element[] {
  let currentX = startX;
  const gap = 5;

  return preset.elements.map((el) => {
    const width = el.width_mm || 40;
    const element: Element = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      element_type: el.element_type,
      position_x_mm: currentX,
      position_y_mm: startY,
      width_mm: width,
      height_mm: el.height_mm || 10,
      properties: structuredClone(el.properties),
    };

    currentX += width + gap;
    return element;
  });
}
