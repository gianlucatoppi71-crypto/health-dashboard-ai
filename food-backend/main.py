from fastapi import FastAPI, UploadFile
from ultralytics import YOLO
from PIL import Image
import io

app = FastAPI()
model = YOLO("best.pt")

@app.post("/scan")
async def scan_food(file: UploadFile):
    image_bytes = await file.read()
    img = Image.open(io.BytesIO(image_bytes))
    results = model(img)
    return results[0].to_json()
