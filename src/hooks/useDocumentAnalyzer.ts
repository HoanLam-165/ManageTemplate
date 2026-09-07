import { useState } from 'react';

export function useDocumentAnalyzer() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeImage = async (file: File) => {
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://127.0.0.1:8000/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('API error');
      
      const json = await response.json();
      if (json.status === 'success') {
        const rawElements = json.data.elements;
        
        // LOG RA ĐỂ KIỂM TRA DỮ LIỆU THẬT
        console.log("Dữ liệu thô từ Backend:", rawElements);

        // Chuẩn hóa (Map) dữ liệu API về đúng chuẩn Element của React
        const mappedElements = rawElements.map((el: any) => {
          const id = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          
          if (el.type === 'Text' || el.type === 'text') {
            return {
              id,
              element_type: 'Text',
              position_x_mm: el.x || 0,
              position_y_mm: el.y || 0,
              width_mm: el.w || 50,
              height_mm: el.h || 10,
              properties: {
                type: 'Text',
                content: el.content || "Văn bản mới",
                font_family: "Roboto-Regular",
                font_size: 12,
                is_bold: false,
                is_italic: false,
                is_underline: false,
                alignment: "left",
              }
            };
          }
          if (el.type === 'Checkbox' || el.type === 'checkbox') {
            return {
              id,
              element_type: 'Checkbox',
              position_x_mm: el.x || 0,
              position_y_mm: el.y || 0,
              width_mm: el.w || 10,
              height_mm: el.h || 10,
              properties: {
                type: 'Checkbox',
                checked: el.checked || false,
              }
            };
          }
          return null;
        }).filter((el: any) => el !== null);

        console.log("Dữ liệu sau khi Map chuẩn:", mappedElements);
        return mappedElements;
      }
      return [];
    } catch (error) {
      console.error("Lỗi khi phân tích tài liệu:", error);
      alert("Không thể kết nối đến Analyzer Backend (127.0.0.1:8000)");
      return [];
    } finally {
      setIsAnalyzing(false);
    }
  };

  return { analyzeImage, isAnalyzing };
}
