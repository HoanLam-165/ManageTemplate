import { jsPDF } from "jspdf";

// Stress Test Document
const stressDocument = {
  pages: [
    {
      orientation: "portrait",
      size: "a4",
      elements: [
        { type: "text", x: 5, y: 5, text: "Top-left edge", fontSize: 10 },
        { type: "text", x: 205, y: 292, text: "Bottom-right edge", fontSize: 10, align: "right" },
        { type: "text", x: 10.5, y: 20.5, text: "Fractional 10.5, 20.5", fontSize: 12 },
        { type: "text", x: 10.5, y: 30.5, text: "Bold and Italic", fontSize: 12, fontStyle: "bold" },
        { type: "text", x: 10.5, y: 40.5, text: "Italic", fontSize: 12, fontStyle: "italic" },
        { type: "rect", x: 50, y: 50, width: 30, height: 30, color: "#FF0000", zIndex: 1 },
        { type: "rect", x: 60, y: 60, width: 30, height: 30, color: "#0000FF", zIndex: 2 },
        { type: "text", x: 65, y: 75, text: "Z-index test", fontSize: 10, zIndex: 3 },
      ],
    },
    {
      orientation: "landscape",
      size: "a4",
      elements: [
        { type: "text", x: 10, y: 10, text: "Landscape Page 2", fontSize: 20 },
        { type: "text", x: 10, y: 30, text: "This is a very long text block that should test wrapping and potential boundary clipping issues if it goes off the side of the page or hits the margins, but jsPDF handles text wrapping manually or by length, so we will just place a long string here to see how it behaves.", fontSize: 12 },
        { type: "image", x: 50, y: 80, width: 100, height: 50, data: "iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==" },
        { type: "rect", x: 50, y: 80, width: 100, height: 50, color: "#00FF00", zIndex: -1 },
      ],
    },
    {
        orientation: "portrait",
        size: "a4",
        elements: [
            { type: "text", x: 20, y: 20, text: "Page 3: Many Elements", fontSize: 16 },
            ...Array.from({length: 20}).map((_, i) => ({
                type: "rect",
                x: 10 + (i % 5) * 30,
                y: 50 + Math.floor(i / 5) * 30,
                width: 20,
                height: 20,
                color: i % 2 === 0 ? "#000000" : "#CCCCCC",
                zIndex: i
            }))
        ]
    }
  ],
};

function renderToPdf(docData, filename) {
  const doc = new jsPDF({ unit: "mm" });

  docData.pages.forEach((page, index) => {
    if (index > 0) doc.addPage(page.size, page.orientation);
    
    // Process elements by z-index
    const sortedElements = [...page.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    sortedElements.forEach((el) => {
      if (el.type === "text") {
        doc.setFontSize(el.fontSize);
        if (el.fontStyle === "bold") doc.setFont(undefined, "bold");
        else if (el.fontStyle === "italic") doc.setFont(undefined, "italic");
        else doc.setFont(undefined, "normal");
        
        doc.text(el.text, el.x, el.y, { align: el.align as any || 'left' });
      } else if (el.type === "rect") {
        doc.setFillColor(el.color);
        doc.rect(el.x, el.y, el.width, el.height, "F");
      } else if (el.type === "image") {
        doc.addImage(el.data, "PNG", el.x, el.y, el.width, el.height);
      }
    });
  });

  doc.save(filename);
}

// Generate twice to check determinism
renderToPdf(stressDocument, "stress-test-1.pdf");
renderToPdf(stressDocument, "stress-test-2.pdf");
console.log("PDFs generated: stress-test-1.pdf, stress-test-2.pdf");
