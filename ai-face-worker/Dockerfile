FROM python:3.11-slim

# TF_CPP_MIN_LOG_LEVEL silences TensorFlow's startup noise.
# CUDA_VISIBLE_DEVICES=-1 forces CPU: the host GPU has 4GB and Immich already holds it.
ENV PYTHONUNBUFFERED=1 \
    TF_CPP_MIN_LOG_LEVEL=3 \
    CUDA_VISIBLE_DEVICES=-1 \
    DEEPFACE_HOME=/app

# opencv-python needs libGL and glib at runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 \
        libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Pre-download RetinaFace + GhostFaceNet weights into the image. Without this the first
# request downloads ~100MB from GitHub/Google Drive, which is slow and gets rate-limited.
RUN python -c "import numpy as np; from deepface import DeepFace; \
DeepFace.represent(np.zeros((160,160,3), dtype='uint8'), model_name='GhostFaceNet', \
detector_backend='retinaface', enforce_detection=False)"

# Role is chosen by START_CMD: unset runs the queue worker; the search API sets it to
# "uvicorn api:app --host 0.0.0.0 --port 5000". exec keeps PID 1 so signals reach the app.
CMD ["sh", "-c", "exec ${START_CMD:-python main.py}"]
