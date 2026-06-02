from fastapi import FastAPI, UploadFile
from fastapi.responses import JSONResponse
from ultralytics import YOLO
import base64
import cv2
import numpy as np

app = FastAPI()
model = YOLO("best.pt")  # this file will live in the same folder

@app.post("/predict")
async def predict(file: UploadFile):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    results = model(img)[0]
    annotated = results.plot()

    _, buffer = cv2.imencode(".jpg", annotated)
    encoded = base64.b64encode(buffer).decode("utf-8")

    return JSONResponse({"image": encoded})
