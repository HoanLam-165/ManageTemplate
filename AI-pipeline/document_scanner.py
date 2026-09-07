import cv2
import numpy as np
import os

# Cấu hình kích thước đích (Chuẩn A4)
TARGET_WIDTH, TARGET_HEIGHT = 840, 1188

def order_points(pts):
    # Sắp xếp 4 đỉnh theo thứ tự: Trái-Trên, Phải-Trên, Phải-Dưới, Trái-Dưới
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect

def dewarp_image(image_path, save_path):
    img = cv2.imread(image_path)
    if img is None:
        print(f"Lỗi: Không đọc được ảnh {image_path}")
        return

    # Tiền xử lý: Gray, Blur, Canny Edge
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blur, 75, 200)

    # Tìm các đường viền (contours)
    contours, _ = cv2.findContours(edged, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]

    document_contour = None
    for c in contours:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) == 4: # Tìm thấy đa giác 4 đỉnh lớn nhất (Tờ giấy)
            document_contour = approx
            break

    if document_contour is not None:
        # Lấy 4 góc của tờ giấy
        pts = document_contour.reshape(4, 2)
        rect = order_points(pts)

        # Định nghĩa 4 góc của khung A4 phẳng
        dst = np.array([
            [0, 0],
            [TARGET_WIDTH - 1, 0],
            [TARGET_WIDTH - 1, TARGET_HEIGHT - 1],
            [0, TARGET_HEIGHT - 1]
        ], dtype="float32")

        # Ma trận biến đổi phối cảnh và nắn phẳng
        M = cv2.getPerspectiveTransform(rect, dst)
        warped = cv2.warpPerspective(img, M, (TARGET_WIDTH, TARGET_HEIGHT))

        # Lưu ảnh phẳng
        cv2.imwrite(save_path, warped)
        print(f"Đã nắn phẳng và lưu: {save_path}")
    else:
        print(f"Thất bại: Không tìm thấy viền giấy A4 rõ ràng trong {image_path}")

# HƯỚNG DẪN SỬ DỤNG:
# Tạo thư mục 'raw_photos' chứa ảnh bạn chụp điện thoại
# Tạo thư mục 'flat_photos' để nhận ảnh xuất ra (dùng thư mục này cho LabelImg)
os.makedirs("raw_photos", exist_ok=True)
os.makedirs("flat_photos", exist_ok=True)

for file in os.listdir("raw_photos"):
    if file.endswith((".jpg", ".png", ".jpeg")):
        in_path = os.path.join("raw_photos", file)
        out_path = os.path.join("flat_photos", f"flat_{file}")
        dewarp_image(in_path, out_path)