import cv2
import numpy as np
import sys
import os

# Add AI-pipeline to path to import main
sys.path.append(os.path.abspath("AI-pipeline"))
from main import preprocess_image_smart, apply_smart_enhancement, detect_text_paddleocr

def test_pipeline():
    print("Creating dummy 3-channel image...")
    img = np.zeros((1188, 840, 3), dtype=np.uint8)
    cv2.putText(img, "Hello World", (100, 100), cv2.FONT_HERSHEY_SIMPLEX, 2, (255, 255, 255), 3)

    print("Running preprocess_image_smart...")
    warped = preprocess_image_smart(img)

    print("Running apply_smart_enhancement...")
    enhanced = apply_smart_enhancement(warped)
    print(f"Enhanced image shape: {enhanced.shape}")

    print("Running detect_text_paddleocr...")
    try:
        texts = detect_text_paddleocr(enhanced)
        print("Successfully detected texts:", texts)
    except Exception as e:
        print(f"Caught expected error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_pipeline()
