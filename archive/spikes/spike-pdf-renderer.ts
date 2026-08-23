import { jsPDF } from "jspdf";

// Constants
const MM_TO_PT = 2.83465;

// Minimal JSON test document
const testDocument = {
  pages: [
    {
      orientation: "portrait",
      size: "a4",
      elements: [
        { type: "text", x: 20, y: 20, text: "Portrait A4: Hello World", fontSize: 16, align: "left" },
        { type: "text", x: 100, y: 100, text: "Bold Text", fontSize: 12, fontStyle: "bold" },
        { type: "rect", x: 30, y: 30, width: 50, height: 50, color: "#FF0000", zIndex: 1 },
        { type: "rect", x: 50, y: 50, width: 50, height: 50, color: "#0000FF", zIndex: 2 },
        { type: "image", x: 10, y: 150, width: 40, height: 40, data: "iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==" },
      ],
    },
    {
      orientation: "landscape",
      size: "a4",
      elements: [
        { type: "text", x: 20, y: 20, text: "Landscape A4: Overlap Test", fontSize: 16, align: "center" },
        { type: "rect", x: 100, y: 50, width: 50, height: 50, color: "#00FF00", zIndex: 1 },
        { type: "rect", x: 120, y: 70, width: 50, height: 50, color: "#FF00FF", zIndex: 2 },
        { type: "text", x: 20, y: 150, text: "Long text example to test rendering limits over multiple lines in the generated pdf document.", fontSize: 10, align: "left" },
      ],
    },
  ],
};

function renderToPdf(docData) {
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
        
        doc.text(el.text, el.x, el.y, { align: el.align as any });
      } else if (el.type === "rect") {
        doc.setFillColor(el.color);
        doc.rect(el.x, el.y, el.width, el.height, "F");
      } else if (el.type === "image") {
        doc.addImage(el.data, "PNG", el.x, el.y, el.width, el.height);
      }
    });
  });

  doc.save("spike-output.pdf");
}

renderToPdf(testDocument);
console.log("PDF generated successfully: spike-output.pdf");
