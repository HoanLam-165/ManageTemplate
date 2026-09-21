from ultralytics import YOLO
import multiprocessing
import torch
import psutil
import threading
import time
import os

def monitor_cpu_and_kill():
    """Luồng chạy ngầm: Theo dõi CPU và tự sát nếu quá tải"""
    print("[Giám sát] Đã bật cảm biến CPU ngầm...")
    # Bỏ qua 10 giây đầu tiên vì lúc khởi động load model CPU thường nhảy vọt
    time.sleep(10) 
    
    while True:
        cpu_usage = psutil.cpu_percent(interval=2)
        if cpu_usage > 95:
            print(f"\n🚨 CẢNH BÁO ĐỎ: CPU đạt {cpu_usage}% (Vượt mốc 95%)!")
            print("🚨 Kích hoạt cơ chế dừng khẩn cấp để bảo vệ phần cứng...")
            os._exit(1) # Kill chương trình ngay lập tức
        time.sleep(2)

def main():
    multiprocessing.freeze_support()
    
    # --- CƠ CHẾ 1: VAN GIỚI HẠN (THROTTLE) ---
    # Ép PyTorch chỉ được dùng tối đa 50% số nhân CPU hiện có
    total_cores = multiprocessing.cpu_count()
    allowed_threads = max(1, total_cores // 2)
    torch.set_num_threads(allowed_threads)
    print(f"[Hệ thống] Máy có {total_cores} nhân CPU. Đã khóa giới hạn chỉ cho AI dùng {allowed_threads} nhân.")

    # --- CƠ CHẾ 2: CÔNG TẮC NHIỆT (KILL SWITCH) ---
    # Khởi động luồng giám sát CPU chạy song song
    monitor_thread = threading.Thread(target=monitor_cpu_and_kill, daemon=True)
    monitor_thread.start()

    print("Khởi tạo mô hình YOLOv8n (Nano)...")
    model = YOLO("yolov8n.pt")

    print("Bắt đầu quá trình huấn luyện...")
    model.train(
        data="data.yaml",
        epochs=30,
        imgsz=640,
        batch=4,          # Giảm batch size xuống 4 để ăn ít RAM hơn
        device="cpu",     # Ép chạy CPU để test cơ chế an toàn
        workers=0,        # Tắt đa luồng đọc data để giảm tải CPU
        project="runs",
        name="document_model"
    )
    print("Hoàn tất! Model xịn nhất của bạn nằm ở: runs/document_model/weights/best.pt")

if __name__ == '__main__':
    main()
