from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import cv2
import numpy as np
import base64
import gc

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load YOLO model (low memory mode)
model = YOLO("best.pt")
model.to("cpu")  # force CPU mode to reduce RAM

def resize_image_cv2(img, max_size=320):
    h, w = img.shape[:2]
    scale = max_size / max(h, w)
    new_w = int(w * scale)
    new_h = int(h * scale)
    return cv2.resize(img, (new_w, new_h))

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # Read file
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # Resize to reduce RAM usage
    img = resize_image_cv2(img, 320)

    # Run YOLO
    results = model(img)[0]

    # Annotate
    annotated = results.plot()

    # Encode to JPEG
    _, buffer = cv2.imencode(".jpg", annotated)
    encoded = base64.b64encode(buffer).decode("utf-8")

    # Free memory
    del img, annotated, buffer, results, nparr
    gc.collect()

    return {"image": encoded}
