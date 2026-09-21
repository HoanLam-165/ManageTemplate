import os
import glob
import random
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from augraphy import AugraphyPipeline, LightingGradient, NoiseTexturize, ShadowCast
from faker import Faker

fake = Faker('vi_VN')

# --- REPRODUCIBILITY ---
SEED = 42
random.seed(SEED)
np.random.seed(SEED)
Faker.seed(SEED)

# --- 1. DỌN DẸP & THIẾT LẬP ---
DATASET_DIR = "dataset_v03"
for split in ["train", "val"]:
    os.makedirs(f"{DATASET_DIR}/images/{split}", exist_ok=True)
    os.makedirs(f"{DATASET_DIR}/labels/{split}", exist_ok=True)
    
print("🧹 Đang dọn dẹp dữ liệu cũ...")
for f in glob.glob(f"{DATASET_DIR}/*/*/*"):
    try: os.remove(f)
    except: pass

CLASSES = {"Header": 0, "Instruction": 1, "Label": 2, "Value": 3, "Checkbox_Empty": 4, "Checkbox_Ticked": 5}
TITLES_FORM = [
    "ĐƠN XIN NGHỈ HỌC",
    "BẢN KIỂM ĐIỂM",
    "ĐƠN XIN THÔI VIỆC",
    "GIẤY ĐĂNG KÝ",
    "PHIẾU KHẢO SÁT",
    "ĐƠN ĐỀ NGHỊ",
    "ĐƠN XIN XÁC NHẬN",
]
TITLES_ANN = [
    "THÔNG BÁO",
    "QUYẾT ĐỊNH",
    "CHỈ THỊ",
    "NỘI QUY",
    "KẾ HOẠCH",
    "THÔNG BÁO VỀ VIỆC ĐĂNG KÝ",
]
LABELS = [
    "Họ và tên:",
    "Người làm đơn:",
    "Lớp:",
    "Mã sinh viên:",
    "Địa chỉ:",
    "Lý do:",
    "Từ ngày:",
    "Đến ngày:",
    "Số điện thoại:",
    "Ngày sinh:",
    "Đơn vị:",
    "Nội dung:",
]

FORM_PARAGRAPHS = [
    "Tôi xin cam kết những thông tin trên là đúng sự thật và chịu trách nhiệm về nội dung đã kê khai.",
    "Tôi kính đề nghị nhà trường xem xét và giải quyết nội dung trên theo quy định hiện hành.",
    "Tôi cam đoan đã đọc kỹ các nội dung liên quan và đồng ý thực hiện đầy đủ các quy định của đơn vị.",
    "Trong thời gian thực hiện, nếu có thay đổi về thông tin đã cung cấp, tôi sẽ chủ động thông báo để được cập nhật.",
    "Tôi xin chịu trách nhiệm trước đơn vị về tính chính xác của các thông tin và tài liệu được cung cấp trong đơn.",
]

ANN_PARAGRAPHS = [
    "Nhà trường thông báo đến toàn thể sinh viên về việc đăng ký học phần học kỳ mới. Sinh viên kiểm tra thông tin cá nhân và hoàn thành đăng ký theo thời gian quy định.",
    "Căn cứ vào kế hoạch đào tạo, các đơn vị liên quan phối hợp triển khai nội dung công việc và thông báo kết quả thực hiện về nhà trường đúng thời hạn.",
    "Đề nghị các đơn vị phổ biến nội dung này đến những cá nhân có liên quan để chủ động chuẩn bị và thực hiện đầy đủ các yêu cầu được nêu trong văn bản.",
    "Sinh viên cần kiểm tra kỹ thông tin trước khi xác nhận. Mọi trường hợp sai lệch hoặc thiếu thông tin phải được phản hồi trong thời gian tiếp nhận theo quy định.",
    "Nội dung thông báo được áp dụng trong thời gian nêu trên. Các trường hợp phát sinh ngoài phạm vi hướng dẫn sẽ được xem xét và xử lý theo quy định của đơn vị.",
]

def draw_paragraph(draw, bboxes, text, x, y, max_width_px, font, class_id, img_w, img_h):
    """Draw a wrapped paragraph and create one bbox around the whole block."""
    words = text.split()
    lines = []
    current = ""

    for word in words:
        candidate = word if not current else current + " " + word
        bbox = draw.textbbox((x, y), candidate, font=font)
        candidate_w = bbox[2] - bbox[0]
        if current and candidate_w > max_width_px:
            lines.append(current)
            current = word
        else:
            current = candidate

    if current:
        lines.append(current)

    line_spacing = max(font.size + 8, 28)
    start_y = y
    max_w = 0

    for line in lines:
        draw.text((x, y), line, fill=(0, 0, 0), font=font)
        bbox = draw.textbbox((x, y), line, font=font)
        max_w = max(max_w, bbox[2] - bbox[0])
        y += line_spacing

    block_h = max(1, y - start_y - 5)
    cx = x + max_w / 2
    cy = start_y + block_h / 2
    bboxes.append(
        f"{class_id} {cx/img_w} {cy/img_h} {max_w/img_w} {block_h/img_h}"
    )
    return y, block_h

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

