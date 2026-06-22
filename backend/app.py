from __future__ import annotations

import base64
import io
import math
import os
from pathlib import Path

import numpy as np
import tensorflow as tf
import torch
import torch.nn as nn
import torchvision.models as models
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from PIL import Image
from torchvision import transforms


ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = ROOT / "models"

# CORS configuration - update these with your deployed domains
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173"
).split(",")

IMAGE_SIZE = 224
IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)


class AnalyzeRequest(BaseModel):
    image: str = Field(..., description="A base64 data URI or raw base64 image string")


class AnalyzeResponse(BaseModel):
    garbage: bool
    encroachment: bool
    obstruction: bool
    description: str
    scores: dict[str, float]


app = FastAPI(title="Namma Bengaluru Model API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in ALLOWED_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

to_tensor = transforms.Compose(
    [
        transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ]
)


def strip_data_uri(image_data: str) -> str:
    return image_data.split(",", 1)[1] if "," in image_data else image_data


def image_from_base64(image_data: str) -> Image.Image:
    try:
        raw = base64.b64decode(strip_data_uri(image_data))
        return Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image payload: {exc}") from exc


def make_mobilenet() -> nn.Module:
    return models.mobilenet_v3_small(weights=None, num_classes=1)


def load_torch_model(path: Path) -> nn.Module:
    model = make_mobilenet()
    state_dict = torch.load(path, map_location="cpu", weights_only=True)
    model.load_state_dict(state_dict)
    model.eval()
    return model


def load_tflite_model(path: Path) -> tf.lite.Interpreter:
    interpreter = tf.lite.Interpreter(model_path=str(path))
    interpreter.allocate_tensors()
    return interpreter


GARBAGE_MODEL = load_torch_model(MODELS_DIR / "garbage_epoch_15.pth")
POTHOLE_MODEL = load_torch_model(MODELS_DIR / "pothole_epoch_15.pth")
OBSTRUCTION_MODEL = load_tflite_model(MODELS_DIR / "obstruction_classifierV2.tflite")


def torch_probability(model: nn.Module, image: Image.Image) -> float:
    tensor = to_tensor(image).unsqueeze(0)
    with torch.no_grad():
                output = model(tensor).squeeze()
    value = float(output.item())
    if 0.0 <= value <= 1.0:
        return value
    return float(torch.sigmoid(output).item())


def tflite_probability(interpreter: tf.lite.Interpreter, image: Image.Image) -> float:
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    resized = image.resize((IMAGE_SIZE, IMAGE_SIZE))
    array = np.asarray(resized, dtype=np.float32) / 255.0
    array = np.expand_dims(array, axis=0)
    interpreter.set_tensor(input_details[0]["index"], array)
    interpreter.invoke()
    output = interpreter.get_tensor(output_details[0]["index"]).squeeze()
    value = float(np.asarray(output).item())
    if 0.0 <= value <= 1.0:
        return value
    return float(1.0 / (1.0 + math.exp(-value)))


def label_description(label: str, present: bool) -> str:
    if present:
        return f"{label} detected by the local classifier."
    return f"No {label.lower()} detected by the local classifier."


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze-footpath", response_model=AnalyzeResponse)
def analyze_footpath(payload: AnalyzeRequest) -> AnalyzeResponse:
    image = image_from_base64(payload.image)

    garbage_score = torch_probability(GARBAGE_MODEL, image)
    pothole_score = torch_probability(POTHOLE_MODEL, image)
    obstruction_score = tflite_probability(OBSTRUCTION_MODEL, image)

    garbage = garbage_score >= 0.5
    encroachment = pothole_score >= 0.5
    obstruction = obstruction_score >= 0.5

    issue_count = sum([garbage, encroachment, obstruction])
    details = [
        label_description("Garbage", garbage),
        label_description("Encroachment", encroachment),
        label_description("Obstruction", obstruction),
    ]
    if issue_count == 0:
        description = "Footpath appears clear and accessible."
    elif issue_count == 1:
        description = "One issue detected by the local classifiers."
    else:
        description = "Multiple issues detected by the local classifiers."

    description = f"{description} {' '.join(details)}"

    scores = {
        "garbage": garbage_score,
        "encroachment": pothole_score,
        "obstruction": obstruction_score,
    }

    return AnalyzeResponse(
        garbage=garbage,
        encroachment=encroachment,
        obstruction=obstruction,
        description=description,
        scores=scores,
    )