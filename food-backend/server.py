from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import base64
from ultralytics import YOLO

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model once
model = YOLO("best.pt")

def resize_image(image: Image.Image, max_size=640):
    image.thumbnail((max_size, max_size))
    return image

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # Read file
    contents = await file.read()
    img = Image.open(io.BytesIO(contents)).convert("RGB")

    # AUTO‑RESIZE
    img = resize_image(img, 640)

    # Run YOLO
    results = model(img)

    # Save annotated image to memory
    annotated = results[0].plot()
    img_bytes = io.BytesIO()
    Image.fromarray(annotated).save(img_bytes, format="JPEG")
    img_bytes = img_bytes.getvalue()

    # Encode to base64
    encoded = base64.b64encode(img_bytes).decode("utf-8")

    return {"image": encoded}