def transform_yolo_bboxes_affine(bboxes, M, img_w, img_h):
    """
    Transform YOLO normalized bboxes using a 2D affine matrix M.
    The bbox is converted to its 4 corners, transformed, then enclosed
    again as an axis-aligned bbox and clipped to the image.
    """
    transformed = []

    for line in bboxes:
        parts = line.strip().split()
        if len(parts) != 5:
            continue

        class_id = parts[0]
        cx, cy, bw, bh = map(float, parts[1:])

        # YOLO normalized -> pixel coordinates
        x1 = (cx - bw / 2) * img_w
        y1 = (cy - bh / 2) * img_h
        x2 = (cx + bw / 2) * img_w
        y2 = (cy + bh / 2) * img_h

        corners = np.array([
            [x1, y1],
            [x2, y1],
            [x2, y2],
            [x1, y2]
        ], dtype=np.float32)

        ones = np.ones((4, 1), dtype=np.float32)
        hom = np.hstack([corners, ones])
        warped = hom @ M.T

        xs = warped[:, 0]
        ys = warped[:, 1]

        nx1 = max(0.0, min(float(xs.min()), img_w))
        ny1 = max(0.0, min(float(ys.min()), img_h))
        nx2 = max(0.0, min(float(xs.max()), img_w))
        ny2 = max(0.0, min(float(ys.max()), img_h))

        nw = nx2 - nx1
        nh = ny2 - ny1

        # Drop boxes that disappear completely after augmentation.
        if nw <= 1 or nh <= 1:
            continue

        ncx = (nx1 + nx2) / 2
        ncy = (ny1 + ny2) / 2

        transformed.append(
            f"{class_id} {ncx/img_w} {ncy/img_h} {nw/img_w} {nh/img_h}"
        )

    return transformed


def process_image(img, img_w, img_h, bboxes, split, filename):
    """
    Apply image augmentation while keeping YOLO labels synchronized.
    Geometric transforms must also be applied to bbox coordinates.
    """
    img_cv = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

    # Color/grayscale augmentation does not change bbox geometry.
    if random.random() < 0.3:
        img_cv = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        img_cv = cv2.cvtColor(img_cv, cv2.COLOR_GRAY2BGR)

    # Rotation + bbox transform.
    if random.random() > 0.5:
        angle = random.uniform(-1.5, 1.5)
        center = (img_w / 2, img_h / 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)

        img_cv = cv2.warpAffine(
            img_cv,
            M,
            (img_w, img_h),
            borderValue=(255, 255, 255)
        )

        bboxes = transform_yolo_bboxes_affine(
            bboxes, M, img_w, img_h
        )

    # Photometric augmentation: geometry unchanged.
    img_aug = pipeline.augment(img_cv)["output"]

    cv2.imwrite(
        f"{DATASET_DIR}/images/{split}/{filename}.jpg",
        img_aug
    )

    with open(
        f"{DATASET_DIR}/labels/{split}/{filename}.txt",
        "w",
        encoding="utf-8"
    ) as f:
        f.write("\n".join(bboxes))

# --- GENERATE FORM ĐÁNH MÁY ---
def generate_form(image_id, split):
    img_w, img_h = 850, random.randint(1150, 1350)
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

    # Long-form instruction/commitment block: usually 2-4 rendered lines.
    cam_ket = random.choice(FORM_PARAGRAPHS)
    y_off, _ = draw_paragraph(
        draw, bboxes, cam_ket, 50, y_off,
        max_width_px=random.randint(560, 690),
        font=font_inst, class_id=1, img_w=img_w, img_h=img_h
    )

    y_off += random.randint(35, 60)
    draw.text((500, y_off), "Người làm đơn", fill=(0,0,0), font=font_label)
    add_bbox(bboxes, draw, font_label, "Người làm đơn", 500, y_off, 2, img_w, img_h)
    y_off += 28
    draw.text((490, y_off), "(Ký và ghi rõ họ tên)", fill=(0,0,0), font=font_inst)
    add_bbox(bboxes, draw, font_inst, "(Ký và ghi rõ họ tên)", 490, y_off, 1, img_w, img_h)
    
    # Đã xóa sạch chữ ký rác

    return process_image(img, img_w, img_h, bboxes, split, f"doc_v6_{image_id:04d}")

# --- FIX: GENERATE ANNOUNCEMENT ---
def generate_announcement(image_id, split):
    img_w, img_h = 850, random.randint(1200, 1400)
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

    # 2-4 paragraph blocks with variable widths.
    for _ in range(random.randint(2, 4)):
        raw_para = random.choice(ANN_PARAGRAPHS)

        # Occasionally inject Faker text to increase lexical diversity.
        if random.random() < 0.35:
            raw_para = fake.paragraph(
                nb_sentences=random.randint(3, 5)
            ).replace("\n", " ")

        y_off, _ = draw_paragraph(
            draw, bboxes, raw_para, 50, y_off,
            max_width_px=random.randint(610, 700),
            font=font_label, class_id=1, img_w=img_w, img_h=img_h
        )
        y_off += random.randint(18, 35)

    y_off += 30
    draw.text((550, y_off), "GIÁM ĐỐC", fill=(0,0,0), font=font_header)
    add_bbox(bboxes, draw, font_header, "GIAM DOC", 550, y_off, 1, img_w, img_h)
    
    # Đã xóa sạch chữ ký rác

    return process_image(img, img_w, img_h, bboxes, split, f"doc_v6_{image_id:04d}")


