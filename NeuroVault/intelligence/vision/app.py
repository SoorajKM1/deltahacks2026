import os
import io
import json
import base64
from typing import Dict, Any, Tuple

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from PIL import Image
import imagehash
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="NeuroVault Vision (pHash)")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))  # NeuroVault/
DATA_DIR = os.path.join(REPO_ROOT, "data")
IMAGES_DIR = os.path.join(DATA_DIR, "images")
LABELS_PATH = os.path.join(DATA_DIR, "labels.json")
PHASH_DB_PATH = os.path.join(SCRIPT_DIR, "phash_db.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class IdentifyRequest(BaseModel):
    image_base64: str  # data URL or raw base64


def _strip_data_url(b64: str) -> str:
    if "," in b64 and b64.strip().lower().startswith("data:"):
        return b64.split(",", 1)[1]
    return b64


def _load_labels() -> Dict[str, Any]:
    if not os.path.exists(LABELS_PATH):
        raise FileNotFoundError(f"labels.json not found at {LABELS_PATH}")
    with open(LABELS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _compute_phash_from_pil(img: Image.Image) -> imagehash.ImageHash:
    img = img.convert("RGB")
    return imagehash.phash(img)


def _image_from_base64(b64: str) -> Image.Image:
    try:
        raw = base64.b64decode(_strip_data_url(b64))
        return Image.open(io.BytesIO(raw))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image_base64: {e}")


def _build_db() -> Dict[str, Any]:
    """
    labels.json format (demo):
      {
        "grandson_tim.png": "mem_family_tim.txt",
        "key_bowl.png": "mem_routine_keys.txt"
      }

    DB format:
      {"items":[{"filename":"grandson_tim.png","memory_id":"mem_family_tim.txt","phash":"..."}]}
    """
    labels = _load_labels()

    if not os.path.isdir(IMAGES_DIR):
        raise FileNotFoundError(f"Images folder not found: {IMAGES_DIR}")

    items = []
    for filename, value in labels.items():
        # value can be a string memory id or an object
        if isinstance(value, str):
            memory_id = value
        elif isinstance(value, dict):
            memory_id = value.get("memory_id") or value.get("memoryId") or ""
        else:
            memory_id = ""

        if not memory_id:
            print(f"⚠️ labels.json entry missing memory id for: {filename}")
            continue

        path = os.path.join(IMAGES_DIR, filename)
        if not os.path.exists(path):
            print(f"⚠️ Missing image file: {path}")
            continue

        img = Image.open(path)
        ph = _compute_phash_from_pil(img)

        items.append({
            "filename": filename,
            "memory_id": memory_id,
            "phash": str(ph)
        })

    db = {"items": items}
    with open(PHASH_DB_PATH, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2)

    return db


def _load_or_build_db() -> Dict[str, Any]:
    if os.path.exists(PHASH_DB_PATH):
        with open(PHASH_DB_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return _build_db()


def _hamming_distance(ph1: str, ph2: str) -> int:
    return int(imagehash.hex_to_hash(ph1) - imagehash.hex_to_hash(ph2))


def _best_match(capture_hash: str, db: Dict[str, Any]) -> Tuple[Dict[str, Any], int]:
    best = None
    best_dist = 10**9

    for item in db.get("items", []):
        dist = _hamming_distance(capture_hash, item["phash"])
        if dist < best_dist:
            best_dist = dist
            best = item

    if best is None:
        raise HTTPException(status_code=500, detail="No reference images in DB. Check data/images and labels.json.")
    return best, best_dist


def _confidence_from_distance(dist: int) -> float:
    conf = max(0.0, 1.0 - (dist / 20.0))
    return round(min(1.0, conf), 3)


@app.get("/health")
def health():
    return {
        "ok": True,
        "images_dir": IMAGES_DIR,
        "labels_path": LABELS_PATH,
        "db_path": PHASH_DB_PATH
    }


@app.post("/rebuild")
def rebuild():
    db = _build_db()
    return {"ok": True, "count": len(db["items"]), "db_path": PHASH_DB_PATH}


@app.post("/identify")
def identify(req: IdentifyRequest):
    db = _load_or_build_db()

    img = _image_from_base64(req.image_base64)
    capture_phash = str(_compute_phash_from_pil(img))

    best, dist = _best_match(capture_phash, db)
    confidence = _confidence_from_distance(dist)

    UNKNOWN_THRESHOLD = 13
    if dist >= UNKNOWN_THRESHOLD:
        return {
            "memory_id": "unknown",
            "confidence": confidence,
            "distance": dist,
            "match_filename": best.get("filename")
        }

    return {
        "memory_id": best.get("memory_id"),
        "confidence": confidence,
        "distance": dist,
        "match_filename": best.get("filename")
    }
