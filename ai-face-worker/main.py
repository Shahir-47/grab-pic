from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from deepface import DeepFace

app = FastAPI()

class ImageRequest(BaseModel):
    image_url: str

@app.post("/generate-embedding")
def generate_embedding(request: ImageRequest):
    
    try:
        embedding_objs = DeepFace.represent(
            img_path=request.image_url, 
            model_name="Facenet",
            detector_backend="retinaface"
        )
        
        results = []
        for face in embedding_objs:
            results.append({
                "embedding": face["embedding"],
                "box": face["facial_area"]
            })
        
        return {
            "message": "Success",
            "faces_found": len(results),
            "data": results
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))