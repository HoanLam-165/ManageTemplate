from ultralytics import YOLO
import glob
import os

def main():
    model_path = "yolo_document_model.pt"
    
    # 1. Kiểm tra xem file model có tồn tại không
    if not os.path.exists(model_path):
        print(f"❌ Không tìm thấy file {model_path}! Bạn nhớ kiểm tra lại tên file nhé.")
        return

    print("🧠 Đang tải bộ não AI (yolo_document_model.pt)...")
    model = YOLO(model_path)

    # 2. Tìm một bức ảnh bất kỳ trong tập validation để test
    val_images = glob.glob("dataset/images/val/*.jpg")
    if not val_images:
        print("❌ Không tìm thấy ảnh test trong dataset/images/val/. Hãy tự trỏ đường dẫn tới 1 file ảnh form bất kỳ nhé.")
        return
        
    test_img = val_images[0]  # Lấy ngẫu nhiên bức ảnh đầu tiên
    print(f"🔍 Đang phân tích ảnh: {test_img}")

    # 3. Cho AI quét ảnh (Inference)
    # conf=0.5 nghĩa là chỉ hiển thị những khung hình mà AI tự tin trên 50%
    results = model(test_img, conf=0.5) 

    # 4. Xuất kết quả
    output_img = "test_result.jpg"
    results[0].save(output_img)
    
    print(f"✅ Hoàn tất! Hãy mở file '{output_img}' trong thư mục AI-pipeline lên để xem thành quả.")

if __name__ == '__main__':
    main()
