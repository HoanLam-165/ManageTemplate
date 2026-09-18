import cv2
import numpy as np
import uuid
import easyocr
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import math

app = FastAPI(title="Template Workspace CV API")

# Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1420"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Khởi tạo EasyOCR
reader = easyocr.Reader(['vi', 'en'])

# Kích thước chuẩn thực (mm)
A4_WIDTH_MM, A4_HEIGHT_MM = 210.0, 297.0

def order_points(pts):
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect

def preprocess_image_smart(image: np.ndarray):
    """Tiền xử lý thông minh: Nắn phẳng và chuẩn hóa ảnh về A4"""
    orig_h, orig_w = image.shape[:2]
    img_area = orig_w * orig_h
    
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blur, 75, 200)

    contours, _ = cv2.findContours(edged, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]

    for c in contours:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        
        if len(approx) == 4:
            area = cv2.contourArea(approx)
            if 0.2 * img_area < area < 0.95 * img_area:
                pts = approx.reshape(4, 2)
                rect = order_points(pts)
                
                # Tính toán độ dài động dựa trên các góc
                (tl, tr, br, bl) = rect
                widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
                widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
                maxWidth = max(int(widthA), int(widthB))

                heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
                heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
                maxHeight = max(int(heightA), int(heightB))
                
                dst = np.array([
                    [0, 0], [maxWidth - 1, 0],
                    [maxWidth - 1, maxHeight - 1], [0, maxHeight - 1]
                ], dtype="float32")
                M = cv2.getPerspectiveTransform(rect, dst)
                return cv2.warpPerspective(image, M, (maxWidth, maxHeight)), maxWidth, maxHeight
    return image, orig_w, orig_h

def apply_smart_enhancement(img):
    """Tiền xử lý nâng cao: Xóa đường kẻ và tăng độ đậm nét"""
    # 1. Phóng to ảnh để nét chữ mỏng dày lên
    zoomed_img = cv2.resize(img, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
    gray = cv2.cvtColor(zoomed_img, cv2.COLOR_BGR2GRAY)
    
    # 2. Xóa đường kẻ khung viền (Line Removal)
    _, thresh_inv = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
    h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
    v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
    h_lines = cv2.morphologyEx(thresh_inv, cv2.MORPH_OPEN, h_kernel, iterations=1)
    v_lines = cv2.morphologyEx(thresh_inv, cv2.MORPH_OPEN, v_kernel, iterations=1)
    mask_lines = cv2.add(h_lines, v_lines)
    mask_lines = cv2.dilate(mask_lines, np.ones((3,3), np.uint8), iterations=1)
    
    gray_cleaned = gray.copy()
    gray_cleaned[mask_lines == 255] = 255
    
    # 3. Smart Bolding
    enhanced_gray = cv2.convertScaleAbs(gray_cleaned, alpha=1.5, beta=-30)
    kernel_bold = np.ones((2, 2), np.uint8) 
    bold_gray = cv2.erode(enhanced_gray, kernel_bold, iterations=1)
    
    return bold_gray # Trả về ảnh đã enhanced để OCR

def detect_checkboxes_opencv(warped_img, max_w, max_h):
    """Nhận diện Checkbox bằng Rule-based (OpenCV) với tỷ lệ động"""
    checkboxes = []
    
    # Xác định kích thước thực (mm)
    is_landscape = max_w > max_h
    doc_width_mm = 297.0 if is_landscape else 210.0
    doc_height_mm = 210.0 if is_landscape else 297.0
    
    px_to_mm_x = doc_width_mm / max_w
    px_to_mm_y = doc_height_mm / max_h
    
    gray = cv2.cvtColor(warped_img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV)
    
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        aspect_ratio = w / float(h)
        area = w * h
        if 0.85 <= aspect_ratio <= 1.15 and 200 <= area <= 1500:
            checkboxes.append({
                "id": f"cb_{uuid.uuid4().hex[:8]}",
                "type": "Checkbox",
                "x_mm": round(x * px_to_mm_x, 2),
                "y_mm": round(y * px_to_mm_y, 2),
                "width_mm": round(w * px_to_mm_x, 2),
                "height_mm": round(h * px_to_mm_y, 2),
                "checked": False
            })
    return checkboxes

def detect_text_easyocr(enhanced_img, max_w, max_h):
    """Nhận diện Text Box và Nội dung bằng EasyOCR với tỷ lệ động"""
    texts = []
    # Xác định kích thước thực (mm)
    is_landscape = max_w > max_h
    doc_width_mm = 297.0 if is_landscape else 210.0
    doc_height_mm = 210.0 if is_landscape else 297.0
    
    px_to_mm_x = doc_width_mm / max_w
    px_to_mm_y = doc_height_mm / max_h
    
    # EasyOCR nhận ảnh BGR hoặc RGB
    result = reader.readtext(enhanced_img)
    
    for (bbox, text_content, prob) in result:
        (tl, tr, br, bl) = bbox
        
        x_min = min(tl[0], bl[0])
        y_min = min(tl[1], tr[1])
        x_max = max(tr[0], br[0])
        y_max = max(bl[1], br[1])
        
        # Vì ảnh đã zoom 2x trước khi vào enhance
        w = (x_max - x_min) / 2.0
        h = (y_max - y_min) / 2.0
        x_min /= 2.0
        y_min /= 2.0
        
        texts.append({
            "id": f"txt_{uuid.uuid4().hex[:8]}",
            "type": "Text",
            "x_mm": round(x_min * px_to_mm_x, 2),
            "y_mm": round(y_min * px_to_mm_y, 2),
            "width_mm": round(w * px_to_mm_x, 2),
            "height_mm": round(h * px_to_mm_y, 2),
            "content": text_content,
            "is_static": True
        })
    return texts

@app.post("/api/v1/analyze-document")
async def analyze_document(file: UploadFile = File(...)):
    image_bytes = await file.read()
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # 1. Nắn ảnh & Tính toán kích thước động
    warped_img, max_w, max_h = preprocess_image_smart(img)
    
    # 2. Xử lý ảnh nâng cao (xóa line, bolding) cho OCR
    enhanced_img = apply_smart_enhancement(warped_img)
    
    # 3. Quét Checkbox (CV) trên ảnh nắn
    checkbox_elements = detect_checkboxes_opencv(warped_img, max_w, max_h)
    
    # 4. Quét Text (EasyOCR) trên ảnh nắn (warped_img tốt hơn cho EasyOCR so với enhanced_img đã nhị phân/bào mòn)
    text_elements = detect_text_easyocr(warped_img, max_w, max_h)
    
    all_elements = text_elements + checkbox_elements
    
    return JSONResponse(content={
        "status": "success",
        "message": "Unified CV and EasyOCR analysis completed",
        "data": {
            "elements": all_elements
        }
    })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
