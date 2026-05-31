from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from PIL import Image
import io
import json

app = FastAPI()

# Allow frontend to call backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # you can restrict later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load YOLO model
model = YOLO("best.pt")


@app.post("/scan")
async def scan_food(file: UploadFile = File(...)):
    """
    Receives an image, runs YOLO, returns clean JSON.
    """
    try:
        # Read image bytes
        image_bytes = await file.read()
        img = Image.open(io.BytesIO(image_bytes))

        # Run YOLO
        results = model(img)

        # YOLO returns a JSON string → convert to Python dict
        raw_json = results[0].to_json()
        parsed = json.loads(raw_json)

        # Return clean JSON
        return {"success": True, "detections": parsed}

    except Exception as e:
        return {"success": False, "error": str(e)}