# --- DATASET QA: VISUALIZE BBOXES ---
CLASS_NAMES = {v: k for k, v in CLASSES.items()}

def visualize_sample(image_path, label_path, output_path=None):
    """
    Draw YOLO labels on an image for manual dataset QA.
    """
    image = cv2.imread(str(image_path))
    if image is None:
        raise FileNotFoundError(f"Cannot read image: {image_path}")

    img_h, img_w = image.shape[:2]

    if Path(label_path).exists():
        with open(label_path, "r", encoding="utf-8") as f:
            lines = [line.strip() for line in f if line.strip()]

        for line in lines:
            parts = line.split()
            if len(parts) != 5:
                continue

            class_id = int(parts[0])
            cx, cy, bw, bh = map(float, parts[1:])

            x1 = int((cx - bw / 2) * img_w)
            y1 = int((cy - bh / 2) * img_h)
            x2 = int((cx + bw / 2) * img_w)
            y2 = int((cy + bh / 2) * img_h)

            x1 = max(0, min(x1, img_w - 1))
            y1 = max(0, min(y1, img_h - 1))
            x2 = max(0, min(x2, img_w - 1))
            y2 = max(0, min(y2, img_h - 1))

            cv2.rectangle(
                image, (x1, y1), (x2, y2),
                (0, 255, 0), 2
            )

            name = CLASS_NAMES.get(class_id, f"class_{class_id}")
            cv2.putText(
                image,
                name,
                (x1, max(15, y1 - 5)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (0, 255, 0),
                1,
                cv2.LINE_AA
            )

    if output_path:
        cv2.imwrite(str(output_path), image)

    return image


def validate_dataset_structure(dataset_dir=DATASET_DIR):
    """
    Basic automated QA:
    - every image should have a label file
    - every label should have 5 YOLO fields
    - bbox values should be normalized
    """
    errors = []
    total = 0

    for split in ["train", "val"]:
        image_dir = Path(dataset_dir) / "images" / split
        label_dir = Path(dataset_dir) / "labels" / split

        for image_path in sorted(image_dir.glob("*.jpg")):
            total += 1
            label_path = label_dir / f"{image_path.stem}.txt"

            if not label_path.exists():
                errors.append(f"Missing label: {label_path}")
                continue

            with open(label_path, "r", encoding="utf-8") as f:
                for line_no, line in enumerate(f, 1):
                    parts = line.strip().split()
                    if len(parts) != 5:
                        errors.append(
                            f"Bad label format: {label_path}:{line_no}"
                        )
                        continue

                    try:
                        class_id = int(parts[0])
                        vals = list(map(float, parts[1:]))
                    except ValueError:
                        errors.append(
                            f"Non-numeric label: {label_path}:{line_no}"
                        )
                        continue

                    if class_id not in CLASS_NAMES:
                        errors.append(
                            f"Unknown class {class_id}: {label_path}:{line_no}"
                        )

                    if any(v < 0 or v > 1 for v in vals):
                        errors.append(
                            f"Out-of-range bbox: {label_path}:{line_no}"
                        )

                    _, _, bw, bh = vals
                    if bw <= 0 or bh <= 0:
                        errors.append(
                            f"Non-positive bbox size: {label_path}:{line_no}"
                        )

    print(f"Dataset QA: checked {total} images")
    if errors:
        print(f"❌ Found {len(errors)} problems:")
        for e in errors[:30]:
            print(" -", e)
        if len(errors) > 30:
            print(f" ... and {len(errors) - 30} more")
        return False

    print("✅ Basic dataset structure QA passed.")
    return True


TOTAL_IMAGES = 100
print(f"🚀 Generating {TOTAL_IMAGES} controlled QA images for dataset_v03...")

for i in range(TOTAL_IMAGES):
    split = "val" if i < (TOTAL_IMAGES * 0.1) else "train"
    if random.random() < 0.8:
        generate_form(i, split)
    else:
        generate_announcement(i, split)
        
    if (i+1) % 250 == 0: 
        print(f"✅ Đã tạo {i+1}/{TOTAL_IMAGES} tài liệu...")

print("🎉 Synthetic dataset generation complete.")
validate_dataset_structure(DATASET_DIR)

# Create a few visual QA samples.
qa_dir = Path(DATASET_DIR) / "qa"
qa_dir.mkdir(parents=True, exist_ok=True)

sample_images = sorted(
    (Path(DATASET_DIR) / "images" / "train").glob("*.jpg")
)[:10]

for image_path in sample_images:
    label_path = (
        Path(DATASET_DIR) / "labels" / "train" /
        f"{image_path.stem}.txt"
    )
    visualize_sample(
        image_path,
        label_path,
        qa_dir / f"{image_path.stem}_bbox.jpg"
    )

print(f"👀 QA samples saved to: {qa_dir}")