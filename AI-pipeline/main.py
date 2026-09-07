import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from paddleocr import PaddleOCR
import math

app = FastAPI(title="Template Workspace CV API")

# Khởi tạo PaddleOCR (Tự động tải pre-trained model tiếng Việt lần đầu chạy)
ocr_engine = PaddleOCR(use_angle_cls=True, lang='vi')

# Kích thước chuẩn Pixel (Tỷ lệ A4) và kích thước thực (mm)
TARGET_WIDTH_PX, TARGET_HEIGHT_PX = 840, 1188
A4_WIDTH_MM, A4_HEIGHT_MM = 210.0, 297.0

# Tỷ lệ quy đổi Pixel -> mm
PX_TO_MM_X = A4_WIDTH_MM / TARGET_WIDTH_PX
PX_TO_MM_Y = A4_HEIGHT_MM / TARGET_HEIGHT_PX

def order_points(pts):
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect

def dewarp_document(img):
    """Bước 1-3: Nắn phẳng và chuẩn hóa ảnh về A4"""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blur, 75, 200)

    contours, _ = cv2.findContours(edged, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]

    for c in contours:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) == 4:
            pts = approx.reshape(4, 2)
            rect = order_points(pts)
            dst = np.array([
                [0, 0], [TARGET_WIDTH_PX - 1, 0],
                [TARGET_WIDTH_PX - 1, TARGET_HEIGHT_PX - 1], [0, TARGET_HEIGHT_PX - 1]
            ], dtype="float32")
            M = cv2.getPerspectiveTransform(rect, dst)
            return cv2.warpPerspective(img, M, (TARGET_WIDTH_PX, TARGET_HEIGHT_PX))
    return img # Trả về ảnh gốc nếu không tìm thấy giấy

def detect_checkboxes_opencv(warped_img):
    """Bước 4: Nhận diện Checkbox bằng Rule-based (OpenCV)"""
    checkboxes = []
    gray = cv2.cvtColor(warped_img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV)
    
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    cb_id = 1
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        aspect_ratio = w / float(h)
        area = w * h
        # Rule: Là hình vuông (tỷ lệ 0.85 - 1.15) và có diện tích vừa phải (không phải chấm nhiễu, không phải viền bảng)
        if 0.85 <= aspect_ratio <= 1.15 and 200 <= area <= 1500:
            checkboxes.append({
                "id": f"cb_auto_{cb_id}",
                "type": "Checkbox",
                "x_mm": round(x * PX_TO_MM_X, 2),
                "y_mm": round(y * PX_TO_MM_Y, 2),
                "width_mm": round(w * PX_TO_MM_X, 2),
                "height_mm": round(h * PX_TO_MM_Y, 2),
                "checked": False # Mặc định false
            })
            cb_id += 1
    return checkboxes

def detect_text_paddleocr(warped_img):
    """Bước 5: Nhận diện Text Box và Nội dung bằng PaddleOCR"""
    texts = []
    result = ocr_engine.ocr(warped_img, cls=True)
    
    txt_id = 1
    if result[0] is not None:
        for line in result[0]:
            box = line[0] # [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
            text_content = line[1][0]
            
            # Tính Bounding Box (x, y, w, h) từ 4 điểm
            x_min = min(p[0] for p in box)
            y_min = min(p[1] for p in box)
            x_max = max(p[0] for p in box)
            y_max = max(p[1] for p in box)
            
            w = x_max - x_min
            h = y_max - y_min
            
            texts.append({
                "id": f"txt_auto_{txt_id}",
                "type": "Text",
                "x_mm": round(x_min * PX_TO_MM_X, 2),
                "y_mm": round(y_min * PX_TO_MM_Y, 2),
                "width_mm": round(w * PX_TO_MM_X, 2),
                "height_mm": round(h * PX_TO_MM_Y, 2),
                "content": text_content,
                "is_static": True # Ở bước 6 Heuristic sẽ phân loại cái nào là Label (Tĩnh), cái nào là Value (Động)
            })
            txt_id += 1
    return texts

@app.post("/api/v1/analyze-document")
async def analyze_document(file: UploadFile = File(...)):
    image_bytes = await file.read()
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # 1. Nắn ảnh
    warped_img = dewarp_document(img)
    
    # 2. Quét Checkbox (CV)
    checkbox_elements = detect_checkboxes_opencv(warped_img)
    
    # 3. Quét Text (Pre-trained OCR)
    text_elements = detect_text_paddleocr(warped_img)
    
    # 4. Gộp Layout (Bước 6 gom nhóm Heuristic sẽ xử lý sau, tạm thời gộp mảng)
    all_elements = text_elements + checkbox_elements
    
    return JSONResponse(content={
        "status": "success",
        "message": "CV and Pre-trained AI analysis completed",
        "data": {
            "elements": all_elements
        }
    })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)