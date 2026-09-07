import cv2
import numpy as np
import os
import random
from PIL import Image, ImageDraw, ImageFont
from augraphy import AugraphyPipeline, InkBleed, BleedThrough, ShadowCast, NoiseTexturize

# --- VÁ LỖI PYTHON 3.12 CHO AUGRAPHY ---
_original_randint = random.randint
def _patched_randint(a, b): return _original_randint(int(a), int(b))
random.randint = _patched_randint
# ---------------------------------------

# 1. CẤU HÌNH & TỪ ĐIỂN
IMG_WIDTH, IMG_HEIGHT = 840, 1188
NUM_IMAGES = 10  # Đã tăng lên 1000 ảnh
TRAIN_RATIO = 0.9  # 90% cho Train, 10% cho Val

CLASSES = {"Label_Text": 0, "Value_Text": 1, "Checkbox": 2}
LABELS = ["Họ và tên / Full Name:", "Địa chỉ / Address:", "Số ĐT / Phone:", "Phòng ban / Dept:", 
          "Lý do / Reason:", "Mã số / ID:", "Email:", "Tình trạng / Status:", "Chữ ký / Sign:"]
VALUES = ["Nguyễn Văn A", "John Doe", "Hà Nội, Việt Nam", "New York, USA", "0912345678", 
          "IT Support", "Server down", "Nghỉ phép", "Approved", "test@topcv.vn", "12/12/2026"]
TITLES = ["BUG REPORT FORM", "ĐƠN XIN NGHỈ PHÉP", "BIÊN BẢN HỌP / MEETING NOTES", "TEST CASE EXECUTION"]

# Khởi tạo thư mục chuẩn YOLOv8
DIRS = [
    "dataset/images/train", "dataset/images/val",
    "dataset/labels/train", "dataset/labels/val"
]
for d in DIRS:
    os.makedirs(d, exist_ok=True)

# Load Font (Phải có sẵn trong thư mục)
try:
    font_title = ImageFont.truetype("Roboto-Bold.ttf", 36)
    font_label = ImageFont.truetype("Roboto-Bold.ttf", 24)
    font_value = ImageFont.truetype("Roboto-Regular.ttf", 24)
except IOError:
    print("Lỗi: Không tìm thấy file font Roboto. Hãy đảm bảo copy font vào thư mục.")
    exit()

# Pipeline Augraphy (Bỏ PaperFactory để tối ưu tốc độ và tương thích)
pipeline = AugraphyPipeline(
    ink_phase=[InkBleed(intensity_range=(0.1, 0.4)), BleedThrough(intensity_range=(0.1, 0.2))],
    paper_phase=[],
    post_phase=[ShadowCast(), NoiseTexturize()]
)

def convert_to_yolo(box, img_w, img_h):
    x_min, y_min, x_max, y_max = box
    x_center = ((x_min + x_max) / 2) / img_w
    y_center = ((y_min + y_max) / 2) / img_h
    width = (x_max - x_min) / img_w
    height = (y_max - y_min) / img_h
    return f"{x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f}"

# 2. ENGINE SINH DỮ LIỆU ĐỘNG
print(f"Bắt đầu sinh {NUM_IMAGES} ảnh...")

