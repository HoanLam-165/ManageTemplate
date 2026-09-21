import os
import glob
import random
import cv2
import numpy as np
import textwrap # Import thêm thư viện này để ngắt dòng thông minh
from PIL import Image, ImageDraw, ImageFont
from augraphy import AugraphyPipeline, LightingGradient, NoiseTexturize, ShadowCast
from faker import Faker

fake = Faker('vi_VN')

# --- 1. DỌN DẸP & THIẾT LẬP ---
DATASET_DIR = "dataset"
for split in ["train", "val"]:
    os.makedirs(f"{DATASET_DIR}/images/{split}", exist_ok=True)
    os.makedirs(f"{DATASET_DIR}/labels/{split}", exist_ok=True)
    
print("🧹 Đang dọn dẹp dữ liệu cũ...")
for f in glob.glob(f"{DATASET_DIR}/*/*/*"):
    try: os.remove(f)
    except: pass

CLASSES = {"Header": 0, "Instruction": 1, "Label": 2, "Value": 3, "Checkbox_Empty": 4, "Checkbox_Ticked": 5}
TITLES_FORM = ["DON XIN NGHI OM", "BAN KIEM DIEM", "DON XIN THOI VIEC", "GIAY DANG KY", "PHIEU KHAO SAT"]
TITLES_ANN = ["THONG BAO", "QUYET DINH", "CHI THI", "NOI QUY", "KE HOACH"]
LABELS = ["Ho va ten:", "Nguoi lam don:", "Lop:", "MSV:", "Dia chi:", "Ly do:", "Tu ngay:", "Den ngay:"]

try:
    font_header = ImageFont.truetype("timesbd.ttf", 26)
    font_label = ImageFont.truetype("times.ttf", 22)
    font_inst = ImageFont.truetype("timesi.ttf", 20)
    font_value_typed = ImageFont.truetype("times.ttf", 24) 
except:
    font_header = font_label = font_inst = font_value_typed = ImageFont.load_default()

pipeline = AugraphyPipeline([
    LightingGradient(p=0.4),
    NoiseTexturize(sigma_range=(1, 2), p=0.3),
    ShadowCast(p=0.2)
])

def draw_invisible_stamps(draw, img_w, img_h):
    for _ in range(random.randint(1, 2)):
        if random.random() > 0.5:
            r = random.randint(40, 100)
            cx, cy = random.randint(100, img_w-100), random.randint(100, img_h-200)
            draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=(220, 220, 220), width=3)
        if random.random() > 0.8:
            r = random.randint(30, 60)
            cx, cy = random.randint(400, img_w-50), random.randint(img_h-300, img_h-50)
            draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=(255, 100, 100), width=4)

