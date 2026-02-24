import os
import json
import boto3
import psycopg2
from deepface import DeepFace
from dotenv import load_dotenv

load_dotenv()

# --- AWS Setup ---
sqs = boto3.client(
    'sqs',
    region_name=os.getenv("AWS_REGION"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("AWS_SECRET_KEY")
)

s3 = boto3.client(
    's3',
    region_name=os.getenv("AWS_REGION"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("AWS_SECRET_KEY")
)

QUEUE_URL = os.getenv("SQS_QUEUE_URL")
BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")

# --- Database Setup ---
def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        port=os.getenv("DB_PORT")
    )

# --- Processing Logic ---
def process_message(message):
    body = json.loads(message['Body'])
    photo_id = body['photoId']
    storage_url = body['storageUrl']
    
    print(f"\n[+] Processing Photo ID: {photo_id}")
    
    # Download image from S3 to a temporary file
    local_path = f"temp_{photo_id}.jpg"
    s3.download_file(BUCKET_NAME, storage_url, local_path)
    print("    -> Downloaded from S3")
    
    #  Run DeepFace
    try:
        faces = DeepFace.represent(
            img_path=local_path, 
            model_name="Facenet", 
            detector_backend="retinaface",
            enforce_detection=False 
        )
    except Exception as e:
        print(f"    -> DeepFace Error: {e}")
        faces = []
        
    # DeepFace returns a list of dictionaries, one for each face found
    valid_faces = [f for f in faces if f.get('facial_area', {}).get('w', 0) > 0]
    print(f"    -> Found {len(valid_faces)} faces")
    
    # Save to PostgreSQL
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        for face in valid_faces:
            # convert the list of 128 numbers into a string so PostgreSQL pgvector accepts it
            embedding_str = str(face['embedding']) 
            box_area_json = json.dumps(face['facial_area'])
            
            cur.execute(
                "INSERT INTO photo_embeddings (photo_id, embedding, box_area) VALUES (%s, %s, %s)",
                (photo_id, embedding_str, box_area_json)
            )
            
        # Update original photo status
        cur.execute("UPDATE photos SET processed = True WHERE id = %s", (photo_id,))
        conn.commit()
        print("    -> Saved to Database")
        
    except Exception as e:
        print(f"    -> Database Error: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()
        
    # Clean up the downloaded file
    if os.path.exists(local_path):
        os.remove(local_path)

# ---  Infinite Worker Loop ---
def main():
    print("Starting GrabPic AI Worker... Listening for SQS messages.")
    while True:
        # Connects to AWS and waits up to 20 seconds for a message
        response = sqs.receive_message(
            QueueUrl=QUEUE_URL,
            MaxNumberOfMessages=1,
            WaitTimeSeconds=20 
        )
        
        if 'Messages' in response:
            for msg in response['Messages']:
                try:
                    process_message(msg)
                    
                    # Only delete the ticket from SQS if processing was 100% successful
                    sqs.delete_message(
                        QueueUrl=QUEUE_URL,
                        ReceiptHandle=msg['ReceiptHandle']
                    )
                    print("    -> Ticket removed from Queue")
                except Exception as e:
                    print(f"Failed to process message entirely: {e}")

if __name__ == "__main__":
    main()