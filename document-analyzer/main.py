import os
# KHÓA CHẶT PADDLE ENGINE NGAY TỪ DÒNG ĐẦU TIÊN CỦA APP
os.environ["FLAGS_enable_pir_api"] = "0"
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["PD_ENABLE_MKLDNN"] = "0"

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import io

# Import processor sau khi đã set biến môi trường
from processor import analyze_document

app = FastAPI(title="Template Workspace CV API")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # ĐÃ SỬA THÀNH FALSE ĐỂ FIX LỖI CORS
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if image is None:
        return {"status": "error", "message": "Invalid image file"}
    
    elements = analyze_document(image)
    
    return {
        "status": "success",
        "data": {
            "elements": elements
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