def add_bbox(bboxes, draw, font, text, x, y, class_id, img_w, img_h):
    bbox = draw.textbbox((x, y), text, font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    cx, cy = x + w / 2, y + h / 2
    bboxes.append(f"{class_id} {cx/img_w} {cy/img_h} {w/img_w} {h/img_h}")
    return w, h

def process_image(img, img_w, img_h, bboxes, split, filename):
    img_cv = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    if random.random() < 0.3:
        img_cv = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        img_cv = cv2.cvtColor(img_cv, cv2.COLOR_GRAY2BGR)
    if random.random() > 0.5:
        angle = random.uniform(-1.5, 1.5)
        M = cv2.getRotationMatrix2D((img_w/2, img_h/2), angle, 1)
        img_cv = cv2.warpAffine(img_cv, M, (img_w, img_h), borderValue=(255,255,255))
    img_aug = pipeline.augment(img_cv)["output"]
    cv2.imwrite(f"{DATASET_DIR}/images/{split}/{filename}.jpg", img_aug)
    with open(f"{DATASET_DIR}/labels/{split}/{filename}.txt", "w") as f:
        f.write("\n".join(bboxes))

# --- GENERATE FORM ĐÁNH MÁY ---
def generate_form(image_id, split):
    img_w, img_h = 850, random.randint(1000, 1200)
    img = Image.new('RGB', (img_w, img_h), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    bboxes = []
    form_type = random.choices(["blank", "partial", "full"], weights=[0.2, 0.3, 0.5], k=1)[0]
    
    draw_invisible_stamps(draw, img_w, img_h)

    # Căn giữa Quốc hiệu
    qh_text = "CONG HOA XA HOI CHU NGHIA VIET NAM"
    qh_w = draw.textbbox((0, 0), qh_text, font=font_header)[2]
    qh_x = (img_w - qh_w) / 2
    draw.text((qh_x, 50), qh_text, fill=(0,0,0), font=font_header)
    add_bbox(bboxes, draw, font_header, qh_text, qh_x, 50, 0, img_w, img_h)
    
    title = random.choice(TITLES_FORM)
    t_w = draw.textbbox((0, 0), title, font=font_header)[2]
    t_x = (img_w - t_w) / 2
    draw.text((t_x, 130), title, fill=(0,0,0), font=font_header)
    add_bbox(bboxes, draw, font_header, title, t_x, 130, 0, img_w, img_h)

    y_off = 220
    for _ in range(random.randint(4, 6)):
        num_inline = 2 if random.random() < 0.35 else 1 
        x_off = 50
        for i in range(num_inline):
            label_txt = random.choice(LABELS)
            draw.text((x_off, y_off), label_txt, fill=(0,0,0), font=font_label)
            l_w, _ = add_bbox(bboxes, draw, font_label, label_txt, x_off, y_off, 2, img_w, img_h) 
            x_off += l_w + 10
            
            dot_len = random.randint(15, 25) if num_inline == 2 else random.randint(30, 60)
            draw.text((x_off, y_off+5), "." * dot_len, fill=(0,0,0), font=font_label)
            
            is_filled = (form_type == "full") or (form_type == "partial" and random.random() > 0.5)
            if is_filled:
                val_txt = fake.name() if "ten" in label_txt.lower() else fake.word().capitalize()
                draw.text((x_off+5, y_off), val_txt, fill=(0,0,0), font=font_value_typed)
                add_bbox(bboxes, draw, font_value_typed, val_txt, x_off+5, y_off, 3, img_w, img_h) 
            
            x_off += 250 if num_inline == 2 else 0
        y_off += 50

    y_off += 20
    draw.text((50, y_off), "Gioi tinh:", fill=(0,0,0), font=font_label)
    add_bbox(bboxes, draw, font_label, "Gioi tinh:", 50, y_off, 2, img_w, img_h)
    
    x_off = 200
    chosen_tick = random.randint(0, 1) if form_type != "blank" else -1
    for idx, opt in enumerate(["Nam", "Nu"]):
        box_size = 20
        draw.rectangle([x_off, y_off+5, x_off+box_size, y_off+5+box_size], outline=(0,0,0), width=2)
        if idx == chosen_tick:
            draw.text((x_off+2, y_off-2), "x", fill=(0,0,0), font=font_value_typed)
            cx, cy = x_off + box_size/2, y_off + 5 + box_size/2
            bboxes.append(f"5 {cx/img_w} {cy/img_h} {box_size/img_w} {box_size/img_h}")
        else:
            cx, cy = x_off + box_size/2, y_off + 5 + box_size/2
            bboxes.append(f"4 {cx/img_w} {cy/img_h} {box_size/img_w} {box_size/img_h}")

        draw.text((x_off+30, y_off), opt, fill=(0,0,0), font=font_label)
        add_bbox(bboxes, draw, font_label, opt, x_off+30, y_off, 2, img_w, img_h)
        x_off += 150
        
    y_off += 60

    cam_ket = "Toi xin cam ket nhung dieu tren la su that."
    draw.text((50, y_off), cam_ket, fill=(0,0,0), font=font_inst)
    add_bbox(bboxes, draw, font_inst, cam_ket, 50, y_off, 1, img_w, img_h) 

    y_off += 50
    draw.text((500, y_off), "Nguoi lam don", fill=(0,0,0), font=font_label)
    add_bbox(bboxes, draw, font_label, "Nguoi lam don", 500, y_off, 2, img_w, img_h) 
    y_off += 25
    draw.text((490, y_off), "(Ky va ghi ro ho ten)", fill=(0,0,0), font=font_inst)
    add_bbox(bboxes, draw, font_inst, "(Ky va ghi ro ho ten)", 490, y_off, 1, img_w, img_h) 
    
    # Đã xóa sạch chữ ký rác

    return process_image(img, img_w, img_h, bboxes, split, f"doc_v6_{image_id:04d}")

# --- FIX: GENERATE ANNOUNCEMENT ---
def generate_announcement(image_id, split):
    img_w, img_h = 850, random.randint(1100, 1200)
    img = Image.new('RGB', (img_w, img_h), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    bboxes = []
    draw_invisible_stamps(draw, img_w, img_h)

    # Căn lề trái cho Cơ quan
    draw.text((40, 50), "BGD & DT", fill=(0,0,0), font=font_label)
    add_bbox(bboxes, draw, font_label, "BGD & DT", 40, 50, 0, img_w, img_h)
    draw.text((30, 80), "TRUONG DAI HOC X", fill=(0,0,0), font=font_header)
    add_bbox(bboxes, draw, font_header, "TRUONG DAI HOC X", 30, 80, 0, img_w, img_h)
    
    # Tính toán để Căn lề phải tự động cho Quốc hiệu (Chống tràn)
    qh_text = "CONG HOA XA HOI CHU NGHIA VIET NAM"
    qh_w = draw.textbbox((0, 0), qh_text, font=font_header)[2]
    qh_x = img_w - qh_w - 40 # Cách mép phải 40px
    draw.text((qh_x, 50), qh_text, fill=(0,0,0), font=font_header)
    add_bbox(bboxes, draw, font_header, qh_text, qh_x, 50, 0, img_w, img_h)

    y_off = 170
    title = random.choice(TITLES_ANN)
    t_w = draw.textbbox((0, 0), title, font=font_header)[2]
    t_x = (img_w - t_w) / 2
    draw.text((t_x, y_off), title, fill=(0,0,0), font=font_header)
    add_bbox(bboxes, draw, font_header, title, t_x, y_off, 0, img_w, img_h)
    
    y_off += 70
    line_spacing = font_label.size + 15 # Fix khoảng cách dòng tự động
    
    for _ in range(random.randint(3, 4)):
        # Khử \n của Faker, dùng textwrap bẻ dòng theo chữ (Word wrap)
        raw_para = fake.paragraph(nb_sentences=4).replace('\n', ' ')
        lines = textwrap.wrap(raw_para, width=65) 
        
        start_y, max_w = y_off, 0
        for line in lines:
            draw.text((50, y_off), line, fill=(0,0,0), font=font_label)
            bbox = draw.textbbox((50, y_off), line, font=font_label)
            max_w = max(max_w, bbox[2] - bbox[0])
            y_off += line_spacing # Chống đè chữ triệt để
            
        cx, cy = 50 + max_w/2, (start_y + y_off - line_spacing/2)/2
        h = y_off - start_y
        bboxes.append(f"1 {cx/img_w} {cy/img_h} {max_w/img_w} {h/img_h}") 
        y_off += 25

    y_off += 30
    draw.text((550, y_off), "GIAM DOC", fill=(0,0,0), font=font_header)
    add_bbox(bboxes, draw, font_header, "GIAM DOC", 550, y_off, 1, img_w, img_h)
    
    # Đã xóa sạch chữ ký rác

    return process_image(img, img_w, img_h, bboxes, split, f"doc_v6_{image_id:04d}")

TOTAL_IMAGES = 2500
print(f"🚀 Bắt đầu luyện đan {TOTAL_IMAGES} ảnh Digital (Fix triệt để layout)...")

for i in range(TOTAL_IMAGES):
    split = "val" if i < (TOTAL_IMAGES * 0.1) else "train"
    if random.random() < 0.8:
        generate_form(i, split)
    else:
        generate_announcement(i, split)
        
    if (i+1) % 250 == 0: 
        print(f"✅ Đã tạo {i+1}/{TOTAL_IMAGES} tài liệu...")

print("🎉 XONG! AI giờ sẽ coi chữ viết tay như không khí và layout chuẩn mực 100%!")