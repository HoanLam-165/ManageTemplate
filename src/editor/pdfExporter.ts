import { jsPDF } from "jspdf";
import { DocumentContent } from "../App";
import { invoke } from "@tauri-apps/api/core";

async function loadUnicodeFont(doc: jsPDF) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Font loading timed out")), 5000)
  );

  try {
    const fontUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf";
    const fontBoldUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf";
    
    const [regularBuffer, boldBuffer] = await Promise.race([
      Promise.all([
        fetch(fontUrl).then(res => res.arrayBuffer()),
        fetch(fontBoldUrl).then(res => res.arrayBuffer()),
      ]),
      timeoutPromise as Promise<[ArrayBuffer, ArrayBuffer]>
    ]);

    const toBase64 = (buf: ArrayBuffer) => {
      let binary = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    };

    doc.addFileToVFS("Roboto-Regular.ttf", toBase64(regularBuffer));
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");

    doc.addFileToVFS("Roboto-Bold.ttf", toBase64(boldBuffer));
    doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
    
    doc.setFont("Roboto", "normal");
  } catch (err) {
    console.warn("--> Không thể tải font Unicode, dùng font mặc định:", err);
    doc.setFont("helvetica", "normal");
  }
}

export async function exportToPdf(content: DocumentContent, fileName: string) {
  console.log("--> Bắt đầu khởi tạo PDF với nội dung:", content);
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

    // Cache to hold Base64 data for images during export
    // const imageCache: Record<number, string> = {};

    console.log(`--> Đang vẽ ${content.elements.length} phần tử lên PDF...`);

    for (const el of content.elements) {
      const x = el.position_x_mm || 0;
      const y = el.position_y_mm || 0;
      const w = el.width_mm || 40;
      const h = el.height_mm || 10;
      const props = (el.properties as any) || {};

      switch (el.element_type) {
        case "Text": {
          doc.setFontSize(props.font_size || 12);
          const isBold = props.is_bold;
          doc.setFont("Roboto", isBold ? "bold" : "normal");
          doc.text(String(props.content || ""), x, y, { baseline: "top", maxWidth: w });
          break;
        }
        case "Number": {
          doc.setFontSize(12);
          doc.setFont("Roboto", "normal");
          doc.text(String(props.value ?? 0), x, y, { baseline: "top" });
          break;
        }
        case "Date": {
          doc.setFontSize(12);
          doc.setFont("Roboto", "normal");
          doc.text(String(props.value || "DD/MM/YYYY"), x, y, { baseline: "top" });
          break;
        }
        case "Select": {
          doc.setFontSize(12);
          doc.setFont("Roboto", "normal");
          doc.text(String(props.selected || "-"), x, y, { baseline: "top" });
          break;
        }
        case "Checkbox": {
          doc.rect(x, y, Math.min(w, h, 6), Math.min(w, h, 6));
          if (props.checked) {
            doc.setFontSize(12);
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
              console.warn("Không thể nhúng ảnh PDF #" + assetId, err);
              doc.rect(x, y, w, h);
              doc.text("[Image]", x + 2, y + 2, { baseline: "top" });
            }
          } else {
            doc.rect(x, y, w, h);
          }
          break;
        }
      }
    }

    const safeName = (fileName || "document").replace(/[^a-zA-Z0-9_-]/g, "_") + ".pdf";

    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = safeName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    console.log("--> Xuất PDF thành công:", safeName);
  } catch (err: any) {
    console.error("--> Lỗi khi xuất PDF:", err);
    throw err;
  }
}
