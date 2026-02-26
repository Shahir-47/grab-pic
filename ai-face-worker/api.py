import os
import re
import signal
import tempfile
import requests
from PIL import Image
from psycopg2 import pool
from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from deepface import DeepFace
from dotenv import load_dotenv

MAX_IMAGE_PIXELS = 25_000_000
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS

DEEPFACE_TIMEOUT_SECS = 180

class DeepFaceTimeout(Exception):
    pass

def _timeout_handler(signum, frame):
    raise DeepFaceTimeout("DeepFace processing timed out")

load_dotenv()
TURNSTILE_SECRET = os.getenv("TURNSTILE_SECRET", "").strip()
TURNSTILE_ALLOWED_HOSTNAMES = {
    host.strip().lower()
    for host in os.getenv("TURNSTILE_ALLOWED_HOSTNAMES", "").split(",")
    if host.strip()
}

def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return get_remote_address(request)

limiter = Limiter(key_func=_get_client_ip)
app = FastAPI()
app.state.limiter = limiter

@app.exception_handler(RateLimitExceeded)
async def _rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        content={"error": "Too many search requests. Please wait a moment and try again."},
        status_code=429,
    )

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["POST"],
    allow_headers=["Content-Type", "X-Turnstile-Token"],
)

MAX_FILE_SIZE = 5 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}

IMAGE_SIGNATURES = {
    b'\xff\xd8\xff': "image/jpeg",
    b'\x89PNG\r\n\x1a\n': "image/png",
    b'RIFF': "image/webp",
}

db_pool = pool.SimpleConnectionPool(
    minconn=1,
    maxconn=3,
    host=os.getenv("DB_HOST"),
    database=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    port=os.getenv("DB_PORT")
)
print("[+] Database connection pool initialized (1-3 connections)")

def _ensure_vector_index():
    try:
        conn = db_pool.getconn()
        cur = conn.cursor()
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_photo_embeddings_hnsw
            ON photo_embeddings
            USING hnsw (embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 64);
        """)
        conn.commit()
        cur.close()
        db_pool.putconn(conn)
        print("[+] HNSW vector index verified/created on photo_embeddings.embedding")
    except Exception as e:
        print(f"[!] Could not create HNSW index (non-fatal): {e}")

_ensure_vector_index()

def _validate_image_bytes(content: bytes) -> bool:
    if len(content) < 12:
        return False
    if content[:3] == b'\xff\xd8\xff':
        return True
    if content[:8] == b'\x89PNG\r\n\x1a\n':
        return True
    if content[:4] == b'RIFF' and content[8:12] == b'WEBP':
        return True
    return False

def _is_human(turnstile_token: str | None, remote_ip: str | None = None) -> bool:
    if not TURNSTILE_SECRET:
        return True
    if not turnstile_token:
        return False
    payload = {"secret": TURNSTILE_SECRET, "response": turnstile_token}
    if remote_ip:
        payload["remoteip"] = remote_ip
    try:
        response = requests.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            data=payload,
            timeout=5,
        )
        data = response.json()
        if not bool(data.get("success")):
            return False
        if TURNSTILE_ALLOWED_HOSTNAMES:
            hostname = str(data.get("hostname", "")).strip().lower()
            return hostname in TURNSTILE_ALLOWED_HOSTNAMES
        return True
    except Exception:
        return False


@app.post("/search")
@limiter.limit("5/minute")
async def search_faces(request: Request, album_id: str = Form(...), file: UploadFile = File(...)):
    if not re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', album_id, re.I):
        return JSONResponse(content={"error": "Invalid album."}, status_code=400)

    turnstile_token = request.headers.get("x-turnstile-token")
    if not _is_human(turnstile_token, _get_client_ip(request)):
        return JSONResponse(content={"error": "Bot check failed."}, status_code=403)

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        return JSONResponse(
            content={"error": "Invalid file type. Please upload a JPEG, PNG, or WebP image."},
            status_code=400
        )

    content = await file.read(MAX_FILE_SIZE + 1)
    if len(content) > MAX_FILE_SIZE:
        return JSONResponse(
            content={"error": "File too large. Maximum selfie size is 5 MB."},
            status_code=400
        )

    if len(content) == 0:
        return JSONResponse(content={"error": "Empty file."}, status_code=400)

    if not _validate_image_bytes(content):
        return JSONResponse(
            content={"error": "File is not a valid image. Please upload a real JPEG, PNG, or WebP photo."},
            status_code=400
        )

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
    temp_file.write(content)
    temp_file.close()

    try:
        try:
            with Image.open(temp_file.name) as img:
                w, h = img.size
                if w * h > MAX_IMAGE_PIXELS:
                    return JSONResponse(
                        content={"error": "Image dimensions are too large. Please upload a smaller photo."},
                        status_code=400
                    )
        except Exception:
            return JSONResponse(
                content={"error": "Could not read image. Please upload a valid JPEG, PNG, or WebP photo."},
                status_code=400
            )

        try:
            signal.signal(signal.SIGALRM, _timeout_handler)
            signal.alarm(DEEPFACE_TIMEOUT_SECS)
            faces = DeepFace.represent(
                img_path=temp_file.name,
                model_name="GhostFaceNet",
                detector_backend="retinaface",
                enforce_detection=True
            )
            signal.alarm(0)
        except DeepFaceTimeout:
            signal.alarm(0)
            return JSONResponse(
                content={"error": "Face analysis timed out. Please try a clearer photo."},
                status_code=408
            )
        except ValueError:
            signal.alarm(0)
            return JSONResponse(content={"error": "No face detected in selfie. Please try again."}, status_code=400)
        finally:
            signal.alarm(0)

        embedding = faces[0]["embedding"]
        
        embedding_str = f"[{','.join(map(str, embedding))}]"

        conn = db_pool.getconn()
        try:
            cur = conn.cursor()

            query = """
                SELECT DISTINCT p.id, pe.embedding <=> %s AS distance
                FROM photo_embeddings pe
                JOIN photos p ON p.id = pe.photo_id
                WHERE p.album_id = %s
                  AND pe.embedding <=> %s <= 0.45
                ORDER BY distance ASC
                LIMIT 50;
            """
            cur.execute(query, (embedding_str, album_id, embedding_str))
            results = cur.fetchall()
            cur.close()
        finally:
            db_pool.putconn(conn)

        photo_ids = [str(r[0]) for r in results]
        
        print(f"Guest search complete! Found {len(photo_ids)} matching photos.")
        return {"matched_photo_ids": photo_ids}

    except Exception as e:
        print(f"API Error: {e}")
        return JSONResponse(content={"error": "Something went wrong during the search."}, status_code=500)
    finally:
        if os.path.exists(temp_file.name):
            os.remove(temp_file.name)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "5000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
