import os
import re
import time
import tempfile
import psycopg2
from collections import defaultdict
from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from deepface import DeepFace
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# --- CORS: Only allow your Next.js frontend, not the entire internet ---
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)

# --- Rate Limiting: 5 requests per minute per IP ---
RATE_LIMIT = 5
RATE_WINDOW = 60  # seconds
_request_log: dict[str, list[float]] = defaultdict(list)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _is_rate_limited(ip: str) -> bool:
    now = time.time()
    # Prune old entries
    _request_log[ip] = [t for t in _request_log[ip] if now - t < RATE_WINDOW]
    if len(_request_log[ip]) >= RATE_LIMIT:
        return True
    _request_log[ip].append(now)
    return False

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        port=os.getenv("DB_PORT")
    )

@app.post("/search")
async def search_faces(request: Request, album_id: str = Form(...), file: UploadFile = File(...)):
    # --- Rate limit check ---
    client_ip = _get_client_ip(request)
    if _is_rate_limited(client_ip):
        return JSONResponse(
            content={"error": "Too many search requests. Please wait a moment and try again."},
            status_code=429
        )

    # --- Validate album_id format (must look like a UUID) ---
    if not re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', album_id, re.I):
        return JSONResponse(content={"error": "Invalid album."}, status_code=400)

    # --- Validate file type ---
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        return JSONResponse(
            content={"error": "Invalid file type. Please upload a JPEG, PNG, or WebP image."},
            status_code=400
        )

    # --- Validate file size (read up to limit + 1 byte to detect oversized) ---
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        return JSONResponse(
            content={"error": "File too large. Maximum size is 10 MB."},
            status_code=400
        )

    if len(content) == 0:
        return JSONResponse(content={"error": "Empty file."}, status_code=400)

    # Save the guest's uploaded selfie temporarily
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
    temp_file.write(content)
    temp_file.close()

    try:
        # Extract the 128-D facial embedding from the selfie
        try:
            faces = DeepFace.represent(
                img_path=temp_file.name,
                model_name="GhostFaceNet",
                detector_backend="retinaface",
                enforce_detection=True
            )
        except ValueError:
            return JSONResponse(content={"error": "No face detected in selfie. Please try again."}, status_code=400)

        # Grab the mathematical embedding of the first face found in the selfie
        embedding = faces[0]["embedding"]
        
        # Format it exactly how pgvector expects it: "[0.1, 0.2, ...]"
        embedding_str = f"[{','.join(map(str, embedding))}]"

        # Perform the pgvector Cosine Distance Search in PostgreSQL
        conn = get_db_connection()
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
        conn.close()

        # Extract just the UUIDs from the database rows
        photo_ids = [str(r[0]) for r in results]
        
        print(f"Guest search complete! Found {len(photo_ids)} matching photos.")
        return {"matched_photo_ids": photo_ids}

    except Exception as e:
        print(f"API Error: {e}")
        return JSONResponse(content={"error": "Something went wrong during the search."}, status_code=500)
    finally:
        # delete the guests selfie
        if os.path.exists(temp_file.name):
            os.remove(temp_file.name)

if __name__ == "__main__":
    import uvicorn
    # Start the AI Search Engine on port 5000
    uvicorn.run(app, host="0.0.0.0", port=5000)