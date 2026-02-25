import os
import tempfile
import psycopg2
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from deepface import DeepFace
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Allow Next.js to talk to this Python API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        port=os.getenv("DB_PORT")
    )

@app.post("/search")
async def search_faces(album_id: str = Form(...), file: UploadFile = File(...)):
    # Save the guest's uploaded selfie temporarily
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
    content = await file.read()
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