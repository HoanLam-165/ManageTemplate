import { jsPDF } from "jspdf";
import { DocumentContent } from "../App";
import { invoke } from "@tauri-apps/api/core";
import { ROBOTO_REGULAR_BASE64, ROBOTO_BOLD_BASE64 } from "./fontsBase64";

async function loadUnicodeFont(doc: jsPDF) {
  try {
    // Nạp font Regular
    doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_BASE64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');

    // Nạp font Bold
    doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD_BASE64);
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

    // Đặt font mặc định
    doc.setFont('Roboto');
  } catch (err) {
    console.warn("--> Dùng font helvetica dự phòng:", err);
    doc.setFont("helvetica", "normal");
  }
}

export async function exportToPdf(content: DocumentContent, fileName: string) {
  try {
    if (!content || !content.page) {
      throw new Error("Dữ liệu tài liệu không hợp lệ!");
    }

    const width = content.page.width_mm || 210;
    const height = content.page.height_mm || 297;
    const orientation = width > height ? "landscape" : "portrait";

    const doc = new jsPDF({
      unit: "mm",
      format: [width, height],
      orientation,
    });

    await loadUnicodeFont(doc);

    for (const el of content.elements) {
      const x = el.position_x_mm || 0;
      const y = el.position_y_mm || 0;
      const w = el.width_mm || 40;
      const h = el.height_mm || 10;
      const props = (el.properties as any) || {};

      switch (el.element_type) {
        case "Text": {
          doc.setFontSize(props.font_size || 12);
          doc.setFont("Roboto", props.is_bold ? "bold" : "normal");
          doc.text(String(props.content || ""), x, y, { baseline: "top", maxWidth: w });
          break;
        }
        case "Checkbox": {
          doc.rect(x, y, Math.min(w, h, 6), Math.min(w, h, 6));
          if (props.checked) {
            doc.setFontSize(10);
            doc.setFont("Roboto", "bold");
            doc.text("X", x + 1.2, y + 1.2, { baseline: "top" });
          }
          break;
        }
        case "Image": {
          const assetId = props.asset_id;
          if (assetId) {
            try {
              const dataUrl: string = await invoke("get_asset_base64", { id: assetId });
              doc.addImage(dataUrl, "PNG", x, y, w, h);
            } catch (err) {
              doc.rect(x, y, w, h);
            }
          } else {
            doc.rect(x, y, w, h);
          }
          break;
        }
      }
    }

    const safeName = (fileName || "document").replace(/[^a-zA-Z0-9_-]/g, "_") + ".pdf";
    doc.save(safeName);
  } catch (err: any) {
    console.error("--> Lỗi khi xuất PDF:", err);
    throw err;
  }
}
