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
DATASET_DIR = "dataset_v04"
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

# --- GENERATE FORM / APPLICATION / HYBRID / NARRATIVE ---
def generate_form(image_id, split):
    document_type = random.choices(
        [
            "simple_form",
            "application_form",
            "hybrid_form",
            "narrative",
        ],
        weights=[
            0.30,
            0.30,
            0.25,
            0.15,
        ],
        k=1
    )[0]


    img_w = 850
    if document_type == "simple_form":
        img_h = random.randint(1100, 1400)
    elif document_type == "application_form":
        img_h = random.randint(1350, 1750)
    elif document_type == "hybrid_form":
        img_h = random.randint(1650, 2200)
    else:  # narrative
        img_h = random.randint(1650, 2300)

    img = Image.new("RGB", (img_w, img_h), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    bboxes = []

    draw_invisible_stamps(draw, img_w, img_h)

    # ============================================================
    # 1. DATA POOLS
    # ============================================================

    SIMPLE_TITLES = [
        "GIẤY ĐĂNG KÝ",
        "PHIẾU ĐĂNG KÝ",
        "PHIẾU KHẢO SÁT",
        "GIẤY XÁC NHẬN",
        "PHIẾU THÔNG TIN",
    ]

    APPLICATION_TITLES = [
        "ĐƠN XIN NGHỈ HỌC",
        "ĐƠN ĐỀ NGHỊ",
        "ĐƠN TRÌNH BÀY",
        "ĐƠN XIN XÁC NHẬN",
        "ĐƠN XIN THÔI VIỆC",
        "ĐƠN KIẾN NGHỊ",
        "ĐƠN ĐỀ XUẤT",
    ]

    HYBRID_TITLES = [
        "ĐƠN ĐỀ NGHỊ",
        "ĐƠN TRÌNH BÀY",
        "ĐƠN XIN XÁC NHẬN",
        "GIẤY ĐĂNG KÝ",
        "PHIẾU ĐỀ NGHỊ",
        "BẢN TƯỜNG TRÌNH",
    ]

    NARRATIVE_TITLES = [
        "THÔNG BÁO TÌM TRẺ THẤT LẠC",
        "THÔNG BÁO TÌM NGƯỜI",
        "CÁO PHÓ",
        "THÔNG BÁO KHẨN",
        "THÔNG BÁO SỰ VIỆC",
    ]

    APPLICATION_PARAGRAPHS = [
        "Tôi làm đơn này để trình bày sự việc và kính đề nghị cơ quan có thẩm quyền xem xét, giải quyết nội dung nêu trên theo đúng quy định.",
        "Trong thời gian qua, tôi đã thực hiện các công việc liên quan nhưng vẫn còn một số nội dung chưa được giải quyết. Vì vậy, tôi kính đề nghị đơn vị xem xét và hỗ trợ.",
        "Nội dung sự việc phát sinh trong quá trình thực hiện công việc và có liên quan đến các thông tin đã được kê khai ở phần trên. Tôi xin trình bày cụ thể để đơn vị xem xét.",
        "Tôi kính đề nghị nhà trường xem xét hoàn cảnh thực tế và tạo điều kiện giải quyết nguyện vọng của tôi trong thời gian phù hợp.",
        "Qua quá trình làm việc và trao đổi với các bên liên quan, tôi nhận thấy vấn đề cần được xem xét đầy đủ. Tôi xin trình bày sự việc để được hướng dẫn và giải quyết.",
    ]

    HYBRID_PARAGRAPHS = [
        "Tôi làm đơn này để trình bày nội dung sự việc đã xảy ra trong thời gian qua. Các thông tin liên quan được cung cấp ở phần trên nhằm giúp đơn vị có cơ sở xem xét và xác minh.",
        "Trong quá trình thực hiện, tôi nhận thấy một số thông tin cần được bổ sung và làm rõ. Vì vậy, tôi xin trình bày chi tiết nội dung để cơ quan có thẩm quyền xem xét.",
        "Nội dung đăng ký được thực hiện theo nhu cầu thực tế của cá nhân. Tôi kính đề nghị đơn vị xem xét các thông tin đã cung cấp và phản hồi trong thời gian phù hợp.",
        "Tôi xin chịu trách nhiệm về tính chính xác của những thông tin đã kê khai trong văn bản này. Nếu có thay đổi, tôi sẽ chủ động thông báo để được cập nhật.",
        "Qua quá trình tìm hiểu, tôi nhận thấy nội dung trên cần được giải quyết theo quy định hiện hành. Tôi kính mong đơn vị xem xét và hướng dẫn các bước thực hiện tiếp theo.",
    ]

    LOST_PERSON_PARAGRAPHS = [
        "Vào khoảng thời gian nêu trên, gia đình phát hiện người thân không trở về nhà theo thời gian dự kiến. Gia đình đã chủ động tìm kiếm tại những khu vực thường xuyên lui tới nhưng hiện vẫn chưa có thông tin.",
        "Người được tìm kiếm có một số đặc điểm nhận dạng dễ nhận biết và thường xuất hiện tại khu vực sinh sống. Gia đình kính mong mọi người hỗ trợ chia sẻ thông tin và liên hệ nếu có thông tin liên quan.",
        "Nếu có bất kỳ thông tin nào về người được nêu trong thông báo, kính mong mọi người liên hệ theo số điện thoại hoặc địa chỉ được cung cấp bên dưới để gia đình có thể xác minh.",
    ]

    OBITUARY_PARAGRAPHS = [
        "Gia đình vô cùng thương tiếc báo tin người thân đã từ trần sau một thời gian điều trị. Sự ra đi của người thân là mất mát lớn đối với gia đình và những người quen biết.",
        "Lễ viếng, lễ truy điệu và lễ an táng được tổ chức theo thời gian và địa điểm được thông tin trong văn bản này. Gia đình kính báo để người thân, bạn bè cùng biết.",
        "Gia đình xin chân thành cảm ơn họ hàng, bạn bè và những người đã quan tâm, thăm hỏi và chia buồn trong thời gian qua.",
    ]


    # ============================================================
    # 3. HEADER VARIATION
    # ============================================================

    header_type = random.choice([
        "government_center",
        "government_split",
        "organization",
        "simple"
    ])

    if header_type == "government_center":
        qh = "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"
        qh_w = draw.textbbox((0, 0), qh, font=font_header)[2]
        qh_x = (img_w - qh_w) / 2

        draw.text((qh_x, 45), qh, fill=(0, 0, 0), font=font_header)
        add_bbox(
            bboxes, draw, font_header,
            qh, qh_x, 45, 0, img_w, img_h
        )

        y_off = 115

    elif header_type == "government_split":
        left_text = random.choice([
            "BỘ GIÁO DỤC VÀ ĐÀO TẠO",
            "TRƯỜNG ĐẠI HỌC X",
            "CÔNG TY TNHH ABC",
            "PHÒNG HÀNH CHÍNH",
            "UBND PHƯỜNG X",
        ])

        right_text = "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"

        draw.text(
            (40, 45),
            left_text,
            fill=(0, 0, 0),
            font=font_label
        )
        add_bbox(
            bboxes, draw, font_label,
            left_text, 40, 45, 0, img_w, img_h
        )

        rw = draw.textbbox(
            (0, 0), right_text, font=font_header
        )[2]

        rx = img_w - rw - 40

        draw.text(
            (rx, 45),
            right_text,
            fill=(0, 0, 0),
            font=font_header
        )
        add_bbox(
            bboxes, draw, font_header,
            right_text, rx, 45, 0, img_w, img_h
        )

        y_off = 115

    elif header_type == "organization":
        left_text = random.choice([
            "TRƯỜNG ĐẠI HỌC X",
            "CÔNG TY TNHH ABC",
            "KHOA CÔNG NGHỆ THÔNG TIN",
            "PHÒNG HÀNH CHÍNH",
            "TRUNG TÂM DỊCH VỤ X",
        ])

        draw.text(
            (40, 50),
            left_text,
            fill=(0, 0, 0),
            font=font_header
        )

        add_bbox(
            bboxes, draw, font_header,
            left_text, 40, 50, 0, img_w, img_h
        )

        y_off = 120

    else:
        y_off = 55

    # ============================================================
    # 4. TITLE
    # ============================================================

    if document_type == "simple_form":
        title = random.choice(SIMPLE_TITLES)

    elif document_type == "application_form":
        title = random.choice(APPLICATION_TITLES)

    elif document_type == "hybrid_form":
        title = random.choice(HYBRID_TITLES)

    else:
        title = random.choice(NARRATIVE_TITLES)

    title_w = draw.textbbox(
        (0, 0), title, font=font_header
    )[2]

    # Một số tài liệu căn giữa, một số căn trái
    title_align = random.choice(["center", "center", "left"])

    if title_align == "center":
        title_x = (img_w - title_w) / 2
    else:
        title_x = random.randint(50, 100)

    draw.text(
        (title_x, y_off),
        title,
        fill=(0, 0, 0),
        font=font_header
    )

    add_bbox(
        bboxes, draw, font_header,
        title, title_x, y_off, 0, img_w, img_h
    )

    y_off += random.randint(70, 100)

    # ============================================================
    # 5. LOCAL HELPERS
    # ============================================================

    def draw_field(label, value=None, x=50, y=0, width=500):
        """
        Draw:
            Label: ................ Value
        """
        label_w, _ = add_bbox(
            bboxes,
            draw,
            font_label,
            label,
            x,
            y,
            2,
            img_w,
            img_h
        )

        draw.text(
            (x, y),
            label,
            fill=(0, 0, 0),
            font=font_label
        )

        value_x = x + label_w + 12

        if value is None:
            dot_len = max(
                12,
                int((width - label_w) / 13)
            )

            dots = "_" * min(dot_len, 45)

            draw.text(
                (value_x, y),
                dots,
                fill=(0, 0, 0),
                font=font_label
            )
        else:
            draw.text(
                (value_x, y),
                value,
                fill=(0, 0, 0),
                font=font_value_typed
            )

            add_bbox(
                bboxes,
                draw,
                font_value_typed,
                value,
                value_x,
                y,
                3,
                img_w,
                img_h
            )

        return y + 42

    def draw_section(text, x, y):
        draw.text(
            (x, y),
            text,
            fill=(0, 0, 0),
            font=font_label
        )

        add_bbox(
            bboxes,
            draw,
            font_label,
            text,
            x,
            y,
            1,
            img_w,
            img_h
        )

        return y + 42

    def draw_body_paragraphs(paragraph_pool, x, y,
                             min_blocks=2, max_blocks=4):
        block_count = random.randint(
            min_blocks,
            max_blocks
        )

        for _ in range(block_count):
            text = random.choice(paragraph_pool)

            # Một phần tài liệu dùng Faker để tránh
            # toàn bộ paragraph giống nhau.
            if random.random() < 0.25:
                extra = fake.paragraph(
                    nb_sentences=random.randint(2, 4)
                ).replace("\n", " ")

                text = text + " " + extra

            y, _ = draw_paragraph(
                draw,
                bboxes,
                text,
                x,
                y,
                max_width_px=random.randint(
                    570,
                    700
                ),
                font=font_label,
                class_id=1,
                img_w=img_w,
                img_h=img_h
            )

            y += random.randint(18, 35)

        return y

    def draw_signature(y, role="Người làm đơn"):
        y += random.randint(25, 50)

        x = random.choice([
            480,
            500,
            530,
        ])

        draw.text(
            (x, y),
            role,
            fill=(0, 0, 0),
            font=font_label
        )

        add_bbox(
            bboxes,
            draw,
            font_label,
            role,
            x,
            y,
            2,
            img_w,
            img_h
        )

        y += 30

        sign_text = "(Ký và ghi rõ họ tên)"

        draw.text(
            (x - 10, y),
            sign_text,
            fill=(0, 0, 0),
            font=font_inst
        )

        add_bbox(
            bboxes,
            draw,
            font_inst,
            sign_text,
            x - 10,
            y,
            1,
            img_w,
            img_h
        )

        return y + 60

    # ============================================================
    # 6. SIMPLE FORM
    # ============================================================

    if document_type == "simple_form":

        field_sets = [
            [
                ("Họ và tên:", fake.name()),
                ("Ngày sinh:", "01/01/2005"),
                ("Lớp:", "23CNTT2"),
                ("Địa chỉ:", "Đà Nẵng"),
                ("Số điện thoại:", "09xxxxxxxx"),
            ],
            [
                ("Họ và tên:", fake.name()),
                ("Đơn vị:", "Khoa Công nghệ thông tin"),
                ("Mã sinh viên:", "23CNTT000"),
                ("Ngày đăng ký:", "21/09/2026"),
                ("Nội dung:", "Đăng ký tham gia"),
            ],
            [
                ("Họ và tên:", fake.name()),
                ("Ngày sinh:", "15/08/2005"),
                ("Địa chỉ:", "Thừa Thiên Huế"),
                ("Lý do:", "Đăng ký theo nhu cầu"),
            ],
        ]

        fields = random.choice(field_sets)

        # Có thể 1 hoặc 2 cột
        two_columns = random.random() < 0.35

        if two_columns and len(fields) >= 4:

            left = fields[:len(fields)//2]
            right = fields[len(fields)//2:]

            max_rows = max(len(left), len(right))

            for i in range(max_rows):

                row_y = y_off

                if i < len(left):
                    label, value = left[i]

                    draw_field(
                        label,
                        value if random.random() < 0.7 else None,
                        x=50,
                        y=row_y,
                        width=330
                    )

                if i < len(right):
                    label, value = right[i]

                    draw_field(
                        label,
                        value if random.random() < 0.7 else None,
                        x=430,
                        y=row_y,
                        width=330
                    )

                y_off += 50

        else:
            for label, value in fields:

                y_off = draw_field(
                    label,
                    value if random.random() < 0.75 else None,
                    x=random.choice([50, 60, 70]),
                    y=y_off,
                    width=680
                )

        # Chỉ một số giấy có checkbox
        if random.random() < 0.55:

            y_off += 15

            gender_text = "Giới tính:"

            draw.text(
                (50, y_off),
                gender_text,
                fill=(0, 0, 0),
                font=font_label
            )

            add_bbox(
                bboxes,
                draw,
                font_label,
                gender_text,
                50,
                y_off,
                2,
                img_w,
                img_h
            )

            x = 200
            chosen = random.randint(0, 1)

            for idx, option in enumerate(
                ["Nam", "Nữ"]
            ):

                box_size = 20

                draw.rectangle(
                    [
                        x,
                        y_off + 4,
                        x + box_size,
                        y_off + 4 + box_size
                    ],
                    outline=(0, 0, 0),
                    width=2
                )

                if idx == chosen:

                    draw.text(
                        (x + 2, y_off - 2),
                        "x",
                        fill=(0, 0, 0),
                        font=font_value_typed
                    )

                    bboxes.append(
                        f"5 "
                        f"{(x + box_size/2)/img_w} "
                        f"{(y_off + 4 + box_size/2)/img_h} "
                        f"{box_size/img_w} "
                        f"{box_size/img_h}"
                    )

                else:

                    bboxes.append(
                        f"4 "
                        f"{(x + box_size/2)/img_w} "
                        f"{(y_off + 4 + box_size/2)/img_h} "
                        f"{box_size/img_w} "
                        f"{box_size/img_h}"
                    )

                draw.text(
                    (x + 30, y_off),
                    option,
                    fill=(0, 0, 0),
                    font=font_label
                )

                add_bbox(
                    bboxes,
                    draw,
                    font_label,
                    option,
                    x + 30,
                    y_off,
                    2,
                    img_w,
                    img_h
                )

                x += 150

            y_off += 55

        # Một số giấy có ghi chú ngắn
        if random.random() < 0.45:

            y_off += 15

            y_off, _ = draw_paragraph(
                draw,
                bboxes,
                random.choice(HYBRID_PARAGRAPHS),
                50,
                y_off,
                max_width_px=random.randint(
                    560,
                    690
                ),
                font=font_inst,
                class_id=1,
                img_w=img_w,
                img_h=img_h
            )

        y_off = draw_signature(
            y_off,
            random.choice([
                "Người làm đơn",
                "Người đăng ký",
                "Người kê khai",
            ])
        )

    # ============================================================
    # 7. APPLICATION / ĐƠN
    # ============================================================

    elif document_type == "application_form":

        # "Kính gửi" là đặc trưng quan trọng của ĐƠN
        y_off = draw_field(
            "Kính gửi:",
            random.choice([
                "Ban Giám hiệu nhà trường",
                "Phòng Công tác sinh viên",
                "Ban Giám đốc",
                "Cơ quan có thẩm quyền",
            ]),
            x=50,
            y=y_off,
            width=680
        )

        y_off += 5

        application_fields = random.choice([
            [
                ("Họ và tên:", fake.name()),
                ("Ngày sinh:", "01/01/2005"),
                ("Lớp:", "23CNTT2"),
                ("Mã sinh viên:", "23CNTT000"),
            ],
            [
                ("Họ và tên:", fake.name()),
                ("Đơn vị:", "Khoa Công nghệ thông tin"),
                ("Chức vụ:", "Sinh viên"),
                ("Số điện thoại:", "09xxxxxxxx"),
            ],
            [
                ("Họ và tên:", fake.name()),
                ("Địa chỉ:", "Đà Nẵng"),
                ("Số điện thoại:", "09xxxxxxxx"),
            ],
        ])

        for label, value in application_fields:

            y_off = draw_field(
                label,
                value if random.random() < 0.8 else None,
                x=50,
                y=y_off,
                width=690
            )

        y_off += 10

        section_title = random.choice([
            "NỘI DUNG ĐỀ NGHỊ",
            "NỘI DUNG TRÌNH BÀY",
            "LÝ DO",
            "NỘI DUNG ĐỀ XUẤT",
        ])

        y_off = draw_section(
            section_title,
            50,
            y_off
        )

        y_off = draw_body_paragraphs(
            APPLICATION_PARAGRAPHS,
            50,
            y_off,
            min_blocks=1,
            max_blocks=3
        )

        # Có thể thêm một section thứ hai
        if random.random() < 0.45:

            y_off += 10

            y_off = draw_section(
                random.choice([
                    "KIẾN NGHỊ",
                    "ĐỀ XUẤT",
                    "NỘI DUNG BỔ SUNG",
                ]),
                50,
                y_off
            )

            y_off = draw_body_paragraphs(
                APPLICATION_PARAGRAPHS,
                50,
                y_off,
                min_blocks=1,
                max_blocks=2
            )

        # Cam kết
        if random.random() < 0.75:

            y_off += 10

            y_off, _ = draw_paragraph(
                draw,
                bboxes,
                random.choice([
                    "Tôi xin cam kết những thông tin đã trình bày là đúng sự thật và chịu trách nhiệm về nội dung của đơn.",
                    "Tôi xin chịu trách nhiệm về các thông tin đã cung cấp và kính mong đơn vị xem xét, giải quyết.",
                ]),
                50,
                y_off,
                max_width_px=680,
                font=font_inst,
                class_id=1,
                img_w=img_w,
                img_h=img_h
            )

        y_off = draw_signature(
            y_off,
            random.choice([
                "Người làm đơn",
                "Người đề nghị",
                "Người trình bày",
            ])
        )

    # ============================================================
    # 8. HYBRID FORM
    # ============================================================

    elif document_type == "hybrid_form":

        # Hybrid KHÔNG phải chỉ thêm một câu cam kết.
        # Nó thực sự gồm metadata + nhiều đoạn narrative.

        hybrid_fields = random.choice([
            [
                ("Họ và tên:", fake.name()),
                ("Ngày sinh:", "01/01/2005"),
                ("Địa chỉ:", "Đà Nẵng"),
                ("Số điện thoại:", "09xxxxxxxx"),
            ],
            [
                ("Người đề nghị:", fake.name()),
                ("Đơn vị:", "Khoa Công nghệ thông tin"),
                ("Ngày lập:", "21/09/2026"),
                ("Số điện thoại:", "09xxxxxxxx"),
            ],
            [
                ("Họ và tên:", fake.name()),
                ("Mã số:", "HS-2026-0001"),
                ("Đơn vị:", "Phòng Hành chính"),
                ("Ngày thực hiện:", "21/09/2026"),
            ],
        ])

        # Một số hybrid dùng "Kính gửi"
        if random.random() < 0.6:

            y_off = draw_field(
                "Kính gửi:",
                random.choice([
                    "Ban Giám hiệu",
                    "Ban Giám đốc",
                    "Phòng Hành chính",
                    "Cơ quan có thẩm quyền",
                ]),
                x=50,
                y=y_off,
                width=680
            )

            y_off += 5

        # Metadata
        for label, value in hybrid_fields:

            y_off = draw_field(
                label,
                value if random.random() < 0.75 else None,
                x=50,
                y=y_off,
                width=680
            )

        y_off += 15

        # Section + paragraph dài
        section_count = random.randint(1, 2)

        for section_idx in range(section_count):

            section_title = random.choice([
                "NỘI DUNG",
                "NỘI DUNG SỰ VIỆC",
                "CHI TIẾT",
                "NỘI DUNG TRÌNH BÀY",
                "THÔNG TIN LIÊN QUAN",
                "LÝ DO VÀ NỘI DUNG",
            ])

            y_off = draw_section(
                section_title,
                50,
                y_off
            )

            y_off = draw_body_paragraphs(
                HYBRID_PARAGRAPHS,
                50,
                y_off,
                min_blocks=2,
                max_blocks=4
            )

            y_off += 5

        # Commitment cuối tài liệu
        if random.random() < 0.8:

            y_off, _ = draw_paragraph(
                draw,
                bboxes,
                random.choice([
                    "Tôi xin cam kết những thông tin trên là đúng sự thật và chịu trách nhiệm về nội dung đã kê khai.",
                    "Tôi xin chịu trách nhiệm về tính chính xác của những thông tin đã cung cấp trong văn bản này.",
                    "Tôi kính đề nghị đơn vị xem xét nội dung trên và phản hồi theo quy định.",
                ]),
                50,
                y_off,
                max_width_px=random.randint(
                    560,
                    690
                ),
                font=font_inst,
                class_id=1,
                img_w=img_w,
                img_h=img_h
            )

        y_off = draw_signature(
            y_off,
            random.choice([
                "Người làm đơn",
                "Người đề nghị",
                "Người trình bày",
            ])
        )

    # ============================================================
    # 9. NARRATIVE DOCUMENT
    # ============================================================

    else:

        # Metadata khác nhau tùy narrative document
        if title == "CÁO PHÓ":

            obituary_fields = [
                ("Họ và tên:", fake.name()),
                ("Năm sinh:", str(random.randint(1940, 1995))),
                ("Quê quán:", random.choice([
                    "Thừa Thiên Huế",
                    "Đà Nẵng",
                    "Quảng Nam",
                    "Quảng Trị",
                ])),
            ]

            for label, value in obituary_fields:

                y_off = draw_field(
                    label,
                    value,
                    x=50,
                    y=y_off,
                    width=680
                )

            y_off += 15

            y_off = draw_section(
                "NỘI DUNG THÔNG BÁO",
                50,
                y_off
            )

            y_off = draw_body_paragraphs(
                OBITUARY_PARAGRAPHS,
                50,
                y_off,
                min_blocks=2,
                max_blocks=4
            )

            y_off = draw_signature(
                y_off,
                "Gia đình"
            )

        elif title == "THÔNG BÁO TÌM TRẺ THẤT LẠC":

            lost_fields = [
                ("Họ và tên:", fake.name()),
                ("Tuổi:", str(random.randint(5, 17))),
                ("Giới tính:", random.choice(["Nam", "Nữ"])),
                ("Đặc điểm:", random.choice([
                    "Tóc ngắn, cao khoảng 1m50",
                    "Tóc dài, mặc áo màu xanh",
                    "Có đặc điểm nhận dạng dễ thấy",
                ])),
                ("Thời gian:", "Khoảng 18 giờ ngày 20/09/2026"),
                ("Địa điểm:", random.choice([
                    "Khu vực trung tâm thành phố",
                    "Gần khu dân cư",
                    "Khu vực trường học",
                ])),
            ]

            for label, value in lost_fields:

                y_off = draw_field(
                    label,
                    value,
                    x=50,
                    y=y_off,
                    width=680
                )

            y_off += 15

            y_off = draw_section(
                random.choice([
                    "NỘI DUNG SỰ VIỆC",
                    "THÔNG TIN CHI TIẾT",
                    "ĐẶC ĐIỂM NHẬN DẠNG",
                ]),
                50,
                y_off
            )

            y_off = draw_body_paragraphs(
                LOST_PERSON_PARAGRAPHS,
                50,
                y_off,
                min_blocks=2,
                max_blocks=4
            )

            # Liên hệ
            y_off = draw_field(
                "Liên hệ:",
                "09xxxxxxxx",
                x=50,
                y=y_off,
                width=680
            )

            y_off = draw_signature(
                y_off,
                "Gia đình"
            )

        else:

            # Narrative tổng quát
            general_fields = random.choice([
                [
                    ("Người liên quan:", fake.name()),
                    ("Thời gian:", "21/09/2026"),
                    ("Địa điểm:", "Đà Nẵng"),
                ],
                [
                    ("Họ và tên:", fake.name()),
                    ("Đơn vị:", "Phòng Hành chính"),
                    ("Thời gian:", "21/09/2026"),
                ],
                [
                    ("Người cung cấp thông tin:", fake.name()),
                    ("Số điện thoại:", "09xxxxxxxx"),
                    ("Địa chỉ:", "Đà Nẵng"),
                ],
            ])

            for label, value in general_fields:

                y_off = draw_field(
                    label,
                    value,
                    x=50,
                    y=y_off,
                    width=680
                )

            y_off += 15

            y_off = draw_section(
                random.choice([
                    "NỘI DUNG SỰ VIỆC",
                    "THÔNG TIN CHI TIẾT",
                    "NỘI DUNG TRÌNH BÀY",
                ]),
                50,
                y_off
            )

            y_off = draw_body_paragraphs(
                HYBRID_PARAGRAPHS,
                50,
                y_off,
                min_blocks=2,
                max_blocks=5
            )

            y_off = draw_signature(
                y_off,
                random.choice([
                    "Người thông báo",
                    "Người cung cấp thông tin",
                    "Đại diện đơn vị",
                ])
            )

    # ============================================================
    # 10. SAVE
    # ============================================================

    return process_image(
        img,
        img_w,
        img_h,
        bboxes,
        split,
        f"doc_v7_{image_id:04d}"
    )

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

    draw.text((490, y_off), "(Ký và ghi rõ họ tên)", fill=(0,0,0), font=font_inst)
    add_bbox(bboxes, draw, font_inst, "(Ký và ghi rõ họ tên)", 490, y_off, 1, img_w, img_h)

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
print(f"🚀 Generating {TOTAL_IMAGES} controlled QA images for dataset_v04...")

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