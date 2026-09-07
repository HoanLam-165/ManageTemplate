import cv2
import numpy as np
import uuid
import easyocr

# Khởi tạo EasyOCR
reader = easyocr.Reader(['vi', 'en'], gpu=False)

# Kích thước chuẩn Pixel (Tỷ lệ A4) và kích thước thực tế (mm)
TARGET_WIDTH_PX, TARGET_HEIGHT_PX = 840, 1188
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
                x, y, w, h = cv2.boundingRect(approx)
                ratio = w / float(h)
                # Nới lỏng điều kiện tỷ lệ một chút để bắt form tốt hơn
                if (0.5 < ratio < 0.9) or (1.2 < ratio < 1.6):
                    pts = approx.reshape(4, 2)
                    rect = order_points(pts)
                    dst = np.array([
                        [0, 0], [TARGET_WIDTH_PX - 1, 0],
                        [TARGET_WIDTH_PX - 1, TARGET_HEIGHT_PX - 1], [0, TARGET_HEIGHT_PX - 1]
                    ], dtype="float32")
                    M = cv2.getPerspectiveTransform(rect, dst)
                    return cv2.warpPerspective(image, M, (TARGET_WIDTH_PX, TARGET_HEIGHT_PX))
    return image

def extract_advanced_text(processed_img: np.ndarray, ratio_x: float, ratio_y: float) -> list:
    elements = []
    ZOOM = 3.0
    
    # 1. Phóng to ảnh để nét chữ mỏng dày lên
    zoomed_img = cv2.resize(processed_img, None, fx=ZOOM, fy=ZOOM, interpolation=cv2.INTER_CUBIC)
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
    
    # 3. Smart Bolding: Tăng tương phản và làm đậm nét mỏng
    enhanced_gray = cv2.convertScaleAbs(gray_cleaned, alpha=1.5, beta=-30)
    kernel_bold = np.ones((2, 2), np.uint8) 
    bold_gray = cv2.erode(enhanced_gray, kernel_bold, iterations=1)
    
    final_cv_img = cv2.cvtColor(bold_gray, cv2.COLOR_GRAY2BGR)
    
    # 4. Quét EasyOCR
    results = reader.readtext(
        final_cv_img, 
        adjust_contrast=True, 
        width_ths=1.2, 
        x_ths=1.5,
        blocklist='~^|°ÛÇñ'
    )
    
    for bbox, text, prob in results:
        if prob < 0.10: 
            continue
            
        # CHIA TỌA ĐỘ CHO ZOOM TRƯỚC TIÊN ĐỂ TRẢ VỀ PIXEL CỦA PROCESSED_IMG
        x_min = float(min(p[0] for p in bbox)) / ZOOM
        y_min = float(min(p[1] for p in bbox)) / ZOOM
        x_max = float(max(p[0] for p in bbox)) / ZOOM
        y_max = float(max(p[1] for p in bbox)) / ZOOM
        
        # SAU ĐÓ NHÂN VỚI RATIO ĐỂ RA MILIMET (mm)
        elements.append({
            "id": str(uuid.uuid4()),
            "type": "Text",
            "x": round(x_min * ratio_x, 2),
            "y": round(y_min * ratio_y, 2),
            "width": max(round((x_max - x_min) * ratio_x, 2), 20.0),
            "height": max(round((y_max - y_min) * ratio_y, 2), 5.0),
            "content": str(text).strip()
        })
    return elements

def extract_checkboxes(processed_img: np.ndarray, ratio_x: float, ratio_y: float) -> list:
    elements = []
    gray = cv2.cvtColor(processed_img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    for cnt in contours:
        x, y, w_box, h_box = cv2.boundingRect(cnt)
        aspect_ratio = w_box / float(h_box)
        area = w_box * h_box
        if 0.85 <= aspect_ratio <= 1.15 and 200 <= area <= 1500:
            elements.append({
                "id": str(uuid.uuid4()),
                "type": "Checkbox",
                "x": round(x * ratio_x, 2),
                "y": round(y * ratio_y, 2),
                "width": round(w_box * ratio_x, 2),
                "height": round(h_box * ratio_y, 2),
                "value": False
            })
    return elements

def analyze_document(image: np.ndarray) -> list:
    processed_img = preprocess_image_smart(image)
    
    # Lấy kích thước ảnh sau xử lý
    h, w = processed_img.shape[:2]
    
    # QUAN TRỌNG: Cân bằng lại tỷ lệ quy đổi tọa độ để chống giãn chữ
    # Mặc định Frontend dùng hệ số 1mm = 3.7795px (từ file coordinates.ts)
    # Ta sẽ dùng chính hệ số này để quy đổi ngược lại Pixel -> mm cho an toàn
    PX_TO_MM = 1.0 / 3.7795275591
    
    ratio_x = PX_TO_MM
    ratio_y = PX_TO_MM

    elements = extract_advanced_text(processed_img, ratio_x, ratio_y)
    elements.extend(extract_checkboxes(processed_img, ratio_x, ratio_y))

    return elements