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
DATASET_DIR = "dataset_v05"
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

NARRATIVE_TITLES = [
    "THÔNG BÁO TÌM TRẺ THẤT LẠC", "CÁO PHÓ", "ĐƠN TRÌNH BÀY",
    "ĐƠN KIẾN NGHỊ", "THÔNG BÁO TÌM NGƯỜI", "THÔNG BÁO KHẨN",
]
NARRATIVE_SECTIONS = [
    "NỘI DUNG SỰ VIỆC", "THÔNG TIN CHI TIẾT", "ĐẶC ĐIỂM NHẬN DẠNG",
    "NỘI DUNG TRÌNH BÀY", "THÔNG TIN LIÊN QUAN",
]
NARRATIVE_PARAGRAPHS = [
    "Ngày hôm qua, gia đình chúng tôi phát hiện người thân không trở về nhà theo thời gian dự kiến. Gia đình đã chủ động tìm kiếm tại những khu vực thường xuyên lui tới nhưng hiện vẫn chưa có thông tin.",
    "Người được tìm kiếm có đặc điểm nhận dạng dễ nhận biết và thường xuất hiện tại khu vực sinh sống. Nếu có thông tin liên quan, kính mong mọi người liên hệ với gia đình theo thông tin được cung cấp trong văn bản.",
    "Tôi làm đơn này để trình bày sự việc đã xảy ra trong thời gian qua. Nội dung sự việc có liên quan đến các thông tin được kê khai ở phần trên và cần được xem xét, xác minh theo quy định.",
    "Qua quá trình tìm hiểu và làm việc với các bên liên quan, tôi nhận thấy sự việc cần được giải quyết một cách đầy đủ và rõ ràng. Vì vậy, tôi kính đề nghị cơ quan có thẩm quyền xem xét nội dung và phản hồi trong thời gian phù hợp.",
    "Gia đình vô cùng thương tiếc báo tin người thân đã từ trần sau một thời gian điều trị. Lễ viếng, lễ truy điệu và lễ an táng được tổ chức theo thông tin nêu trong thông báo này.",
    "Thông tin trên được gia đình cung cấp để mọi người cùng biết và hỗ trợ chia sẻ. Nếu có thông tin mới, kính mong liên hệ theo số điện thoại hoặc địa chỉ được ghi trong văn bản.",
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


def rescale_yolo_bboxes_after_vertical_crop(bboxes, old_h, new_h):
    """
    Rescale YOLO bboxes after vertically cropping the image.
    Only Y-axis normalized coordinates (cy, bh) need adjustment.
    """
    if old_h == new_h:
        return bboxes
    
    rescaled = []
    ratio = old_h / new_h
    
    for line in bboxes:
        parts = line.strip().split()
        if len(parts) != 5:
            continue
        
        class_id = parts[0]
        cx, cy, bw, bh = map(float, parts[1:])
        
        new_cy = cy * ratio
        new_bh = bh * ratio
        
        rescaled.append(f"{class_id} {cx} {new_cy} {bw} {new_bh}")
        
    return rescaled


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


# --- DOCUMENT TYPES / LAYOUT VOCABULARY ---
DOCUMENT_TYPES = [
    "simple_form",
    "application_form",
    "hybrid_form",
    "narrative",
]

DOCUMENT_TYPE_WEIGHTS = [0.30, 0.30, 0.25, 0.15]

SIMPLE_TITLES = [
    "PHIẾU ĐĂNG KÝ THÔNG TIN",
    "PHIẾU KHẢO SÁT",
    "GIẤY ĐĂNG KÝ",
    "PHIẾU CẬP NHẬT THÔNG TIN",
    "BẢN KÊ THÔNG TIN",
]

APPLICATION_TITLES = [
    "ĐƠN XIN NGHỈ HỌC",
    "ĐƠN XIN THÔI VIỆC",
    "ĐƠN ĐỀ NGHỊ",
    "ĐƠN XIN XÁC NHẬN",
    "ĐƠN KIẾN NGHỊ",
    "ĐƠN TRÌNH BÀY",
]

HYBRID_TITLES = [
    "ĐƠN ĐỀ NGHỊ GIẢI QUYẾT SỰ VIỆC",
    "ĐƠN PHẢN ÁNH",
    "ĐƠN KIẾN NGHỊ",
    "PHIẾU GHI NHẬN THÔNG TIN",
    "THÔNG BÁO KÈM NỘI DUNG CHI TIẾT",
]

NARRATIVE_TITLES = [
    "THÔNG BÁO TÌM TRẺ THẤT LẠC",
    "CÁO PHÓ",
    "THÔNG BÁO TÌM NGƯỜI",
    "THÔNG BÁO KHẨN",
    "ĐƠN TRÌNH BÀY SỰ VIỆC",
]

SECTIONS = [
    "NỘI DUNG SỰ VIỆC",
    "THÔNG TIN CHI TIẾT",
    "ĐẶC ĐIỂM NHẬN DẠNG",
    "NỘI DUNG TRÌNH BÀY",
    "THÔNG TIN LIÊN QUAN",
    "YÊU CẦU VÀ ĐỀ NGHỊ",
]

FIELD_POOLS = {
    "simple_form": [
        "Họ và tên:", "Ngày sinh:", "Lớp:", "Mã sinh viên:",
        "Đơn vị:", "Số điện thoại:", "Địa chỉ:", "Email:",
    ],
    "application_form": [
        "Họ và tên:", "Ngày sinh:", "Đơn vị:", "Chức vụ:",
        "Số điện thoại:", "Địa chỉ:", "Mã sinh viên:",
    ],
    "hybrid_form": [
        "Họ và tên:", "Người liên hệ:", "Số điện thoại:", "Địa chỉ:",
        "Thời gian:", "Địa điểm:", "Đơn vị:", "Mã hồ sơ:",
    ],
    "narrative": [
        "Họ và tên:", "Ngày sinh:", "Địa điểm:", "Thời gian:",
        "Số điện thoại:", "Địa chỉ liên hệ:",
    ],
}

VALUES = [
    lambda: fake.name(),
    lambda: fake.date(pattern="%d/%m/%Y"),
    lambda: f"Lớp {random.choice(['23CNTT1', '23CNTT2', '24CNTT1', '24CNTT2'])}",
    lambda: str(random.randint(10000000, 99999999)),
    lambda: fake.address().replace("\n", ", "),
    lambda: fake.phone_number(),
    lambda: fake.city(),
    lambda: f"{random.randint(1, 28):02d}/{random.randint(1, 12):02d}/2026",
]

BODY_PARAGRAPHS = [
    "Tôi làm đơn này để trình bày sự việc và kính đề nghị cơ quan, đơn vị có thẩm quyền xem xét nội dung được nêu trong văn bản.",
    "Trong thời gian qua, sự việc đã phát sinh một số vấn đề cần được kiểm tra và làm rõ. Tôi xin cung cấp các thông tin liên quan để thuận tiện cho việc xem xét.",
    "Tôi kính đề nghị đơn vị tiếp nhận hồ sơ xem xét, xác minh và phản hồi theo quy định. Các thông tin được cung cấp trong văn bản này là những thông tin mà tôi biết và có thể xác nhận.",
    "Qua quá trình trao đổi với các bên liên quan, tôi nhận thấy vấn đề cần được giải quyết đầy đủ và rõ ràng. Vì vậy, tôi xin trình bày nội dung sự việc như sau.",
    "Gia đình chúng tôi đã chủ động liên hệ với những người có liên quan và tìm kiếm thông tin tại các khu vực cần thiết. Nếu có thông tin mới, kính mong mọi người liên hệ theo thông tin được cung cấp.",
    "Nội dung trên được lập nhằm ghi nhận thông tin và làm cơ sở cho việc xử lý tiếp theo. Tôi xin chịu trách nhiệm về các thông tin đã kê khai trong văn bản.",
]

ANN_TITLES = [
    "THÔNG BÁO",
    "QUYẾT ĐỊNH",
    "CHỈ THỊ",
    "NỘI QUY",
    "KẾ HOẠCH",
    "THÔNG BÁO VỀ VIỆC ĐĂNG KÝ",
]

def draw_header(draw, bboxes, img_w, img_h):
    """Vary the document header so the model cannot memorize one template."""
    style = random.choice(["center", "split", "organization", "minimal"])

    if style == "center":
        qh = random.choice([
            "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
            "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
        ])
        w = draw.textbbox((0, 0), qh, font=font_header)[2]
        x = (img_w - w) / 2
        draw.text((x, 45), qh, fill=(0, 0, 0), font=font_header)
        add_bbox(bboxes, draw, font_header, qh, x, 45, 0, img_w, img_h)
        return 115

    if style == "split":
        left = random.choice(["BỘ GIÁO DỤC VÀ ĐÀO TẠO", "UBND THÀNH PHỐ", "PHÒNG ĐÀO TẠO"])
        right = "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"
        draw.text((35, 45), left, fill=(0, 0, 0), font=font_label)
        add_bbox(bboxes, draw, font_label, left, 35, 45, 0, img_w, img_h)
        rw = draw.textbbox((0, 0), right, font=font_header)[2]
        rx = img_w - rw - 35
        draw.text((rx, 45), right, fill=(0, 0, 0), font=font_header)
        add_bbox(bboxes, draw, font_header, right, rx, 45, 0, img_w, img_h)
        return 115

    if style == "organization":
        org = random.choice([
            "TRƯỜNG ĐẠI HỌC X",
            "CÔNG TY TNHH ABC",
            "TRUNG TÂM HỖ TRỢ SINH VIÊN",
            "ỦY BAN NHÂN DÂN PHƯỜNG X",
        ])
        draw.text((40, 42), org, fill=(0, 0, 0), font=font_header)
        add_bbox(bboxes, draw, font_header, org, 40, 42, 0, img_w, img_h)
        return 105

    return 85


def draw_title(draw, bboxes, title, y, img_w, img_h):
    w = draw.textbbox((0, 0), title, font=font_header)[2]
    x = (img_w - w) / 2
    draw.text((x, y), title, fill=(0, 0, 0), font=font_header)
    add_bbox(bboxes, draw, font_header, title, x, y, 0, img_w, img_h)
    return y + 70


def draw_field(draw, bboxes, label, value, x, y, img_w, img_h, filled=True):
    draw.text((x, y), label, fill=(0, 0, 0), font=font_label)
    lw, _ = add_bbox(bboxes, draw, font_label, label, x, y, 2, img_w, img_h)

    value_x = x + lw + 12
    if filled and value:
        draw.text((value_x, y), value, fill=(0, 0, 0), font=font_value_typed)
        add_bbox(
            bboxes, draw, font_value_typed, value,
            value_x, y, 3, img_w, img_h
        )
    else:
        line_w = random.randint(120, 300)
        draw.line(
            (value_x, y + 25, min(img_w - 45, value_x + line_w), y + 25),
            fill=(0, 0, 0), width=1
        )
    return y + 48


def draw_checkbox_row(draw, bboxes, y, img_w, img_h, filled=True):
    label = "Giới tính:"
    draw.text((50, y), label, fill=(0, 0, 0), font=font_label)
    add_bbox(bboxes, draw, font_label, label, 50, y, 2, img_w, img_h)

    x = 190
    options = ["Nam", "Nữ"]
    chosen = random.randint(0, 1) if filled else -1

    for i, option in enumerate(options):
        size = 20
        draw.rectangle(
            [x, y + 5, x + size, y + 5 + size],
            outline=(0, 0, 0), width=2
        )
        cls = 4
        if i == chosen:
            draw.text(
                (x + 2, y - 2), "x",
                fill=(0, 0, 0), font=font_value_typed
            )
            cls = 5

        bboxes.append(
            f"{cls} {(x + size/2)/img_w} "
            f"{(y + 5 + size/2)/img_h} "
            f"{size/img_w} {size/img_h}"
        )
        draw.text((x + 30, y), option, fill=(0, 0, 0), font=font_label)
        add_bbox(
            bboxes, draw, font_label, option,
            x + 30, y, 2, img_w, img_h
        )
        x += 145

    return y + 50


def draw_section(draw, bboxes, text, y, img_w, img_h):
    draw.text((50, y), text, fill=(0, 0, 0), font=font_label)
    add_bbox(bboxes, draw, font_label, text, 50, y, 1, img_w, img_h)
    return y + 42


def draw_body(draw, bboxes, y, count, img_w, img_h, font=None):
    font = font or font_inst
    for _ in range(count):
        text = random.choice(BODY_PARAGRAPHS)
        if random.random() < 0.40:
            text += " " + random.choice(BODY_PARAGRAPHS)
        y, _ = draw_paragraph(
            draw, bboxes, text, 55, y,
            max_width_px=random.randint(580, 710),
            font=font, class_id=1,
            img_w=img_w, img_h=img_h
        )
        y += random.randint(18, 32)
    return y


def draw_signature(draw, bboxes, y, img_w, img_h, role="Người làm đơn"):
    x = random.randint(500, 570)
    draw.text((x, y), role, fill=(0, 0, 0), font=font_label)
    add_bbox(bboxes, draw, font_label, role, x, y, 2, img_w, img_h)
    y += 30
    note = "(Ký và ghi rõ họ tên)"
    draw.text((x - 10, y), note, fill=(0, 0, 0), font=font_inst)
    add_bbox(bboxes, draw, font_inst, note, x - 10, y, 1, img_w, img_h)
    return y + 55


def finalize_document(img, y_used, bboxes, split, filename):
    """
    Crop the large working canvas to the actual document height.
    This prevents long documents from producing out-of-range labels.
    """
    img_w, max_h = img.size
    final_h = min(max_h, max(700, int(y_used + 80)))
    if final_h < max_h:
        img = img.crop((0, 0, img_w, final_h))
        bboxes = rescale_yolo_bboxes_after_vertical_crop(bboxes, max_h, final_h)
        
    return process_image(
        img, img_w, final_h, bboxes, split, filename
    )


def generate_form(image_id, split):
    # Large working canvas; final image is cropped after layout is complete.
    img_w, max_h = 850, 2600
    img = Image.new("RGB", (img_w, max_h), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    bboxes = []

    document_type = random.choices(
        DOCUMENT_TYPES,
        weights=DOCUMENT_TYPE_WEIGHTS,
        k=1
    )[0]

    form_state = random.choices(
        ["blank", "partial", "full"],
        weights=[0.15, 0.25, 0.60],
        k=1
    )[0]

    draw_invisible_stamps(draw, img_w, max_h)

    y = draw_header(draw, bboxes, img_w, max_h)

    if document_type == "simple_form":
        title = random.choice(SIMPLE_TITLES)
    elif document_type == "application_form":
        title = random.choice(APPLICATION_TITLES)
    elif document_type == "hybrid_form":
        title = random.choice(HYBRID_TITLES)
    else:
        title = random.choice(NARRATIVE_TITLES)

    y = draw_title(draw, bboxes, title, y + 20, img_w, max_h)

    # ---------- SIMPLE FORM ----------
    if document_type == "simple_form":
        fields = random.sample(
            FIELD_POOLS["simple_form"],
            random.randint(4, 7)
        )
        two_column = random.random() < 0.35

        if two_column:
            left_fields = fields[:len(fields)//2]
            right_fields = fields[len(fields)//2:]
            rows = max(len(left_fields), len(right_fields))

            for i in range(rows):
                row_y = y
                if i < len(left_fields):
                    label = left_fields[i]
                    value = random.choice(VALUES)() if form_state != "blank" else ""
                    draw_field(draw, bboxes, label, value, 50, row_y, img_w, max_h, form_state != "blank")
                if i < len(right_fields):
                    label = right_fields[i]
                    value = random.choice(VALUES)() if form_state != "blank" else ""
                    draw_field(draw, bboxes, label, value, 440, row_y, img_w, max_h, form_state != "blank")
                y += 58
        else:
            for label in fields:
                value = random.choice(VALUES)() if form_state != "blank" else ""
                y = draw_field(
                    draw, bboxes, label, value, 50, y,
                    img_w, max_h, form_state != "blank"
                )

        if random.random() < 0.65:
            y = draw_checkbox_row(
                draw, bboxes, y + 5, img_w, max_h,
                filled=form_state != "blank"
            )

        if random.random() < 0.50:
            note = random.choice([
                "Tôi xin cam kết những thông tin trên là đúng sự thật.",
                "Tôi xin chịu trách nhiệm về nội dung đã kê khai.",
            ])
            y, _ = draw_paragraph(
                draw, bboxes, note, 50, y + 10, 680,
                font_inst, 1, img_w, max_h
            )

        y = draw_signature(draw, bboxes, y + 20, img_w, max_h)

    # ---------- APPLICATION / ĐƠN ----------
    elif document_type == "application_form":
        recipient = random.choice([
            "Kính gửi: Ban Giám hiệu nhà trường",
            "Kính gửi: Phòng Công tác Sinh viên",
            "Kính gửi: Trưởng phòng Hành chính",
            "Kính gửi: Ban Giám đốc đơn vị",
        ])
        draw.text((50, y), recipient, fill=(0, 0, 0), font=font_label)
        add_bbox(bboxes, draw, font_label, recipient, 50, y, 1, img_w, max_h)
        y += 48

        fields = random.sample(
            FIELD_POOLS["application_form"],
            random.randint(3, 5)
        )
        for label in fields:
            value = random.choice(VALUES)() if form_state != "blank" else ""
            y = draw_field(
                draw, bboxes, label, value, 50, y,
                img_w, max_h, form_state != "blank"
            )

        y += 8
        y = draw_section(
            draw, bboxes, "NỘI DUNG ĐỀ NGHỊ", y, img_w, max_h
        )
        y = draw_body(
            draw, bboxes, y, random.randint(1, 3),
            img_w, max_h
        )

        if random.random() < 0.70:
            y = draw_section(
                draw, bboxes, "CAM KẾT", y + 5,
                img_w, max_h
            )
            y = draw_body(draw, bboxes, y, 1, img_w, max_h)

        y = draw_signature(draw, bboxes, y + 15, img_w, max_h)

    # ---------- HYBRID ----------
    elif document_type == "hybrid_form":
        fields = random.sample(
            FIELD_POOLS["hybrid_form"],
            random.randint(3, 5)
        )
        for label in fields:
            value = random.choice(VALUES)() if form_state != "blank" else ""
            y = draw_field(
                draw, bboxes, label, value, 50, y,
                img_w, max_h, form_state != "blank"
            )

        section_count = random.randint(1, 2)
        for idx in range(section_count):
            y = draw_section(
                draw, bboxes,
                random.choice(SECTIONS),
                y + 10, img_w, max_h
            )
            y = draw_body(
                draw, bboxes, y,
                random.randint(2, 4),
                img_w, max_h
            )

        if random.random() < 0.55:
            y = draw_checkbox_row(
                draw, bboxes, y + 5, img_w, max_h,
                filled=form_state != "blank"
            )

        y = draw_signature(draw, bboxes, y + 15, img_w, max_h)

    # ---------- NARRATIVE ----------
    else:
        if title == "CÁO PHÓ":
            fields = ["Họ và tên:", "Ngày sinh:", "Thời gian:", "Địa điểm:"]
            for label in random.sample(fields, random.randint(2, 4)):
                value = random.choice(VALUES)()
                y = draw_field(
                    draw, bboxes, label, value, 50, y,
                    img_w, max_h, True
                )

            y = draw_section(
                draw, bboxes, "NỘI DUNG THÔNG BÁO",
                y + 10, img_w, max_h
            )
            y = draw_body(
                draw, bboxes, y, random.randint(3, 5),
                img_w, max_h, font_label
            )
            y = draw_signature(
                draw, bboxes, y + 20, img_w, max_h,
                role="Đại diện gia đình"
            )

        elif title == "THÔNG BÁO TÌM TRẺ THẤT LẠC":
            fields = [
                "Họ và tên:", "Ngày sinh:",
                "Thời gian mất liên lạc:", "Khu vực:",
                "Số điện thoại liên hệ:"
            ]
            for label in random.sample(fields, random.randint(3, 5)):
                value = random.choice(VALUES)()
                y = draw_field(
                    draw, bboxes, label, value, 50, y,
                    img_w, max_h, True
                )

            y = draw_section(
                draw, bboxes, "ĐẶC ĐIỂM NHẬN DẠNG",
                y + 10, img_w, max_h
            )
            y = draw_body(
                draw, bboxes, y, random.randint(2, 4),
                img_w, max_h, font_label
            )

            y = draw_section(
                draw, bboxes, "THÔNG TIN LIÊN QUAN",
                y + 5, img_w, max_h
            )
            y = draw_body(draw, bboxes, y, 1, img_w, max_h)

        else:
            y = draw_section(
                draw, bboxes, random.choice(SECTIONS),
                y + 10, img_w, max_h
            )
            y = draw_body(
                draw, bboxes, y, random.randint(4, 7),
                img_w, max_h, font_label
            )

            if random.random() < 0.55:
                y = draw_section(
                    draw, bboxes, random.choice(SECTIONS),
                    y + 5, img_w, max_h
                )
                y = draw_body(
                    draw, bboxes, y, random.randint(2, 4),
                    img_w, max_h, font_label
                )

            y = draw_signature(
                draw, bboxes, y + 20, img_w, max_h,
                role=random.choice(["Người thông báo", "Đại diện đơn vị"])
            )

    return finalize_document(
        img, y, bboxes, split,
        f"doc_v8_{image_id:04d}"
    )



# --- GENERATE ANNOUNCEMENT / OFFICIAL DOCUMENT ---
def generate_announcement(image_id, split):
    img_w, max_h = 850, 2100
    img = Image.new("RGB", (img_w, max_h), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    bboxes = []

    draw_invisible_stamps(draw, img_w, max_h)

    header_style = random.choice(["split", "organization", "minimal"])
    if header_style == "split":
        left = random.choice([
            "BỘ GIÁO DỤC VÀ ĐÀO TẠO",
            "UBND THÀNH PHỐ",
            "PHÒNG ĐÀO TẠO",
        ])
        right = "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"
        draw.text((35, 45), left, fill=(0, 0, 0), font=font_label)
        add_bbox(bboxes, draw, font_label, left, 35, 45, 0, img_w, max_h)
        rw = draw.textbbox((0, 0), right, font=font_header)[2]
        rx = img_w - rw - 35
        draw.text((rx, 45), right, fill=(0, 0, 0), font=font_header)
        add_bbox(bboxes, draw, font_header, right, rx, 45, 0, img_w, max_h)
        y = 125
    elif header_style == "organization":
        org = random.choice([
            "TRƯỜNG ĐẠI HỌC X",
            "CÔNG TY TNHH ABC",
            "TRUNG TÂM HỖ TRỢ SINH VIÊN",
        ])
        draw.text((40, 45), org, fill=(0, 0, 0), font=font_header)
        add_bbox(bboxes, draw, font_header, org, 40, 45, 0, img_w, max_h)
        y = 120
    else:
        y = 70

    title = random.choice(ANN_TITLES)
    y = draw_title(draw, bboxes, title, y + 15, img_w, max_h)

    if random.random() < 0.45:
        y = draw_section(
            draw, bboxes, "NỘI DUNG THÔNG BÁO",
            y, img_w, max_h
        )

    y = draw_body(
        draw, bboxes, y,
        random.randint(3, 6),
        img_w, max_h,
        font_label
    )

    if random.random() < 0.50:
        y = draw_section(
            draw, bboxes, "TỔ CHỨC THỰC HIỆN",
            y + 5, img_w, max_h
        )
        y = draw_body(draw, bboxes, y, random.randint(1, 2), img_w, max_h)

    y += 20
    role = random.choice(["GIÁM ĐỐC", "HIỆU TRƯỞNG", "TRƯỞNG PHÒNG"])
    x = random.randint(500, 570)
    draw.text((x, y), role, fill=(0, 0, 0), font=font_header)
    add_bbox(bboxes, draw, font_header, role, x, y, 0, img_w, max_h)

    return finalize_document(
        img, y + 55, bboxes, split,
        f"doc_v8_{image_id:04d}"
    )


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
MANIFEST_PATH = Path(DATASET_DIR) / "manifest.csv"
print(f"🚀 Generating {TOTAL_IMAGES} controlled QA images for dataset_v05...")

manifest_rows = []

for i in range(TOTAL_IMAGES):
    split = "val" if i < (TOTAL_IMAGES * 0.1) else "train"

    # Keep the overall 80/20 form/announcement ratio.
    if random.random() < 0.80:
        generate_form(i, split)
        # Recover document type from the generated filename only for tracking:
        # actual distribution is sampled inside generate_form.
        kind = "form"
    else:
        generate_announcement(i, split)
        kind = "announcement"

    manifest_rows.append({
        "image_id": i,
        "split": split,
        "category": kind,
    })

    if (i + 1) % 25 == 0:
        print(f"✅ Đã tạo {i+1}/{TOTAL_IMAGES} tài liệu...")

print("🎉 Synthetic dataset generation complete.")
qa_ok = validate_dataset_structure(DATASET_DIR)

# Save basic generation manifest.
import csv
with open(MANIFEST_PATH, "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(
        f, fieldnames=["image_id", "split", "category"]
    )
    writer.writeheader()
    writer.writerows(manifest_rows)

# Create balanced visual QA samples.
qa_dir = Path(DATASET_DIR) / "qa"
qa_dir.mkdir(parents=True, exist_ok=True)

all_train_images = sorted(
    (Path(DATASET_DIR) / "images" / "train").glob("*.jpg")
)

# Instead of simply taking the first 10 files, sample across the dataset.
rng = random.Random(SEED + 500)
if len(all_train_images) > 20:
    sample_images = rng.sample(all_train_images, 20)
else:
    sample_images = all_train_images

for image_path in sorted(sample_images):
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
print(f"📋 Manifest saved to: {MANIFEST_PATH}")

if not qa_ok:
    print("⚠️ Dataset chưa đạt QA. Không nên scale lên hàng nghìn ảnh.")
else:
    print("✅ Dataset structure QA passed. Hãy kiểm tra 20 ảnh trong QA trước khi scale.")
