import os
import json
import signal
import boto3
from PIL import Image
from psycopg2 import pool
from deepface import DeepFace
from dotenv import load_dotenv

MAX_IMAGE_PIXELS = 25_000_000
Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS

DEEPFACE_TIMEOUT_SECS = 300

class DeepFaceTimeout(Exception):
    """Raised when DeepFace processing exceeds the allowed time."""

def _timeout_handler(signum, frame):
    raise DeepFaceTimeout("DeepFace processing timed out")

def _validate_image_dimensions(path: str) -> bool:
    """Open the image header to check pixel count without fully decoding.
    Returns True if the image is safe, False if it's a decompression bomb."""
    try:
        with Image.open(path) as img:
            w, h = img.size
            pixels = w * h
            if pixels > MAX_IMAGE_PIXELS:
                print(f"    -> REJECTED: {w}x{h} = {pixels:,} pixels (limit {MAX_IMAGE_PIXELS:,})")
                return False
            return True
    except Exception as e:
        print(f"    -> Image validation failed: {e}")
        return False

load_dotenv()

sqs = boto3.client(
    'sqs',
    region_name=os.getenv("AWS_REGION"),
)

s3 = boto3.client(
    's3',
    region_name=os.getenv("AWS_REGION"),
)

QUEUE_URL = os.getenv("SQS_QUEUE_URL")
BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")

db_pool = pool.SimpleConnectionPool(
    minconn=1,
    maxconn=2,
    host=os.getenv("DB_HOST"),
    database=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    port=os.getenv("DB_PORT")
)
print("[+] Database connection pool initialized (1-2 connections)")

def process_message(message):
    body = json.loads(message['Body'])
    photo_id = body['photoId']
    storage_url = body['storageUrl']
    
    print(f"\n[+] Processing Photo ID: {photo_id}")

    conn = db_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM photos WHERE id = %s", (photo_id,))
        if cur.fetchone() is None:
            print(f"    -> Skipping: Photo {photo_id} no longer exists in database.")
            cur.close()
            return
        cur.close()
    finally:
        db_pool.putconn(conn)
    
    local_path = f"temp_{photo_id}.jpg"
    try:
        s3.download_file(BUCKET_NAME, storage_url, local_path)
        print("    -> Downloaded from S3")

        if not _validate_image_dimensions(local_path):
            print(f"    -> Skipping photo {photo_id}: image exceeds pixel limit")
            conn = db_pool.getconn()
            try:
                cur = conn.cursor()
                cur.execute("UPDATE photos SET processed = True WHERE id = %s", (photo_id,))
                conn.commit()
                cur.close()
            finally:
                db_pool.putconn(conn)
            return

        try:
            signal.signal(signal.SIGALRM, _timeout_handler)
            signal.alarm(DEEPFACE_TIMEOUT_SECS)
            faces = DeepFace.represent(
                img_path=local_path, 
                model_name="GhostFaceNet",
                detector_backend="retinaface",
                enforce_detection=False 
            )
            signal.alarm(0)
        except DeepFaceTimeout:
            print(f"    -> DeepFace TIMED OUT after {DEEPFACE_TIMEOUT_SECS}s — skipping photo")
            faces = []
        except Exception as e:
            print(f"    -> DeepFace Error: {e}")
            faces = []
        finally:
            signal.alarm(0)
            
        valid_faces = [f for f in faces if f.get('facial_area', {}).get('w', 0) > 0]
        print(f"    -> Found {len(valid_faces)} faces")
        
        conn = db_pool.getconn()
        cur = conn.cursor()
        
        try:
            for face in valid_faces:
                embedding_str = f"[{','.join(map(str, face['embedding']))}]"
                box_area_json = json.dumps(face['facial_area'])
                
                cur.execute(
                    "INSERT INTO photo_embeddings (photo_id, embedding, box_area) VALUES (%s, %s, %s)",
                    (photo_id, embedding_str, box_area_json)
                )
                
            cur.execute("UPDATE photos SET processed = True WHERE id = %s", (photo_id,))
            conn.commit()
            print("    -> Saved to Database")
            
        except Exception as e:
            print(f"    -> Database Error: {e}")
            conn.rollback()
            raise e
        finally:
            cur.close()
            db_pool.putconn(conn)
    finally:
        if os.path.exists(local_path):
            os.remove(local_path)

def main():
    print("Starting GrabPic AI Worker... Listening for SQS messages.")
    while True:
        response = sqs.receive_message(
            QueueUrl=QUEUE_URL,
            MaxNumberOfMessages=1,
            WaitTimeSeconds=20 
        )
        
        if 'Messages' in response:
            for msg in response['Messages']:
                try:
                    process_message(msg)
                    
                    sqs.delete_message(
                        QueueUrl=QUEUE_URL,
                        ReceiptHandle=msg['ReceiptHandle']
                    )
                    print("    -> Ticket removed from Queue")
                except Exception as e:
                    print(f"Failed to process message entirely: {e}")

if __name__ == "__main__":
    main()
