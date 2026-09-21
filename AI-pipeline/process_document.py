import os
import json
import cv2
import pytesseract
import re
from ultralytics import YOLO

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
MODEL_PATH = 'yolo_document_model.pt'
IMAGE_PATH = 'don-chung-chi.jpg'  # <-- Nhớ trỏ đúng file ảnh test của bạn
OUTPUT_FILE = 'extracted_result.json'

def check_prerequisites():
    if not os.path.exists(MODEL_PATH):
        print(f"❌ Không tìm thấy model '{MODEL_PATH}'")
        return False
    if not os.path.exists(IMAGE_PATH):
        print(f"❌ Không tìm thấy ảnh '{IMAGE_PATH}'")
        return False
    return True

def preprocess_for_ocr(image_crop):
    """
    Bí mật của Tesseract LSTM: Không dùng ảnh Trắng/Đen (Threshold)!
    Chỉ dùng ảnh XÁM (Grayscale), phóng to và bơm lề trắng.
    """
    zoomed = cv2.resize(image_crop, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    gray = cv2.cvtColor(zoomed, cv2.COLOR_BGR2GRAY)
    padded = cv2.copyMakeBorder(gray, 30, 30, 30, 30, cv2.BORDER_CONSTANT, value=255)
    return padded

def get_iou(box1, box2):
    x_left, y_top = max(box1[0], box2[0]), max(box1[1], box2[1])
    x_right, y_bottom = min(box1[2], box2[2]), min(box1[3], box2[3])
    if x_right < x_left or y_bottom < y_top: return 0.0
    inter_area = (x_right - x_left) * (y_bottom - y_top)
    box1_area = (box1[2] - box1[0]) * (box1[3] - box1[1])
    box2_area = (box2[2] - box2[0]) * (box2[3] - box2[1])
    return inter_area / float(box1_area + box2_area - inter_area)

def process_document(image_path):
    print(f"🔍 Đang phân tích tài liệu bằng Model 6 Classes: {image_path}")
    model = YOLO(MODEL_PATH)
    # Khuyên dùng conf=0.25 để mô hình bỏ qua các nét vẽ mờ (chữ ký tay rác)
    results = model.predict(image_path, verbose=False, conf=0.25) 
    img = cv2.imread(image_path)
    debug_img = img.copy()

    raw_labels, raw_values, ticked_boxes = [], [], []
    
    # 1. BÓC TÁCH YOLOV8 (TƯƠNG THÍCH VỚI DATASET V6)
    for r in results:
        for box in r.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            cls = model.names[int(box.cls[0])]
            element = {
                'bbox': (int(x1), int(y1), int(x2), int(y2)),
                'center_x': (x1 + x2) / 2, 'center_y': (y1 + y2) / 2,
                'height': y2 - y1
            }
            # Lọc đúng tên Class mới. Mặc kệ Header, Instruction và Checkbox_Empty!
            if cls == 'Label': 
                raw_labels.append(element)
                cv2.rectangle(debug_img, (int(x1), int(y1)), (int(x2), int(y2)), (0, 0, 255), 2)
            elif cls == 'Value': 
                raw_values.append(element)
                cv2.rectangle(debug_img, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
            elif cls == 'Checkbox_Ticked': 
                ticked_boxes.append(element)
                cv2.rectangle(debug_img, (int(x1), int(y1)), (int(x2), int(y2)), (255, 0, 255), 2)

    cv2.imwrite('debug_yolo_boxes.jpg', debug_img)
    print("📸 Đã lưu ảnh kiểm tra tại: debug_yolo_boxes.jpg")

    # 2. DIỆT ẢO GIÁC ĐÈ LỚP (Giữ nguyên logic cực hay của bạn)
    labels = raw_labels
    values = [v for v in raw_values if not any(get_iou(v['bbox'], l['bbox']) > 0.2 for l in labels)]

    # Sắp xếp Label từ trên xuống dưới
    labels = sorted(labels, key=lambda x: x['center_y'])
    
    structured_data = {}
    used_value_indices = set()
    used_tick_indices = set() # Quản lý thêm Checkbox
    
    print("⏳ Đang kích hoạt Tesseract OCR (Đọc xuyên bóng tối)...")
    for i, label in enumerate(labels):
        lx1, ly1, lx2, ly2 = label['bbox']
        l_cx, l_cy = label['center_x'], label['center_y']
        
        lx1_pad, ly1_pad = max(0, int(lx1) - 5), max(0, int(ly1) - 5)
        lx2_pad, ly2_pad = min(img.shape[1], int(lx2) + 5), min(img.shape[0], int(ly2) + 5)
        
        raw_label = pytesseract.image_to_string(preprocess_for_ocr(img[ly1_pad:ly2_pad, lx1_pad:lx2_pad]), lang='vie', config='--psm 7').strip()
        clean_label = re.sub(r'[\._|ì\-]', '', raw_label).strip()
        label_text = clean_label if clean_label else f"Field_{i}"
            
        best_match_type = None # 'value' hoặc 'tick'
        best_val, best_idx, min_dist = None, -1, float('inf')
        
        # 3A. TÌM KIẾM VALUE ĐIỀN TAY TRƯỚC
        for val_idx, val in enumerate(values):
            if val_idx in used_value_indices: continue

            v_cx, v_cy = val['center_x'], val['center_y']
            dist_x, dist_y = v_cx - l_cx, v_cy - l_cy
            
            # Cùng hàng ngang
            if abs(dist_y) < 25 and 10 < dist_x < 400: 
                if dist_x < min_dist:
                    min_dist = dist_x
                    best_val, best_idx, best_match_type = val, val_idx, 'value'
            # Đoạn văn bên dưới
            elif 30 <= dist_y < 80 and abs(dist_x) < 150:
                dist = dist_y + 1000 
                if dist < min_dist:
                    min_dist = dist
                    best_val, best_idx, best_match_type = val, val_idx, 'value'

        # 3B. NẾU KHÔNG CÓ VALUE, TÌM KIẾM CHECKBOX_TICKED BÊN CẠNH
        if best_match_type is None:
            for tick_idx, tick in enumerate(ticked_boxes):
                if tick_idx in used_tick_indices: continue
                t_cx, t_cy = tick['center_x'], tick['center_y']
                # Label thường nằm bên cạnh Checkbox (Khoảng cách X có thể âm hoặc dương)
                dist_x, dist_y = l_cx - t_cx, l_cy - t_cy
                if abs(dist_y) < 20 and 5 < abs(dist_x) < 150: 
                    dist = abs(dist_x)
                    if dist < min_dist:
                        min_dist = dist
                        best_val, best_idx, best_match_type = tick, tick_idx, 'tick'

        # 4. TIẾN HÀNH BÓC TÁCH GIÁ TRỊ (OCR HOẶC GÁN MẶC ĐỊNH)
        val_text = ""
        if best_match_type == 'value':
            vx1, vy1, vx2, vy2 = best_val['bbox']
            vx1_pad, vy1_pad = max(0, int(vx1) - 5), max(0, int(vy1) - 5)
            vx2_pad, vy2_pad = min(img.shape[1], int(vx2) + 5), min(img.shape[0], int(vy2) + 5)
            
            psm_mode = '--psm 6' if best_val['height'] > 45 else '--psm 7'
            raw_val = pytesseract.image_to_string(preprocess_for_ocr(img[vy1_pad:vy2_pad, vx1_pad:vx2_pad]), lang='vie', config=psm_mode).strip()
            
            clean_val = re.sub(r'\.{2,}', '', raw_val)
            clean_val = re.sub(r'[_|ì\-]', '', clean_val).strip()

            # Lọc rác
            if clean_val.endswith(':'): clean_val = ""
            if clean_label and clean_label.lower() in clean_val.lower():
                clean_val = re.compile(re.escape(clean_label), re.IGNORECASE).sub('', clean_val)
                clean_val = re.sub(r'^[\:\-\.\,\s]+', '', clean_val)
            if re.match(r'^\(.*?\)$', clean_val.strip()): clean_val = ""
            if len(clean_val) > 15 and clean_val.count(' ') < 2: clean_val = ""

            val_text = clean_val.strip()
            if val_text: used_value_indices.add(best_idx)
            
        elif best_match_type == 'tick':
            # Không cần chạy OCR cho Checkbox, chỉ gán cờ
            val_text = "[ĐÃ CHỌN]"
            used_tick_indices.add(best_idx)

        structured_data[label_text] = val_text

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(structured_data, f, indent=4, ensure_ascii=False)
    
    print("\n--- 🎯 KẾT QUẢ TEST MỚI NHẤT ---")
    print(json.dumps(structured_data, indent=4, ensure_ascii=False))

if __name__ == "__main__":
    if check_prerequisites():
        process_document(IMAGE_PATH)