for i in range(NUM_IMAGES):
    img_pil = Image.new("RGB", (IMG_WIDTH, IMG_HEIGHT), (255, 255, 255))
    draw = ImageDraw.Draw(img_pil)
    yolo_labels = []

    y_cursor = 80
    
    # [NÂNG CẤP 1]: Giới hạn số lượng hàng ngẫu nhiên (Từ rất loãng đến đặc kín)
    max_rows = random.randint(2, 15) 
    current_row = 0

    # Tiêu đề
    title_text = random.choice(TITLES)
    x_title = random.randint(50, 200)
    title_box = draw.textbbox((x_title, y_cursor), title_text, font=font_title)
    draw.text((x_title, y_cursor), title_text, font=font_title, fill=(0,0,0))
    yolo_labels.append(f"{CLASSES['Label_Text']} {convert_to_yolo(title_box, IMG_WIDTH, IMG_HEIGHT)}")
    y_cursor += random.randint(80, 120)

    # Sinh nội dung
    while y_cursor < IMG_HEIGHT - 150 and current_row < max_rows:
        # [NÂNG CẤP 2]: Bẫy khoảng trắng (15% tỷ lệ nhảy một đoạn trống rất lớn)
        if random.random() > 0.85:
            y_cursor += random.randint(150, 350)
            if y_cursor >= IMG_HEIGHT - 150: 
                break

        row_type = random.choice(["text_row", "text_row", "checkbox_row"])
        x_cursor = random.randint(40, 80)

        if row_type == "text_row":
            lbl_text = random.choice(LABELS)
            lbl_box = draw.textbbox((x_cursor, y_cursor), lbl_text, font=font_label)
            draw.text((x_cursor, y_cursor), lbl_text, font=font_label, fill=(0,0,0))
            yolo_labels.append(f"{CLASSES['Label_Text']} {convert_to_yolo(lbl_box, IMG_WIDTH, IMG_HEIGHT)}")
            
            x_cursor += (lbl_box[2] - lbl_box[0]) + random.randint(10, 30)

            if random.random() > 0.2: 
                val_text = random.choice(VALUES)
                val_box = draw.textbbox((x_cursor, y_cursor), val_text, font=font_value)
                draw.text((x_cursor, y_cursor), val_text, font=font_value, fill=(0,0,200)) # Chữ điền màu xanh
                yolo_labels.append(f"{CLASSES['Value_Text']} {convert_to_yolo(val_box, IMG_WIDTH, IMG_HEIGHT)}")

        elif row_type == "checkbox_row":
            num_cb = random.randint(1, 3)
            for _ in range(num_cb):
                if x_cursor > IMG_WIDTH - 150: break # Tránh tràn lề phải
                
                cb_size = 24
                cb_box = (x_cursor, y_cursor, x_cursor + cb_size, y_cursor + cb_size)
                draw.rectangle(cb_box, outline=(0,0,0), width=2)
                
                if random.random() > 0.5:
                    draw.line((x_cursor, y_cursor, x_cursor+cb_size, y_cursor+cb_size), fill=(0,0,0), width=2)
                    draw.line((x_cursor+cb_size, y_cursor, x_cursor, y_cursor+cb_size), fill=(0,0,0), width=2)
                
                yolo_labels.append(f"{CLASSES['Checkbox']} {convert_to_yolo(cb_box, IMG_WIDTH, IMG_HEIGHT)}")
                x_cursor += cb_size + 10

                lbl_text = random.choice(["Yes", "No", "N/A", "Nam", "Nữ", "Khác"])
                lbl_box = draw.textbbox((x_cursor, y_cursor), lbl_text, font=font_value)
                draw.text((x_cursor, y_cursor), lbl_text, font=font_value, fill=(0,0,0))
                yolo_labels.append(f"{CLASSES['Label_Text']} {convert_to_yolo(lbl_box, IMG_WIDTH, IMG_HEIGHT)}")
                
                x_cursor += (lbl_box[2] - lbl_box[0]) + random.randint(30, 60)

        y_cursor += random.randint(50, 80)
        current_row += 1

    # 3. LÀM BẨN VÀ LƯU FILE THEO CHUẨN YOLO
    img_cv = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)
    degraded_img = pipeline.augment(img_cv)["output"]
    
    # [NÂNG CẤP 3]: Chia Train/Val tự động
    subset = "train" if random.random() < TRAIN_RATIO else "val"
    base_filename = f"dynamic_form_{i:04d}"
    
    img_path = os.path.join(f"dataset/images/{subset}", f"{base_filename}.jpg")
    label_path = os.path.join(f"dataset/labels/{subset}", f"{base_filename}.txt")

    cv2.imwrite(img_path, degraded_img)
    with open(label_path, "w", encoding="utf-8") as f:
        f.write("\n".join(yolo_labels))

    # In tiến trình
    if (i + 1) % 100 == 0:
        print(f" Đã xử lý {i + 1}/{NUM_IMAGES} ảnh...")

print("\nHOÀN TẤT! Dữ liệu đã được chia sẵn trong thư mục dataset/images và dataset/labels.")